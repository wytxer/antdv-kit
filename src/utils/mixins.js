/**
 * 公共的 mixins 定义
 */

import { isArray, isFunction } from './index'

const loadDataMixin = {
  props: {
    /**
      * 加载数据的方法，支持普通函数、Promise 函数、数组
      */
    loadData: {
      type: [Function, Array],
      default: null,
      require: true,
      validator: value => {
        return !!value && (isArray(value) || isFunction(value))
      }
    },
    params: {
      type: Object,
      default: null
    },
    data: {
      type: Object,
      default: null
    }
  },
  created () {
    this.queryData()
  },
  methods: {
    queryData () {
      this.loading = true
      // 如果是一个数组
      if (isArray(this.loadData)) {
        this.options = [...this.loadData]
        this.loading = false
        return
      }
      const values = {}
      if (this.params) {
        values.params = this.params
      }
      if (this.data) {
        values.data = this.data
      }
      const result = this.loadData(values)
      if (!result) {
        this.loading = false
        return
      }
      // 如果拿到的数据已经是数组
      if (isArray(result)) {
        this.options = result
        this.loading = false
        return
      }
      // 如果是 Promise 函数
      if (result && isFunction(result.then)) {
        result.then((res = []) => {
          this.options = res.data || res || []
          this.loading = false
        })
          .catch(error => {
            console.error(error)
            this.loading = false
          })
      }
    }
  }
}

export { loadDataMixin }
