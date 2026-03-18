/**
 * platform/storage.js - UniApp 版本
 * 用 uni.getStorageSync / uni.setStorageSync 替代 localStorage。
 */

export const storage = {
  get: (key) => {
    try {
      return uni.getStorageSync(key) || null
    } catch {
      return null
    }
  },
  set: (key, val) => {
    try {
      uni.setStorageSync(key, val)
    } catch {}
  },
  remove: (key) => {
    try {
      uni.removeStorageSync(key)
    } catch {}
  },
}
