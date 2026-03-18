/**
 * 平台抽象层：本地存储
 * Web 实现：封装 localStorage
 * Phase 3 UniApp 替换为 uni.getStorageSync / uni.setStorageSync 实现（同接口）
 */
export const storage = {
  get: (key) => localStorage.getItem(key),
  set: (key, val) => localStorage.setItem(key, val),
  remove: (key) => localStorage.removeItem(key),
}
