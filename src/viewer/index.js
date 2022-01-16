import Viewer from './viewer.vue'

const instances = []
let id = 1
let box

const viewerBox = Vue => {
  if (Vue.prototype.$isServer) return
  if (!box) {
    box = document.createElement('div')
    document.body.appendChild(box)
  }
  const ViewerConstructor = Vue.extend(Viewer)
  Vue.prototype.$viewer = props => {
    props = props || {}
    props.showFileList = props.showFileList || false
    const instance = new ViewerConstructor()
    instance.id = `viewer-${id++}`
    // 设置外部定义的属性
    Object.entries(props).forEach(([key, value]) => {
      instance[key] = value
    })
    instance.close = () => {
      const len = instances.length
      for (let l = 0; l < len; l++) {
        if (instances[l].id === instance.id) {
          instance.hideModal()
          instances.splice(l, 1)
          setTimeout(() => {
            box.removeChild(instance.$el)
          }, 0)
        }
      }
    }
    instance.$mount()
    box.appendChild(instance.$el)
    instances.push(instance)
    return instance
  }
}

Viewer.install = Vue => {
  Vue.component(Viewer.name, Viewer)
  viewerBox(Vue)
}

export { viewerBox }

export default Viewer
