import axios from 'axios'
import { message } from 'antd'

/**
 * Axios 实例
 * - baseURL 指向 /api/v1（Vite dev server 自动代理到后端 8000 端口）
 * - 超时 15 秒
 */
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 响应拦截器 — 统一处理错误
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回 data，兼容后端两种格式：
    // - 裸数据格式（如行情接口）
    // - { code, message, data } 包裹格式（如健康检查）
    return response
  },
  (error) => {
    // 网络错误、超时、后端 4xx/5xx
    const detail = error.response?.data?.detail || error.message
    message.error(detail)
    return Promise.reject(error)
  }
)

export default apiClient
