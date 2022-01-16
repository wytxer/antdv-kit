import AkTextFill from './text-fill'
import AkSelect from './select'
import AkTable from './table'
import AkAutoTooltip from './auto-tooltip'
import AkUpload from './upload'
import AkViewer, { viewerBox } from './viewer'
import AkDateYear from './year-picker'
import AkDraggable from 'vue-draggable-resizable'

const components = [
  AkTextFill,
  AkSelect,
  AkTable,
  AkAutoTooltip,
  AkUpload,
  AkViewer,
  AkDateYear
]

const install = Vue => {
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
  AkDateYear
}

export default {
  version: '1.0.0',
  install
}
