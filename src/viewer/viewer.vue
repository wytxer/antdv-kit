<template>
  <div class="ak-viewer-wrap">
    <!-- 文件列表 -->
    <div :class="`preview-${listType}-list`" v-if="showFileList">
      <template v-if="listType === 'link'">
        <a v-for="(item, index) in records" :key="item.uid" href="javascript:;" class="list-link-item" @click="onPreview(item, index)">
          <ak-auto-tooltip :text="item.name"></ak-auto-tooltip>
        </a>
      </template>
      <template v-else-if="listType === 'custom'">
        <div class="custom-item-box" v-for="(item, index) in records" :key="item.uid" @click.stop="onPreview(item, index)">
          <slot :record="item" :index="index"></slot>
        </div>
      </template>
      <template v-else>
        <div v-for="(item, index) in records" :key="item.uid" :class="['list-item', `list-${listType}-item`]" :style="cardStyle" @click="onPreview(item, index)">
          <img v-if="item.fileType === 'image'" class="item-image" :src="item.url" />
          <a-icon v-else-if="item.fileType === 'video'" class="item-file" type="video-camera" />
          <a-icon v-else-if="item.fileType === 'audio'" class="item-file" type="audio" />
          <a-icon v-else-if="item.fileType === 'pdf'" class="item-file" type="file-pdf" />
          <a-icon v-else-if="item.fileType === 'file'" class="item-file" type="file" />
          <ak-auto-tooltip v-if="listType === 'card'" class="ML10" :text="item.name"></ak-auto-tooltip>
        </div>
      </template>
      <slot name="actions"></slot>
    </div>

    <!-- 显示文件 -->
    <transition name="scale" @after-leave="() => onAfterClosed()">
      <div v-if="visible" ref="viewerModal" :class="['ak-viewer-modal-wrap', {'ak-viewer-modal-drag': drag}]" :style="viewerWrapStyle" @mousewheel="onScrollScale">
        <div class="viewer-drag-bar" v-if="drag" @mousedown.stop.prevent="onBarMouseDown" />
        <a-icon type="close" class="icon-fixed icon-close" @click="onHideModal" />
        <div class="preview-content">
          <img v-if="record.fileType === 'image'" class="item-image" :key="record.url" :style="imgStyle" :src="record.url" @load="onImgLoad" @mousedown.stop.prevent="onImgMouseDown" />
          <video v-if="record.fileType === 'video'" class="item-video" controls :src="record.url" />
          <audio v-if="record.fileType === 'audio'" class="item-audio" controls :src="record.url" />
          <template v-if="record.fileType === 'pdf'">
            <ak-pdf-canvas v-if="usePdf" :url="record.url" v-bind="typeof usePdf === 'boolean' ? null : usePdf" />
            <iframe v-else class="item-iframe" :src="record.url" />
          </template>
          <!-- 支持扩展除内置之外的文件类型 -->
          <slot v-if="record.fileType === 'file'" name="preview" :record="record" :index="activeRecordIndex">
            <div class="item-file">
              <div class="tips">
                <a-icon type="info-circle" />
                当前文件不支持预览，请点击下载到本地查看。
              </div>
              <a target="_blank" :href="record.url">{{ record.name }}</a>
            </div>
          </slot>

          <!-- 文件操作 -->
          <div class="preview-image-action">
            <!-- 如果文件是图片 -->
            <a-icon type="undo" @click="onRotateLeftChange" :disabled="record.fileType !== 'image'" />
            <a-icon type="redo" @click="onRotateRightChange" :disabled="record.fileType !== 'image'" />
            <a-icon type="zoom-in" @click="onScaleAddChange" :disabled="record.fileType !== 'image'" />
            <a-icon type="zoom-out" @click="onScaleLessChange" :disabled="record.fileType !== 'image'" />
            <a-icon v-if="showDownload" type="download" @click="onFileDownload" />

            <a-icon type="left" @click="onFileRightSwitch" :disabled="activeRecordIndex <= 0" />
            <a-icon type="right" @click="onFileLeftSwitch" :disabled="activeRecordIndex >= records.length - 1" />
            <a-icon type="link" @click="onNewTabOpen" />
          </div>
        </div>

        <!-- 内置的文件切换列表，可快速切换查看文件 -->
        <div class="preview-list-navbar">
          <span class="file-name">{{ record.name }}</span>
          <div class="preview-nav-list">
            <div class="preview-nav-main" :style="toolbarStyle">
              <div :class="['list-item', {'list-item-active': item.uid === record.uid}]" v-for="(item, index) in records" :key="item.uid" @click="onFileChange(item, index)">
                <img v-if="item.fileType === 'image'" class="item-image" :src="item.url" />
                <a-icon v-if="item.fileType === 'video'" class="item-file" type="video-camera" />
                <a-icon v-if="item.fileType === 'audio'" class="item-file" type="audio" />
                <a-icon v-if="item.fileType === 'pdf'" class="item-file" type="file-pdf" />
                <a-icon v-if="item.fileType === 'file'" class="item-file" type="file" />
              </div>
            </div>
          </div>
          <a-icon type="left" class="icon-switch icon-left" v-if="totalPage > 0" @click="onToolbarScrollRight" :disabled="currentPage <= 0" />
          <a-icon type="right" class="icon-switch icon-right" v-if="totalPage > 0" @click="onToolbarScrollLeft" :disabled="currentPage >= totalPage" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import AkAutoTooltip from '../auto-tooltip'
