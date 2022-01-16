<template>
  <a-date-picker
    inputReadOnly
    v-bind="$attrs"
    v-on="$listeners"
    ref="yearPicker"
    mode="year"
    format="YYYY"
    value-format="YYYY"
    :dropdownClassName="dropdownClassNames"
    :value.sync="value"
    :open.sync="showDropdown"
    @focus.stop="onFocus"
    @panelChange="onPanelChange"
  >
    <slot v-if="$slots.dateRender" name="dateRender"></slot>
    <slot v-if="$slots.renderExtraFooter" name="renderExtraFooter"></slot>
  </a-date-picker>
</template>

<script>
export default {
  name: 'ak-year-picker',
  model: {
    prop: 'value',
    event: 'change'
  },
  props: {
    value: {
      type: [Object, String],
      default: null
    },
    dropdownClassName: {
      type: String,
      default: ''
    },
    open: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    // 合并年份数据
    dropdownClassNames () {
      return `${this.className} ${this.dropdownClassName}`
    }
  },
  watch: {
    open (value) {
      this.showDropdown = value
    }
  },
  data () {
    return {
      showDropdown: this.open,
      className: `dropdown-${new Date().getTime()}-${Math.floor(Math.random() * 100000000)}`
    }
  },
  created () {
    if (this.$root.$el) this.$root.$el.addEventListener('click', this.onCloseDropdown)
  },
  beforeDestroy () {
    if (this.$root.$el) this.$root.$el.removeEventListener('click', this.onCloseDropdown)
  },
  methods: {
    onFocus (event) {
      this.showDropdown = true
      this.$emit('focus', event)
    },
    onPanelChange (value, mode) {
      const time = value.format('YYYY')
      this.showDropdown = false
      this.$emit('change', time)
      this.$emit('panelChange', time, mode)
    },
    // 点击空白区域关闭下拉
    onCloseDropdown (e) {
      const box = document.querySelector(`.${this.className}`)
      // 如果当前点击的既不是 input 表单，也不是下拉里面的元素就隐藏下拉
      if (box && !box.contains(e.target) && !this.$refs.yearPicker.$el.contains(e.target)) {
        this.showDropdown = false
      }
    }
  }
}
</script>
