/**
 * 平台抽象层：设备/网络状态
 * Web 实现：封装 navigator
 * Phase 3 UniApp 替换为 uni.onNetworkStatusChange 实现（同接口）
 */
export function isOnline() {
  return navigator.onLine
}

export function onNetworkChange(callback) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
}
