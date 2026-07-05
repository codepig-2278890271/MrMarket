import axios from 'axios'
import type { ApiResponse } from '../types/common'

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
    const data = response.data as ApiResponse
    // 业务错误码（非0即为异常）
    if (data.code !== 0) {
      console.error(`[API Error] ${data.message}`)
      return Promise.reject(new Error(data.message))
    }
    return response
  },
  (error) => {
    // 网络错误、超时等
    console.error(`[API Network Error] ${error.message}`)
    return Promise.reject(error)
  }
)

export default apiClient
