<template>
  <a-select
    v-bind="$attrs"
    v-on="newListeners"
    :value="value"
    :loading="loading"
    :labelInValue="newLabelInValue"
    :getPopupContainer="trigger => trigger.parentNode"
    :filter-option="filterOption"
  >
    <a-select-option v-for="(item, i) in options" :key="i" :value="item[fieldKey.value]" :dataOption="item" :disabled="item.disabled">
      {{ item[fieldKey.label] }}
    </a-select-option>
  </a-select>
</template>

<script>
import { loadDataMixin } from '../utils/mixins'
import { isArray, isFunction, isObject } from '../utils/index'

export default {
  name: 'ak-select',
  model: {
    prop: 'value',
    event: 'change'
  },
  mixins: [loadDataMixin],
  props: {
    value: {
      type: [Number, String, Object, Array],
      default: undefined
    },
    labelInValue: {
      type: Boolean,
      default: false
    },
    /**
     * 自定义 option 里面的取值
     */
    fieldKey: {
      type: Object,
      default: () => ({
        value: 'value', label: 'label'
      })
    },
    filterOption: {
      type: [Function, Boolean],
      default: (input, option) => {
        return (option && option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) !== -1)
      }
    }
  },
  data () {
    return {
      // 是否显示动画
      loading: false,
      options: []
    }
  },
  watch: {
    loadData (newValue) {
      if (!newValue) {
        this.loading = false
        return
      }
      // 如果直接传递数组，监听变化并更新 options
      if (isArray(newValue)) {
        if (newValue) {
          this.options = newValue
        }
        this.loading = false
      }
      if (isFunction(newValue)) {
        if (newValue) {
          this.options = newValue()
        }
        this.loading = false
      }
    }
  },
  computed: {
    newListeners () {
      return {
        ...this.$listeners,
        // 这里处理一下，change 走自定义的 change，否则会出现 change 事件调用两次的情况
        change: this.onChange
      }
    },
    newLabelInValue () {
      if (this.labelInValue) {
        return true
      }
      // 自动判断 value 的数据类型，如果是对象，直接将 labelInValue 字段设置成 true
      return isObject(this.value)
    }
  },
  methods: {
    onChange (value, option) {
      this.$emit('change', value, option)
    }
  }
}
</script>

<style lang="less" scoped>
</style>