import { isString, isObject, isArray, createId } from '../utils/index'

// 内置的文件类型
const fileTypes = ['image', 'video', 'audio', 'pdf', 'file']

export default {
  name: 'ak-viewer',
  data () {
    const width = this.drag ? 800 : window.innerWidth
    const height = this.drag ? 600 : window.innerHeight

    return {
      visible: false,
      loading: false,
      top: 0,
      left: 0,
      scale: 0,
      rotate: 0,
      records: [],
      record: {},
      // 当前预览工具栏可显示的宽度
      mainWidth: 0,
      // 当前文件列表占用的总宽度
      totalWidth: 0,
      // 总页数
      totalPage: 0,
      // 当前页数
      currentPage: 0,

      // 文件左右切换的页数维护
      activeRecordIndex: 0,
      // 预览容器的位置
      viewerConfig: {
        left: (window.innerWidth - width) / 2,
        top: (window.innerHeight - height) / 2,
        width,
        height
      }
    }
  },
  props: {
    /**
     * 受控
     */
    value: {
      type: [Array, Object, String],
      default: () => ([])
    },
    /**
     * 受控
     */
    input: {
      type: Function,
      default: () => {}
    },
    /**
     * 文件类型，默认通过后缀识别，如果指定了就优先使用
     */
    fileType: {
      type: String,
      validator: (value) => fileTypes.indexOf(value) > -1
    },
    /**
     * 文件的上传类型，根据不同的 listType 切换成不同的上传样式
     */
    listType: {
      type: String,
      default: 'thumbnail',
      validator: (value) => ['thumbnail', 'link', 'card', 'custom'].indexOf(value) > -1
    },
    /**
     * 文件预览地址，如果传递了就使用，否则去取 $api.download
     */
    downloadUrl: {
      type: String,
      default: ''
    },
    /**
     * 是否自动添加文件下载地址，默认不拼接，一般也不需要拼接
     */
    addDownloadPath: {
      type: Boolean,
      default: false
    },
    /**
     * 是否显示文件列表
     */
    showFileList: {
      type: Boolean,
      default: true
    },
    /**
     * 设置默认值的文件列表时，传递的 name 和 url，接口一般返回的是 fileName 和 filePath，默认先取 name 和 url，没有的话再去取 fileName 和 filePath
     */
    fieldKey: {
      type: Object,
      default: () => ({
        name: 'fileName',
        url: 'filePath'
      })
    },
    /**
     * 仅 listType 为 card 生效，文件列表以栅格形式展示
     */
    span: {
      type: [Boolean, Number],
      default: false
    },
    /**
     * 是否使用 pdf 组件来显示 pdf 文件，默认使用 iframe 来加载。在 IE11 里面 pdf 文件会变成下载，可以借助 pdf.js 来展示
     */
    usePdf: {
      type: [Boolean, Object],
      default: false
    },
    // 弹框完全关闭后的回调
    onAfterClosed: {
      type: Function,
      default: () => {}
    },
    /**
     * 是否显示出来全局的下载按钮
     */
    showDownload: {
      type: Boolean,
      default: false
    },
    // 弹框可拖动
    drag: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    value (value) {
      this.transferValue(value)
    },
    // 根据状态修改 body 的滚动状态
    visible (newValue) {
      if (!newValue) {
        document.body.style.overflow = ''
      } else {
        this.$nextTick(() => {
          this.calcToolbarWidth()
        })
        if (!this.drag) {
          document.body.style.overflow = 'hidden'
        }
      }
    }
  },
  computed: {
    imgStyle () {
      return {
        left: `${this.left}px`,
        top: `${this.top}px`,
        transform: `scale(${this.scale}) rotate(${this.rotate}deg)`
      }
    },
    cardStyle () {
      // 只有是 card 类型的列表才生效
      if (this.listType === 'card') {
        if (this.span) {
          return {
            width: `calc(${100 / this.span}% - 10px)`
          }
        }
      }
      return {}
    },
    toolbarStyle () {
      return {
        justifyContent: this.totalWidth < this.mainWidth ? 'center' : 'flex-start',
        transform: `translateX(${-this.currentPage * this.mainWidth}px)`
      }
    },
    viewerWrapStyle () {
      return {
        left: `${this.viewerConfig.left}px`,
        top: `${this.viewerConfig.top}px`
      }
    }
  },
  components: {
    AkAutoTooltip
  },
  created () {
    // 如果绑定了默认值
    this.transferValue(this.value)
  },
  methods: {
    // 显示弹框
    // activeIndex 默认选中第一个，传递具体下标来选中，如果是 true 也是默认选中第一个
    showModal (record, activeIndex = true) {
      if (record) {
        this.transferValue(record, activeIndex)
      }
      this.visible = true
      this.$nextTick(() => {
        this.calcToolbarWidth()
      })
    },
    // 关闭
    onHideModal () {
      this.hideModal()
    },
    // 暴露给外部使用的方法
    hideModal () {
      this.visible = false
      this.initImgPosition()
    },
    // 初始化图片位置信息
    initImgPosition () {
      this.top = 0
      this.left = 0
      this.scale = 0
      this.rotate = 0
    },
    // 将传递进来的预览数据统一处理成数组的形式
    transferValue (value, active = false) {
      // 如果是无效的参数，直接忽略
      if (!value) {
        return
      }

      let records = []
      // 如果传递的是字符串
      if (isString(value)) {
        records.push({
          uid: createId(),
          name: value,
          url: this.getFileUrl(value),
          fileType: this.getFileType([value])
        })

      // 如果传递的是对象
      } else if (isObject(value)) {
        const sourceUrl = value.url || value[this.fieldKey.url] || ''
        const url = this.getFileUrl(sourceUrl)
        if (url) {
          const name = value.name || value[this.fieldKey.name]
          records.push({
            ...value,
            uid: value.uid || createId(),
            name,
            url,
            fileType: this.getFileType([name, sourceUrl])
          })
        }

      // 如果传递的是数组
      } else if (isArray(value)) {
        records = value.map(item => {
          const sourceUrl = item.url || item[this.fieldKey.url] || ''
          const url = this.getFileUrl(sourceUrl)
          if (!url) {
            return null
          }
          const name = item.name || item[this.fieldKey.name]
          return {
            ...item,
            uid: item.uid || createId(),
            name,
            url,
            fileType: this.getFileType([name, sourceUrl])
          }
        }).filter(n => n)

      // 抛出错误
      } else {
        throw new Error('数据格式错误')
      }

      // 如果传递了说明是设置当前要预览的文件
      if (active !== false) {
        // 如果没有绑定 v-model，把当前传递进来的列表当成是全量的预览列表
        if (this.value && !this.value.length) {
          this.activeRecordIndex = active
          this.record = active === true ? records[0] : records[active]
          this.records = records
        } else {
          // 这里是根据是否绑定了 v-model 来决定选中谁的，传递了就从 records 里面读取，否则 active 就看成是在设置当前选中的文件
          this.activeRecordIndex = active
          this.record = this.records[active]
        }
        this.calcCurrentToolbarPage()
      } else {
        this.records = records
      }
    },
    // 获取文件地址
    getFileUrl (url) {
      // 如果是 http 或者 https 开头
      if (url.match(/^http(s)?:\/\//)) {
        return this.addTimestamp(url)
      }
      // 如果是 blob 开头
      if (url.match(/^blob:/)) {
        return url
      }
      // 否则再拼接完整的地址
      if (this.addDownloadPath) {
        return this.addTimestamp((this.downloadUrl || this.$api.download || '') + url)
      }
      return this.addTimestamp(url)
    },
    // 给图片地址添加一个唯一的后缀标识，因为动画需要这个标识，否则如果外部传递进来的访问地址存在两个一样的，动画就会失效
    addTimestamp (url) {
      return url + (url.match(/\?/) ? `&${createId()}` : `?${createId()}`)
    },
    // 设置文件类型，优先使用 name 的后缀来匹配，如果找不到就用 url 的后缀匹配
    getFileType (types = []) {
      // 如果指定了统一的文件类型
      if (this.fileType) {
        return this.fileType
      }
      // 否则根据文件后缀进行匹配
      if (types.find(t => t.match(/\.(png|jpg|jpeg|gif|svg)(\?.*)*?$/i))) {
        return 'image'
      } else if (types.find(t => t.match(/\.(mp4|avi|mov|wmv|flv|webm|ogg)(\?.*)*?$/i))) {
        return 'video'
      } else if (types.find(t => t.match(/\.(mp3|cd|m4a|wma|wav|ape|flac|ogg|aac|vqf)(\?.*)*?$/i))) {
        return 'audio'
      } else if (types.find(t => t.match(/\.pdf(\?.*)*?$/i))) {
        return 'pdf'
      }
      return 'file'
    },
    // 预览
    onPreview (item, index) {
      this.activeRecordIndex = index
      this.record = item
      this.calcCurrentToolbarPage()
      this.visible = true
      this.$emit('fileChange', index, this.record)
    },
    // 文件切换
    onFileChange (item, index) {
      if (item.uid === this.record.uid) {
        return
      }
      this.initImgPosition()
      this.activeRecordIndex = index
      this.record = item
      this.$emit('fileChange', index, this.record)
    },
    // 文件左切换
    onFileLeftSwitch () {
      const index = this.activeRecordIndex + 1
      if (index < this.records.length) {
        this.initImgPosition()
        this.activeRecordIndex = index
        this.record = this.records[index]
        this.calcCurrentToolbarPage()
        this.$emit('fileChange', index, this.record)
      }
    },
    // 文件右切换
    onFileRightSwitch () {
      const index = this.activeRecordIndex - 1
      if (index >= 0) {
        this.initImgPosition()
        this.activeRecordIndex = index
        this.record = this.records[index]
        this.calcCurrentToolbarPage()
        this.$emit('fileChange', index, this.record)
      }
    },
    // 图片加载完毕之后计算 left 的值，然后显示图片
    onImgLoad (e) {
      this.left = (this.viewerConfig.width - e.target.width) / 2
      this.top = (this.viewerConfig.height - e.target.height - 77) / 2
      this.scale = 1
    },
    // 旋转
    onRotateLeftChange () {
      this.rotate -= 90
    },
    onRotateRightChange () {
      this.rotate += 90
    },
    // 缩放
    onScaleAddChange () {
      if (this.scale < 3) {
        this.scale = +(this.scale + 0.1).toFixed(1)
      }
    },
    onScaleLessChange () {
      if (this.scale > 0.1) {
        this.scale = +(this.scale - 0.1).toFixed(1)
      }
    },
    // 滚动缩放图片
    onScrollScale (e) {
      if (e.currentTarget && e.currentTarget === this.$refs.viewerModal) {
        if (e.preventDefault) {
          e.preventDefault()
        } else {
          e.returnValue = true
        }
        e.preventDefault()
        // 火狐浏览器是正好反过来的
        if (e.wheelDelta > 0 || e.detail < 0) {
          this.onScaleAddChange()
        } else {
          this.onScaleLessChange()
        }
      }
    },
    // 图片拖动
    onImgMouseDown (e) {
      const x = e.clientX - e.target.offsetLeft
      const y = e.clientY - e.target.offsetTop
      document.onmousemove = (es) => {
        this.left = es.clientX - x
        this.top = es.clientY - y
      }
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    },
    onBarMouseDown (e) {
      const x = e.clientX - this.viewerConfig.left
      const y = e.clientY - this.viewerConfig.top
      document.onmousemove = (es) => {
        this.viewerConfig.left = es.clientX - x
        this.viewerConfig.top = es.clientY - y
      }
      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    },
    // 计算预览工具栏宽度
    calcToolbarWidth () {
      // 左右的间距
      const mainWidth = this.viewerConfig.width - 66 * 2
      // 48 是一个预览图标占用的总宽度
      const totalWidth = this.records.length * 48
      this.mainWidth = mainWidth
      this.totalWidth = totalWidth
      this.totalPage = Math.floor(totalWidth / mainWidth)
    },
    // 预览工具栏向左移动
    onToolbarScrollLeft () {
      if (this.currentPage + 1 <= this.totalPage) {
        this.currentPage += 1
      }
    },
    // 预览工具栏向右移动
    onToolbarScrollRight () {
      if (this.currentPage - 1 >= 0) {
        this.currentPage -= 1
      }
    },
    // 计算当前选中的图标是否需要翻滚预览工具栏
    calcCurrentToolbarPage () {
      const index = this.records.findIndex(item => item.uid === this.record.uid)
      if (index !== -1) {
        // 原本能展示的个数
        let n = Math.floor(this.mainWidth / 48)
        // 如果当前最后一个文件显示出来的一半都不到，下一次切换的时候直接翻页
        n = Math.floor(n) + 0.5 > n ? n - 1 : n
        let currentPage = Math.ceil((index / n) - 1)
        if (currentPage <= 0) {
          currentPage = 0
        } else if (currentPage >= this.totalPage) {
          currentPage = this.totalPage
        }
        this.currentPage = currentPage
      }
    },
    // 新窗口打开文件
    onNewTabOpen () {
      window.open(this.record.url)
    },
    // 文件下载
    onFileDownload () {
      const request = this.$request || this.$http || this.axios || this.$axios
      if (!request) {
        if (this.$message) {
          this.$message.error('请先配置 $request 或 $http 或 axios 或 $axios')
          return
        } else {
          throw new Error('请先配置 $request 或 $http 或 axios 或 $axios')
        }
      }
      request({
        url: this.record.url,
        method: 'GET',
        headerType: 'download'
      }).then(res => {
        if (this.$message) {
          this.$message.sussess('下载成功')
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
@import "~ant-design-vue/lib/style/themes/default.less";

// 文件预览列表、弹框、文件名的样式
.ak-viewer-modal-wrap {
  width: 100vw;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background-color: rgba(0, 0, 0, 0.5);
  user-select: none;
  z-index: 3999;
  &.ak-viewer-modal-drag {
    width: 800px;
    height: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    .icon-close {
      right: 0;
      top: 0;
      width: 32px;
      height: 32px;
      line-height: 36px;
      background-color: transparent;
      /deep/ svg {
        right: 0;
        top: 0;
      }
    }
    .viewer-drag-bar {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      width: 100%;
      height: 32px;
      z-index: 99;
      background-color: #181818;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: move;
    }
    .preview-content {
      height: calc(600px - 77px);
      padding-top: 32px;
      .item-image {
        max-width: 100%;
      }
    }
  }
  @keyframes shine {
    0% {
      background-position: -1px -1px;
    }
    100% {
      background-position: -12px -12px;
    }
  }
  .icon-fixed {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    cursor: pointer;
    height: 80px;
    overflow: hidden;
    position: absolute;
    right: -40px;
    top: -40px;
    z-index: 666;
    transition: background-color 0.15s;
    width: 80px;
    color: #fff;
    font-size: 18px;
    &::before {
      bottom: 15px;
      left: 15px;
      position: absolute;
    }
    &:hover {
      background-color: rgba(0, 0, 0, 0.8);
    }
    /deep/ svg {
      position: relative;
      top: 46px;
      right: 14px;
    }
  }
  .preview-content {
    position: relative;
    height: calc(100vh - 77px);
    padding-bottom: 36px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    align-content: center;
    .item-image {
      position: absolute;
      left: 0;
      top: 0;
      width: auto;
      max-width: 80vw;
      height: auto;
      max-height: 100%;
      cursor: move;
      transition: transform 0.25s;
    }
    .item-iframe {
      width: 100vw;
      height: 100%;
      border: none;
    }
    .item-video {
      width: 80vw;
      height: 100%;
      border: none;
      outline: none;
    }
    .item-audio {
      width: 60vw;
      height: 64px;
      border: none;
      outline: none;
    }
    .item-file {
      .tips {
        color: #d9d9d9;
      }
      a {
        font-size: 32px;
        color: #fff;
        &:hover {
          color: @primary-color;
        }
      }
    }
  }
  .preview-image-action {
    height: 24px;
    line-height: 24px;
    text-align: center;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 5px;
    pointer-events: auto;
    /deep/ .anticon {
      color: #fff;
      width: 24px;
      height: 24px;
      line-height: 27px;
      text-align: center;
      border-radius: 50%;
      transition: color 0.25s;
      background-color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      margin: 0 2px;
    }
    /deep/ i[disabled="disabled"] {
      color: #999;
      cursor: not-allowed;
    }
  }
  .preview-list-navbar {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    padding: 5px 66px;
    height: 77px;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
    .preview-nav-list {
      overflow: hidden;
      position: relative;
      .preview-nav-main {
        transition: transform 0.35s;
        display: flex;
      }
    }
    .icon-switch {
      position: absolute;
      bottom: 5px;
      z-index: 1;
      width: 40px;
      height: 40px;
      text-align: center;
      border-radius: 50%;
      color: #fff;
      font-size: 18px;
      padding: 11px;
      background-color: rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .icon-left {
      left: 16px;
    }
    .icon-right {
      right: 16px;
    }
    .icon-switch[disabled="disabled"] {
      color: #999;
      cursor: not-allowed;
    }
    .file-name {
      width: 100%;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      color: #fff;
      text-align: center;
      line-height: initial;
    }
    .list-item {
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      align-content: center;
      border: 1px solid #d9d9d9;
      border-radius: 50%;
      margin: 0 4px;
      transition: border-color, border-radius 0.25s;
      flex-shrink: 0;
      zoom: 1;
      overflow: hidden;
      &.list-item-active {
        border-color: @primary-color;
        border-radius: 4px;
      }
    }
    .item-image {
      width: 38px;
      height: 38px;
      border-radius: 4px;
    }
    .item-file {
      font-size: 24px;
      color: #d9d9d9;
    }
  }
}

// 文件列表的样式
.ak-viewer-wrap {
  .preview-thumbnail-list,
  .preview-card-list {
    display: flex;
    flex-wrap: wrap;
    .list-item {
      flex-shrink: 0;
      width: 88px;
      height: 88px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      align-content: center;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      cursor: pointer;
      &:not(:last-child) {
        margin-right: 10px;
      }
      .item-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .item-file {
        font-size: 64px;
        color: #d9d9d9;
      }
      &.list-card-item {
        height: 66px;
        width: 320px;
        color: @primary-color;
        margin-bottom: 12px;
        .item-image {
          width: 48px;
          height: 48px;
        }
        .item-file {
          font-size: 48px;
        }
      }
    }
  }
  .preview-link-list {
    .list-link-item {
      display: block;
      width: 100%;
      line-height: 24px;
      color: @primary-color;
      transition: background-color 0.25s;
      &:hover {
        background-color: @item-hover-bg;
      }
    }
  }
  .preview-custom-list {
    display: flex;
    flex-wrap: wrap;
    .custom-item-box {
      cursor: pointer;
      width: auto;
      &:not(:last-child) {
        margin-right: 16px;
      }
    }
  }
}
</style>
