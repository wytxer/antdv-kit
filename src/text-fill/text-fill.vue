<template>
  <span>{{ text || hr || '--' }}</span>
</template>

<script>
export default {
  name: 'ak-text-fill',
  props: {
    /**
     * 文本内容
     */
    text: {
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
  }
}
</script>
