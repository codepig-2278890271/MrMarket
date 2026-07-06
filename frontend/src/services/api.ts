import axios from 'axios'
import { message } from 'antd'

/**
 * API 响应统一格式（与后端 APIResponse 对应）
 */
interface ApiResponseBody<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: string
}

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

// 响应拦截器 — 统一解包 { code, message, data } 格式
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponseBody

    // 如果是标准 API 响应格式，自动解包 data 字段
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      if (body.code !== 0) {
        // 业务错误
        message.error(body.message || '请求失败')
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      // 替换 response.data 为解包后的数据
      response.data = body.data
    }

    return response
  },
  (error) => {
    // 网络错误、超时、后端 4xx/5xx
    // 后端统一异常处理器返回 { code, message, data, timestamp }
    const errData = error.response?.data
    if (errData && typeof errData === 'object' && errData.message) {
      message.error(errData.message)
    } else {
      const detail = error.response?.data?.detail || error.message
      message.error(detail)
    }
    return Promise.reject(error)
  }
)

export default apiClient
