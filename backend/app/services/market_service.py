"""
行情查询服务
提供股票列表、详情、K线查询、大盘概览的业务逻辑
"""

from datetime import date

from loguru import logger
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock import KLineDaily, Stock


class MarketService:
    """行情查询业务逻辑"""

    @staticmethod
    async def list_stocks(
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
        market: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Stock], int]:
        """分页查询股票列表，支持按交易所筛选和模糊搜索"""
        conditions = []
        if market:
            conditions.append(Stock.market == market)
        if search:
            conditions.append(
                (Stock.code.ilike(f"%{search}%")) | (Stock.name.ilike(f"%{search}%"))
            )

        count_stmt = select(func.count()).select_from(Stock)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = (await db.execute(count_stmt)).scalar()

        data_stmt = select(Stock).order_by(Stock.code)
        if conditions:
            data_stmt = data_stmt.where(*conditions)
        data_stmt = data_stmt.offset((page - 1) * page_size).limit(page_size)
        rows = (await db.execute(data_stmt)).scalars().all()

        return list(rows), total

    @staticmethod
    async def list_stocks_with_prices(
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
        market: str | None = None,
        search: str | None = None,
        sort_by: str = "code",
        sort_order: str = "asc",
    ) -> tuple[list[dict], int]:
        """
        分页查询股票列表，JOIN 最新K线数据，返回带行情价格的列表。
        支持排序：code, name, change_pct, volume, amount
        """
        # 子查询：每只股票的最新交易日K线
        latest_date_sub = (
            select(
                KLineDaily.stock_code,
                func.max(KLineDaily.trade_date).label("max_date"),
            )
            .group_by(KLineDaily.stock_code)
            .subquery()
        )

        # 主查询：JOIN 最新K线
        kline_latest = (
            select(
                KLineDaily.stock_code,
                KLineDaily.trade_date,
                KLineDaily.close,
                KLineDaily.pre_close,
                KLineDaily.volume,
                KLineDaily.amount,
                KLineDaily.turnover_rate,
                KLineDaily.circulating_market_cap,
            )
            .join(
                latest_date_sub,
                (KLineDaily.stock_code == latest_date_sub.c.stock_code)
                & (KLineDaily.trade_date == latest_date_sub.c.max_date),
            )
            .subquery()
        )

        # 条件
        conditions = []
        if market:
            conditions.append(Stock.market == market)
        if search:
            conditions.append(
                (Stock.code.ilike(f"%{search}%")) | (Stock.name.ilike(f"%{search}%"))
            )

        # 总数
        count_stmt = select(func.count()).select_from(Stock)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = (await db.execute(count_stmt)).scalar()

        # 排序映射
        sort_map = {
            "code": Stock.code,
            "name": Stock.name,
            "change_pct": (
                (kline_latest.c.close - kline_latest.c.pre_close)
                / kline_latest.c.pre_close
                * 100
            ),
            "volume": kline_latest.c.volume,
            "amount": kline_latest.c.amount,
        }
        order_col = sort_map.get(sort_by, Stock.code)
        if sort_order == "desc":
            order_col = order_col.desc() if isinstance(order_col, type) else order_col.desc()
        else:
            order_col = order_col.asc() if isinstance(order_col, type) else order_col.asc()

        # 分页数据
        data_stmt = (
            select(
                Stock.code,
                Stock.name,
                Stock.market,
                Stock.industry,
                Stock.is_st,
                kline_latest.c.trade_date,
                kline_latest.c.close.label("latest_price"),
                kline_latest.c.pre_close,
                kline_latest.c.volume,
                kline_latest.c.amount,
                kline_latest.c.turnover_rate,
                kline_latest.c.circulating_market_cap,
            )
            .outerjoin(kline_latest, Stock.code == kline_latest.c.stock_code)
        )
        if conditions:
            data_stmt = data_stmt.where(*conditions)
        data_stmt = data_stmt.order_by(order_col).offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(data_stmt)
        rows = result.all()

        # 构建响应
        items = []
        for row in rows:
            price = float(row.latest_price) if row.latest_price is not None else None
            pre_close = float(row.pre_close) if row.pre_close is not None else None
            change_pct = None
            change_amt = None
            if price is not None and pre_close is not None and pre_close > 0:
                change_amt = round(price - pre_close, 3)
                change_pct = round(change_amt / pre_close * 100, 2)

            items.append({
                "code": row.code,
                "name": row.name,
                "market": row.market,
                "industry": row.industry,
                "is_st": row.is_st,
                "latest_price": price,
                "change_pct": change_pct,
                "change_amt": change_amt,
                "volume": row.volume,
                "amount": float(row.amount) if row.amount else None,
                "turnover_rate": float(row.turnover_rate) if row.turnover_rate else None,
                "circulating_market_cap": (
                    float(row.circulating_market_cap)
                    if row.circulating_market_cap else None
                ),
                "trade_date": row.trade_date.isoformat() if row.trade_date else None,
            })

        return items, total

    @staticmethod
    async def get_market_overview(db: AsyncSession, market: str | None = None) -> dict:
        """获取大盘概览：涨跌统计、成交额等"""
        # 最新交易日（标量子查询）
        latest_date_sub = (
            select(func.max(KLineDaily.trade_date))
            .scalar_subquery()
        )

        # 当日所有K线数据
        kline_today = (
            select(
                KLineDaily.stock_code,
                KLineDaily.close,
                KLineDaily.pre_close,
                KLineDaily.volume,
                KLineDaily.amount,
            )
            .where(KLineDaily.trade_date == latest_date_sub)
        )

        if market:
            # 过滤市场
            market_codes = select(Stock.code).where(Stock.market == market).subquery()
            kline_today = kline_today.where(KLineDaily.stock_code.in_(market_codes))

        kline_today = kline_today.subquery()

        stmt = select(
            func.count().label("total"),
            func.sum(
                case((kline_today.c.close > kline_today.c.pre_close, 1), else_=0)
            ).label("up_count"),
            func.sum(
                case((kline_today.c.close < kline_today.c.pre_close, 1), else_=0)
            ).label("down_count"),
            func.sum(
                case((kline_today.c.close == kline_today.c.pre_close, 1), else_=0)
            ).label("flat_count"),
            func.avg(
                case(
                    (kline_today.c.pre_close > 0,
                     (kline_today.c.close - kline_today.c.pre_close)
                     / kline_today.c.pre_close * 100),
                    else_=None,
                )
            ).label("avg_change"),
            func.sum(kline_today.c.volume).label("total_volume"),
            func.sum(kline_today.c.amount).label("total_amount"),
        )

        result = (await db.execute(stmt)).one()

        return {
            "total_stocks": result.total or 0,
            "up_count": result.up_count or 0,
            "down_count": result.down_count or 0,
            "flat_count": result.flat_count or 0,
            "avg_change_pct": round(float(result.avg_change or 0), 2),
            "total_volume": result.total_volume or 0,
            "total_amount": float(result.total_amount or 0),
        }

    @staticmethod
    async def get_treemap_data(
        db: AsyncSession,
        *,
        market: str | None = None,
    ) -> dict:
        """
        获取大盘云图数据：所有股票最新行情，按行业分组。
        不分页，用于 treemap 热力图展示。
        """
        # 子查询：每只股票的最新交易日
        latest_date_sub = (
            select(
                KLineDaily.stock_code,
                func.max(KLineDaily.trade_date).label("max_date"),
            )
            .group_by(KLineDaily.stock_code)
            .subquery()
        )

        # 最新K线数据
        kline_latest = (
            select(
                KLineDaily.stock_code,
                KLineDaily.trade_date,
                KLineDaily.close,
                KLineDaily.pre_close,
                KLineDaily.volume,
                KLineDaily.amount,
                KLineDaily.turnover_rate,
                KLineDaily.circulating_market_cap,
            )
            .join(
                latest_date_sub,
                (KLineDaily.stock_code == latest_date_sub.c.stock_code)
                & (KLineDaily.trade_date == latest_date_sub.c.max_date),
            )
            .subquery()
        )

        # 条件
        conditions = []
        if market:
            conditions.append(Stock.market == market)

        # 查询所有股票 + 最新行情
        data_stmt = (
            select(
                Stock.code,
                Stock.name,
                Stock.market,
                Stock.industry,
                Stock.is_st,
                kline_latest.c.trade_date,
                kline_latest.c.close.label("latest_price"),
                kline_latest.c.pre_close,
                kline_latest.c.volume,
                kline_latest.c.amount,
                kline_latest.c.turnover_rate,
                kline_latest.c.circulating_market_cap,
            )
            .outerjoin(kline_latest, Stock.code == kline_latest.c.stock_code)
        )
        if conditions:
            data_stmt = data_stmt.where(*conditions)

        result = await db.execute(data_stmt)
        rows = result.all()

        # 市场名称映射
        MARKET_NAMES = {"SH": "上海", "SZ": "深圳", "BJ": "北京"}

        # 构建股票列表
        items: list[dict] = []
        latest_trade_date = None
        has_industry = False

        for row in rows:
            price = float(row.latest_price) if row.latest_price is not None else None
            pre_close = float(row.pre_close) if row.pre_close is not None else None
            change_pct = None
            change_amt = None
            if price is not None and pre_close is not None and pre_close > 0:
                change_amt = round(price - pre_close, 3)
                change_pct = round(change_amt / pre_close * 100, 2)

            if row.industry:
                has_industry = True

            items.append({
                "code": row.code,
                "name": row.name,
                "market": row.market,
                "industry": row.industry,
                "is_st": row.is_st,
                "latest_price": price,
                "change_pct": change_pct,
                "change_amt": change_amt,
                "volume": row.volume,
                "amount": float(row.amount) if row.amount else None,
                "turnover_rate": (
                    float(row.turnover_rate) if row.turnover_rate else None
                ),
                "circulating_market_cap": (
                    float(row.circulating_market_cap)
                    if row.circulating_market_cap else None
                ),
                "trade_date": row.trade_date.isoformat() if row.trade_date else None,
            })

            # 追踪最新交易日
            if row.trade_date and (
                latest_trade_date is None or row.trade_date > latest_trade_date
            ):
                latest_trade_date = row.trade_date

        # 分组：优先按行业，无行业数据时按交易所
        groups: dict[str, list[dict]] = {}
        if has_industry:
            for item in items:
                industry = item["industry"] or "其他"
                if industry not in groups:
                    groups[industry] = []
                groups[industry].append(item)
        else:
            for item in items:
                market_name = MARKET_NAMES.get(item["market"], item["market"] or "未知")
                if market_name not in groups:
                    groups[market_name] = []
                groups[market_name].append(item)

        # 排序：每组内按成交额降序
        for key in groups:
            groups[key].sort(
                key=lambda x: x["amount"] or 0, reverse=True
            )

        # 按组内总成交额排序各组
        sorted_groups = sorted(
            groups.items(),
            key=lambda kv: sum(s["amount"] or 0 for s in kv[1]),
            reverse=True,
        )

        return {
            "groups": [
                {"industry": ind, "stocks": stocks} for ind, stocks in sorted_groups
            ],
            "trade_date": latest_trade_date.isoformat() if latest_trade_date else None,
        }

    @staticmethod
    async def get_stock(db: AsyncSession, code: str) -> Stock | None:
        """根据股票代码查询单只股票"""
        result = await db.execute(select(Stock).where(Stock.code == code))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_klines(
        db: AsyncSession,
        code: str,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> tuple[list[KLineDaily], int]:
        """
        查询某只股票的日K线数据（优先走 Redis 缓存）。
        """
        cache_key = f"klines:{code}:{start_date or 'all'}:{end_date or 'all'}"

        cached = await _cache_get_json(cache_key)
        if cached is not None:
            logger.debug(f"📦 K线缓存命中: {cache_key}")
            return [], cached.get("total", 0)

        conditions = [KLineDaily.stock_code == code]
        if start_date:
            conditions.append(KLineDaily.trade_date >= start_date)
        if end_date:
            conditions.append(KLineDaily.trade_date <= end_date)

        count_stmt = select(func.count()).select_from(KLineDaily).where(*conditions)
        total = (await db.execute(count_stmt)).scalar()

        data_stmt = (
            select(KLineDaily)
            .where(*conditions)
            .order_by(KLineDaily.trade_date.desc())
        )
        rows = (await db.execute(data_stmt)).scalars().all()

        return list(rows), total


async def _cache_get_json(key: str) -> dict | None:
    """从 Redis 读取缓存（内部辅助函数）"""
    try:
        from app.utils.redis import cache_get
        return await cache_get(key)
    except Exception:
        return None
