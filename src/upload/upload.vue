<template>
  <div :class="['ak-upload-box-wrap', {'ak-upload-block-wrap': block, 'ak-upload-hide-btn': hideUploadBtn}]">
    <!-- 内置拖拽上传的样式 -->
    <a-upload-dragger v-if="drag" v-bind="newAttrs" v-on="newListeners">
      <p class="ant-upload-drag-icon">
        <a-icon type="inbox" />
      </p>
      <p class="ant-upload-text">
        点击或拖拽到这里上传
      </p>
      <slot name="suffix"></slot>
      <p v-if="$slots.tips" class="ant-upload-hint">
        <slot name="tips"></slot>
      </p>
    </a-upload-dragger>

    <!-- 普通的文件上传 -->
    <a-upload v-else v-bind="newAttrs" v-on="newListeners">
      <slot>
        <a-button v-if="showDirectoryUpload"><a-icon type="upload" />文件夹上传</a-button>
        <a-button v-else-if="showFileUpload"><a-icon type="upload" />点击上传</a-button>
        <div v-else-if="showImageUpload" :class="`ak-upload-${listType}`">
          <a-icon type="plus" class="icon-plus" />
          <div class="ant-upload-text">
            上传
          </div>
        </div>
      </slot>
      <slot name="suffix"></slot>
      <div v-if="$slots.tips && !drag" class="ant-upload-hint PT6">
        <slot name="tips"></slot>
      </div>
    </a-upload>

    <!-- 文件夹上传 -->
    <div v-if="directory && showDirectory && value.length" class="directory-list-main">
      <div class="progress-item" v-for="(item) in value" :key="item.dirname" status="success">
        <span class="name-box">
          <span class="name">{{ item.dirname }}({{ item.current }}/{{ item.total }})</span>
          <a-icon v-if="!newAttrs.disabled" type="close" class="icon-close" @click="onRemoveDirectory(item, value)"></a-icon>
        </span>
        <a-progress :percent="parseInt((item.current / item.total) * 100) || 0"></a-progress>
      </div>
    </div>
    <ak-viewer v-model="fileList" :show-file-list="false" ref="viewer"></ak-viewer>
  </div>
</template>

<script>
import AkViewer from '../viewer'
import { createId } from '../utils/index'

