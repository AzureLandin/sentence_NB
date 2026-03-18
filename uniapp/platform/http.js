/**
 * platform/http.js - UniApp 版本
 * 用 uni.request 替代 fetch，保持与 backendFetch 相同的接口契约。
 *
 * backendFetch 调用 request(url, options)，期望返回值：
 *   { status: number, json: () => Promise<any> }
 */

export function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.body,           // backendFetch 已传入对象（非字符串）
      header: options.headers || {},
      timeout: 90000,               // 90s 超时（与规格一致）
      success: (res) => {
        resolve({
          status: res.statusCode,
          // 模拟 fetch Response 的 .json() 方法
          json: () => Promise.resolve(res.data),
        })
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}
