<template>
  <a-tooltip v-if="text" :title="tooltipText" v-bind="$attrs" v-on="$listeners">
    <div class="ak-auto-tooltip" v-auto-show-text>
      {{ text }}
    </div>
  </a-tooltip>
  <div v-else><ak-text-fill :text="text" :hr="hr"></ak-text-fill></div>
</template>

<script>
export default {
  name: 'ak-auto-tooltip',
  inheritAttrs: false,
  props: {
    /**
     * 文本内容
     */
    text: {
      type: [String, Number],
      default: ''
    },
    /**
     * 自定义要显示出来的文本
     */
    title: {
      type: [String, Number],
      default: ''
    },
    /**
     * 文本为空时的占位符
     */
    hr: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      // 要显示的 tooltip 文本
      tooltipText: ''
    }
  },
  directives: {
    'auto-show-text': {
      inserted: (el, binding, vnode) => {
        const me = vnode.context
        if (el.scrollWidth > Math.round(el.offsetWidth)) {
          me.tooltipText = me.title || me.text
        } else {
          me.tooltipText = ''
        }
      },
      componentUpdated (el, binding, vnode) {
        const me = vnode.context
        if (el.scrollWidth > Math.round(el.offsetWidth)) {
          me.tooltipText = me.title || me.text
        } else {
          me.tooltipText = ''
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
.ak-auto-tooltip {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
