/**
 * 组件内部使用的工具函数
 */

// 判断一个值是否是数组
export function isArray (value) {
  return Object.prototype.toString.call(value) === '[object Array]'
}

// 判断一个值是否是对象
export function isObject (value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

// 判断一个值是否是函数
export function isFunction (value) {
  return Object.prototype.toString.call(value) === '[object Function]'
}

// 判断一个值是否是字符串
export function isString (value) {
  return Object.prototype.toString.call(value) === '[object String]'
}

// 生成随机字符串
const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
export function createId (len = 16) {
  let str = ''
  for (let a = 0; a < len; a += 1) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return str
}
