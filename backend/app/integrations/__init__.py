"""
外部数据接入层
采用策略模式，每种数据源一个文件，通过基类统一接口
- AkShare（新浪财经）：A股行情
- Tushare（备用）：A股行情 + 财务数据
- DeepSeek / OpenAI：AI 分析
"""

from app.integrations.akshare import AkshareFetcher

__all__ = ["AkshareFetcher"]
