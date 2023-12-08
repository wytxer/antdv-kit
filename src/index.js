import AkTextFill from './text-fill'
import AkSelect from './select'
import AkTable from './table'
import AkAutoTooltip from './auto-tooltip'
import AkUpload from './upload'
import AkViewer, { viewerBox } from './viewer'
import AkYearPicker from './year-picker'
import AkDraggable from 'vue-draggable-resizable'

const components = [
  AkTextFill,
  AkSelect,
  AkTable,
  AkAutoTooltip,
  AkUpload,
  AkViewer,
  AkYearPicker
]

const install = (Vue, options) => {
  const { pageSize = 10, textFill = '--' } = options || {}
  // 添加全局配置
  Vue.prototype.$AKIT = {
    // 默认的分页条数
    pageSize,
    // 默认的空字符串占位符
    textFill
  }
  // 添加空字符占位
  Vue.prototype.$textFill = textFill

  Vue.component('ak-draggable', AkDraggable)
  components.forEach(component => {
    Vue.component(component.name, component)
  })
  viewerBox(Vue)
}

if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export {
  AkTextFill,
  AkSelect,
  AkTable,
  AkAutoTooltip,
  AkUpload,
  AkViewer,
  AkYearPicker
}

export default {
  version: '1.1.5',
  install
}