export default {
  name: 'ak-upload',
  data () {
    return {
      // 本次选择的文件列表，每次上传完成后进行删除，删除完了之后代表全部上传成功，然后再调用 @uploaded 回调
      currentFileList: [],
      // 本次选择的文件列表，缓存一下，change 需要用来过滤
      currentFileListUids: [],
      // 本次上传失败的文件列表，暂存一下，回调出去之后清空
      currentFailFileList: [],
      // 上传前选择的文件列表
      beforeUploadFileLength: 0,
      // 上传前的文件列表，只有当前选中的文件，用于并发上传控制
      beforeUploadList: [],
      // 记录失败的文件列表
      beforeUploadFailList: []
    }
  },
  components: {
    AkViewer
  },
  inheritAttrs: false,
  props: {
    /**
     * 受控
     */
    value: {
      type: Array,
      default: () => []
    },
    /**
     * 受控
     */
    input: {
      type: Function,
      default: () => {}
    },
    /**
     * 上传个数，如果设置了 multiple 为 false，limit 将始终是 1，如果是多选，默认是 -1，代表不限制个数
     */
    limit: {
      type: Number,
      default: -1
    },
    /**
     * 上传地址，如果传递了就使用，否则去取 $api.upload
     */
    action: {
      type: String,
      default: ''
    },
    /**
     * 文件预览地址，如果传递了就使用，否则去取 $api.download
     */
    downloadUrl: {
      type: String,
      default: ''
    },
    /**
     * 文件的上传类型，根据不同的 listType 切换成不同的上传样式
     */
    listType: {
      type: String,
      default: 'text',
      validator: (value) => ['text', 'picture', 'picture-card'].indexOf(value) > -1
    },
    /**
     * 同 a-upload 的 beforeUpload
     */
    beforeUpload: {
      type: Function,
      default: (file, fileList) => true
    },
    /**
     * 删除文件的回调，同 a-upload 的 remove
     */
    remove: {
      type: Function,
      default: (file) => true
    },
    /**
     * 设置默认值的文件列表时，传递的 name 和 url，接口一般返回的是 fileName 和 filePath，默认先取 name 和 url，没有的话再去取 fileName 和 filePath
     */
    keys: {
      type: Object,
      default: () => ({
        name: 'fileName',
        url: 'filePath'
      })
    },
    /**
     * 把上传组件作为一个块级元素
     */
    block: {
      type: Boolean,
      default: false
    },
    /**
     * 是否自动隐藏上传按钮
     */
    autoHideUploadBtn: {
      type: Boolean,
      default: false
    },
    /**
     * 在 onChange 里面对返回值进行处理，应对返回值不是默认格式的情况，替代 onChange
     */
    fileChange: {
      type: Function,
      default: (info) => info
    },
    /**
     * 对应 a-upload 的 directory
     */
    directory: {
      type: Boolean,
      default: false
    },
    /**
     * 对应 a-upload 的 multiple
     */
    multiple: {
      type: Boolean,
      default: false
    },
    /**
     * 是否开启拖拽上传
     */
    drag: {
      type: Boolean,
      default: false
    },
    /**
     * 是否自动滚动文件列表，多选上传了很多文件时使用
     */
    autoScrollFileList: {
      type: Boolean,
      default: false
    },
    // 文件夹上传时，不显示具体的文件列表，显示成文件夹的形式，同时 showUploadList 自动变成 false
    showDirectory: {
      type: Boolean,
      default: false
    },
    // 同 a-upload 的 customRequest
    customRequest: {
      type: Function,
      default: null
    },
    // 同时上传的并发数量
    concurrentNumber: {
      type: Number,
      default: 10
    }
  },
  computed: {
    // 属性合并
    newAttrs () {
      let className = 'ak-upload-wrap'
      if (this.autoScrollFileList) {
        className += ' ak-auto-scroll-upload-wrap'
      }
      const props = {
        ...this.$attrs,
        class: className,
        action: this.actionUrl,
        fileList: this.fileList,
        listType: this.listType,
        multiple: this.multiple,
        directory: this.directory,
        customRequest: this.customRequest,
        remove: this.onRemove,
        beforeUpload: this.onBeforeUpload
      }
      // 如果当前是文件夹上传且要显示成文件夹的形式并且也没有自定义上传
      if (this.showDirectories && !this.customRequest) {
        props.customRequest = this.onAddUploadList
      }
      // 如果是要显示成文件夹进度
      if (this.showDirectories) {
        props.showUploadList = false
      }
      return props
    },
    // 事件合并
    newListeners () {
      return {
        ...this.$listeners,
        change: this.onUploadChange,
        preview: this.onPreview
      }
    },
    // 是否显示文件夹列表
    showDirectories () {
      return this.directory && this.showDirectory
    },
    // 文件夹上传
    showDirectoryUpload () {
      return this.directory
    },
    // 文件上传
    showFileUpload () {
      return this.listType === 'text' || this.listType === 'picture'
    },
    // 图片上传
    showImageUpload () {
      return this.listType === 'picture-card'
    },
    // 是否隐藏上传操作，文件夹上传不支持
    hideUploadBtn () {
      if (this.autoHideUploadBtn) {
        // 如果是单选
        return (!this.showDirectory && !this.multiple && this.fileList.length === 1) ||
        // 否则如果是多选且有个数限制
        (!this.showDirectory && this.multiple && this.limit !== -1 && this.fileList.length === this.limit)
      }
      return false
    },
    actionUrl () {
      return this.action || (this.$api && this.$api.upload) || '#'
    },
    // value 字段兼容
    fileList () {
      if (!this.value || this.value.filter(Boolean).length <= 0) {
        return []
      }
      if (this.showDirectories) {
        let files = []
        this.value.forEach(item => {
          files = files.concat(this.transformFields(item.files || []))
        })
        return files
      }
      return this.transformFields(this.value)
    }
  },
  created () {
    // 如果是文件夹上传，并且设置了默认值，初始化的时候给默认值添加 uid 等字段，方便组件内部展示和操作
    if (this.showDirectories && this.value && this.value.length) {
      this.$emit('input', this.value.map(dir => {
        return {
          ...dir,
          files: this.transformFields(dir.files || [])
        }
      }))
    }
  },
  methods: {
    // 返回用于提交表单的文件列表
    getFormData () {
      if (!this.value) {
        return []
      }
      // 如果是文件夹上传处理成约定格式
      if (this.showDirectories) {
        return this.fileToFormData(this.value)
      }
      return this.value.map(item => (item.response && item.response.code === 0) ? {
        fileName: item.name || item[this.keys.name],
        filePath: this.getFileUrl(item)
      } : item)
    },
    // 将文件对象转换成接口数据
    fileToFormData (files) {
      return files.map(item => {
        if (item.files && item.files.length) {
          return {
            ...item,
            files: item.files.map(file => {
              return {
                fileName: file.name || file[this.keys.name],
                filePath: this.getFileUrl(file)
              }
            })
          }
        }
        return { ...item }
      })
    },
    // 字段转换
    transformFields (items) {
      return items.map(item => {
        return {
          ...item,
          uid: item.uid || createId(),
          name: item.name || item[this.keys.name],
          url: this.getFileUrl(item),
          status: item.status || 'done'
        }
      })
    },
    // 将文件列表转换成文件夹的形式
    fileListToDirectory (fileList) {
      const files = [...this.value]
      fileList.forEach(file => {
        const relativePath = file.relativePath || (file.originFileObj && file.originFileObj.webkitRelativePath)
        const dirname = `${relativePath.split('/').shift()}/`
        // 如果当前没有找到文件夹就新增一个
        const currentDir = files.find(dir => dir.dirname === dirname)
        if (!currentDir) {
          files.push({
            // 生成随机字符串
            uid: `${dirname}-${createId()}`,
            dirname,
            current: 0,
            total: 1,
            files: [file]
          })
        } else if (!currentDir.files.find(f => f.uid === file.uid)) { // 否则增加总计
          currentDir.total += 1
          currentDir.files.push(file)
        }
        if (currentDir && file.uploaded) {
          currentDir.current += 1
        }
      })
      return files
    },
    // 上传文件
    // ! 在 beforeUpload 里面即使 return false 也会触发 change，https://github.com/ant-design/ant-design/issues/15561
    onUploadChange (info) {
      // 处理上传返回值
      this.fileChange(info)
      let fileList = [...info.fileList]
      if (!this.multiple) {
        fileList = info.fileList.slice(-1)
      }
      // 上一次上传的文件列表
      const oldFileList = fileList.filter(item => !this.currentFileListUids.includes(item.uid))
      // 本次上传的文件列表
      const newFileList = fileList.filter(item => this.currentFileListUids.includes(item.uid))

      fileList = newFileList
        // 取出 name 和 url
        .map((file, i) => {
          const isSuccess = file.response && (+file.response.code === 0 || +file.response.code === 200)
          const isErrorCode = file.response && (+file.response.code !== 0 || +file.response.code !== 200)
          if (file.status === 'done' && isSuccess && file.response.data) {
            const data = file.response.data
            const d = Array.isArray(data) ? data.slice(-1).shift() : data
            const name = d.name || d[this.keys.name]
            if (name) {
              file.name = name
              file.url = this.getFileUrl(d)
              file.originalUrl = d[this.keys.url] || ''
            }
            // 设置文件已经上传完毕的标识
            file.uploaded = true
            // 删除当前已经上传的文件
            this.currentFileList = this.currentFileList.filter(item => item.uid !== file.uid)

          // 如果上传失败了，抛出提示，并清掉当前文件（不展示在列表里面），页面上可能会看到文件闪一下
          // status 字段如果 beforeUpload 里面返回 false 的话就是 undefined，这种情况也处理成上传失败
          } else if ((file.status === undefined || file.status === 'error' || isErrorCode)) {
            // 只有第一次才抛出错误提示并添加到错误列表
            if (!this.currentFailFileList.find(item => item.uid === file.uid)) {
              this.currentFailFileList.push(file)
              // 如果文件不是属于超出限制的再给出上传出错的提示
              if (!file.beyond) {
                //  如果后端提供了错误就拼接一下抛出来
                this.$message.error(`${file.response && file.response.message ? `${file.response.message}，` : ''}文件 ${file.name} 上传失败`)
              }
            }
            // 删除当前已经上传的文件
            this.currentFileList = this.currentFileList.filter(item => item.uid !== file.uid)
            // 只要满足了上面的条件就说明当前文件上传失败了，直接处理掉，同时如果 change 被重复触发的话，第二次的重复调用也不会再更新一次数据
            // return null
          }
          // status 是上传中的
          return file
        })
        .filter(f => f)

      // 更新显示的文件列表
      if (this.showDirectories) { // 如果是展示成文件夹的形式
        this.$emit('input', this.fileListToDirectory(oldFileList.concat(fileList)))
      } else {
        this.$emit('input', oldFileList.concat(fileList))
      }

      this.$emit('change', info)

      // 判断是否已经上传完毕
      if (this.beforeUploadFileLength === fileList.filter(item => item.status === 'done').length) {
        // 最后一次回调出去
        this.$emit('uploaded', fileList, this.currentFailFileList)
        // 清空上传失败的列表
        this.currentFailFileList = []
        this.currentFileListUids = []
        // 在这里重置 beforeUpload 里面的标识
        this.beforeUploadFileLength = 0
      }
    },
    // 获取文件地址
    getFileUrl (data) {
      // 如果原本就存在访问地址
      if (data.url) {
        return data.url
      }
      const url = data[this.keys.url] || ''
      // 如果是 http 或者 https 开头
      if (url.match(/^http(s)?:\/\//)) {
        return url
      }
      // 如果是 blob 开头
      if (url.match(/^blob:/)) {
        return url
      }
      // 否则再拼接完整的地址
      return (this.downloadUrl || (this.$api ? this.$api.download : '')) + url
    },
    // 预览
    onPreview (file) {
      const index = this.fileList.findIndex(item => item.uid === file.uid)
      this.$refs.viewer.showModal(file, index === -1 ? 0 : index)
    },
    // 删除
    async onRemove (file) {
      const res = await this.remove(file)
      if (!res) {
        return false
      }
      const fileList = this.fileList.concat().filter(item => item.uid !== file.uid)
      this.$emit('input', fileList)
      return false
    },
    // 上传前检测，即使外部返回了 false 这里还是能拿到当前选择的所有文件
    onBeforeUpload (file, fileList) {
      // 更新当前上传的文件，通过 uid 标识，onBeforeUpload 和 change 里面拿到的 uid 是一致的
      fileList.forEach(item => {
        if (!this.currentFileList.find(file => file.uid === item.uid)) {
          this.currentFileList.push(item)
          // 记录缓存数据
          this.currentFileListUids.push(item.uid)
        }
      })

      this.beforeUploadFileLength += 1
      // 不是单选且总文件数超过了设置的总文件数
      if (this.multiple && this.limit > 0 && this.fileList.length + fileList.length > this.limit) {
        // 如果文件超出了上传个数限制，将状态全部设置为失败
        fileList.forEach(item => {
          item.status = 'error'
          // 添加文件超出限制的标识，change 里面用来判断是否给出提示
          item.beyond = true
        })
        // 因为 onBeforeUpload 这个方法是，选择了多少个文件，就会被重复调用多少次，所以只要进了上面这个判断，就等到最后一次调用再给出提示
        if (this.beforeUploadFileLength === fileList.length) {
          this.beforeUploadFileLength = 0
          this.$message.error(`最多支持上传 ${this.limit} 个文件`)
        }
        return false
      }
      return this.beforeUpload(file, fileList)
    },
    // 文件夹删除回调
    onRemoveDirectory (file, fileList) {
      this.$emit('input', fileList.filter(item => item.uid !== file.uid))
    },
    // 上传前收集文件列表
    onAddUploadList (file) {
      this.beforeUploadList.push(file)
      clearTimeout(this.timer)
      this.timer = null
      // 文件夹上传的时候，是所有文件处理就绪之后再来调用的本方法，所以只要调用了这个方法就说明文件列表已经是全部的了，然后再启动并发上传
      this.timer = setTimeout(() => {
        clearTimeout(this.timer)
        this.timer = null
        this.runConcurrentUpload()
          .then(res => {
            console.log('上传结果')
            console.log(res)
            const length = this.beforeUploadFailList.length
            this.$message.success(`文件夹上传成功${length ? `，本次上传 ${length} 个文件上传失败` : ''}`)
            // 清空上一次失败的文件
            this.beforeUploadFailList = []
          })
      }, 300)
    },
    // 启动并发上传
    runConcurrentUpload () {
      const recursion = (arr) => {
        const currentFile = arr.shift()
        return this.onCustomUpload(currentFile)
          .then(() => {
            // 如果还没上传完，继续
            if (arr.length !== 0) {
              return recursion(arr)
            }
            return true
          })
          .catch(() => {
            // 如果失败了进行一次重试
            return this.onCustomUpload(currentFile)
              .then(() => {
                // 如果还没上传完，继续
                if (arr.length !== 0) {
                  return recursion(arr)
                }
                return true
              })
              .catch(res => {
                // 记录失败的文件
                this.beforeUploadFailList.push(currentFile)
                // 再次尝试也失败了就直接抛出错误
                const tips = res.message || res.msg
                this.$message.error(`文件 ${currentFile.file.name} 进行第一次重新上传失败${tips ? `，原因：${tips}` : ''}`)
                currentFile.onError(res)
                // 如果还有文件没上传，再次开启上传
                if (arr.length !== 0) {
                  return recursion(arr)
                }
                return false
              })
          })
      }
      // 并发数
      // 如果文件总数不足最大并发数，取当前文件总数
      let limit = Math.min(this.concurrentNumber, this.beforeUploadList.length)
      // 正在进行的所有并发异步操作
      const asyncList = []
      while (limit--) {
        asyncList.push(recursion(this.beforeUploadList))
      }
      // 所有并发异步操作都完成后，本次并发控制迭代完成
      return Promise.all(asyncList)
    },
    // 如果是文件夹上传
    onCustomUpload (file) {
      const formData = new FormData()
      const relativePath = file.file.webkitRelativePath
      formData.append('file', file.file)
      formData.append('directory', relativePath.split('/').slice(0, -1).join('/'))

      const request = this.$http || this.axios || this.$axios
      if (!request) {
        if (this.$message) {
          this.$message.error('请先配置 $http 或 axios 或 $axios')
          return
        } else {
          throw new Error('请先配置 $http 或 axios 或 $axios')
        }
      }
      return request.post(this.actionUrl, formData, { withCredentials: true })
        .then(res => res.data)
        .then(res => {
          // 成功之后直接调用成功的回调
          if (res.code === 0) {
            file.onSuccess(res)
            return res
          } else { // code 不是 0 的处理成失败
            return Promise.reject(res)
          }
        })
    }
  }
}
</script>

<style lang="less" scoped>
.ak-upload-box-wrap {
  display: inline-block;
  &.ak-upload-block-wrap {
    width: 100%;
    display: inline-block;
    .ak-upload-wrap {
      width: 100%;
      display: inline-block;
    }
    /deep/ .ant-upload.ant-upload-select {
      width: 100%;
      display: inline-block;
    }
  }
  &.ak-upload-hide-btn {
    /deep/ .ant-upload.ant-upload-select {
      display: none;
    }
  }
  .ak-upload-wrap {
    .ak-upload-picture-card {
      .icon-plus {
        font-size: 28px;
        color: #999;
      }
      .ant-upload-text {
        margin-top: 8px;
        color: #666;
      }
    }
  }
  .ant-upload-hint {
    font-size: 12px !important;
    color: rgba(0, 0, 0, 0.45);
  }
  /deep/ .ant-upload-picture-card-wrapper {
    display: flex;
  }
  /deep/ .ant-upload.ant-upload-drag {
    min-width: 300px;
  }
  .ak-auto-scroll-upload-wrap /deep/ .ant-upload-list.ant-upload-list-text {
    height: 100%;
    max-height: 300px;
    overflow: auto;
  }
  .directory-list-main {
    position: relative;
    padding-top: 10px;
    .progress-item {
      padding: 4px;
      border-radius: 2px;
      &:hover {
        background-color: #F5F7FA;
        .name {
          color: #409EFF;
        }
        .icon-close {
          opacity: 1;
          visibility: visible;
        }
      }
      /deep/ .el-progress-bar__inner {
        transition: width 0.2s ease;
      }
    }
    .name-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.25s;
      .name {
        font-size: 12px;
      }
      .icon-close {
        font-size: 14px;
        cursor: pointer;
        transition: all 0.25s;
        opacity: 0;
        visibility: hidden;
      }
    }
  }
}
</style>
