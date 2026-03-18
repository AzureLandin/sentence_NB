/**
 * platform/device.js - UniApp 版本
 * 用 uni.onNetworkStatusChange 替代 window addEventListener。
 */

export function isOnline() {
  // 同步检测网络状态（uni API 为异步，此处作乐观假设：小程序能启动通常有网）
  // 真正的离线检测由 onNetworkChange 回调处理
  try {
    const info = uni.getNetworkType ? undefined : undefined // 仅异步 API 可用
    return true // 默认在线，实际状态由 onNetworkChange 维护
  } catch {
    return true
  }
}

export function onNetworkChange(callback) {
  uni.onNetworkStatusChange((res) => {
    callback(res.isConnected)
  })
}
