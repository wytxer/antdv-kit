<script>
import Table from 'ant-design-vue/es/table'
import { isArray, isFunction, isObject } from '../utils/index'
import Vue from 'vue'

const minColWidth = 50
const pageSizeOptions = ['10', '20', '50', '100', '200', '500']

// 拖拽排序用的缓存数据
// 当前拖拽的列
let sourceItem = {}
// 拖到的目标列
let targetItem = {}
// 是否是有效拖动
let isDrop = false

export default {
  name: 'ak-table',
  props: {
    ...Table.props,
    /**
       * 同 a-table 的 scroll，内置 x 的值
       */
    scroll: {
      type: Object,
      default: () => ({ x: '100%' })
    },
    /**
       * table 尺寸，同 a-table 的 size，内置默认值为 small
       */
    size: {
      type: String,
      default: 'small'
    },
    /**
       * 加载数据方法，支持函数、数组、对象
       */
    loadData: {
      type: [Function, Object, Array, Boolean],
      required: true
    },
    /**
       * 是否自动请求数据
       */
    autoLoad: {
      type: Boolean,
      default: true
    },
    /**
       * 是否展示分页
       */
    showPagination: {
      type: [String, Boolean],
      default: 'auto'
    },
    /**
       * 当前页数，会合并到 pagination 中
       */
    currentPage: {
      type: Number,
      default: 1
    },
    /**
       * 当前每页条数，会合并到 pagination 中
       */
    pageSize: {
      type: Number,
      default: undefined
    },
    /**
       * 是否可以改变 pageSize，会合并到 pagination 中
       */
    showSizeChanger: {
      type: Boolean,
      default: true
    },
    /**
       * 表头 th 是否可以拖动改变列宽
       */
    drag: {
      type: Boolean,
      default: false
    },
    /**
       * 是否需要缓存 columns 数据
       */
    columnStorage: {
      type: Boolean,
      default: false
    },
    /**
       * 是否开启行拖拽排序
       */
    dragSort: {
      type: Boolean,
      default: false
    },
    /**
       * 是否显示当前选中行的信息，包含条数、列总计等，结构：{ show: true, clear: Function }
       */
    alert: {
      type: [Object, Boolean],
      default: null
    },
    /**
       * 同 a-table 的 rowSelection
       */
    rowSelection: {
      type: Object,
      default: null
    },
    /**
       * 是否开启刷新时候清空行选择功能
       */
    clearSelectedRowKeys: {
      type: Boolean,
      default: false
    }
  },
  data () {
    // todo：移除对 this.$utils 的依赖
    // 如果拖拽结束后需要读取缓存的 columns
    if (this.drag && this.columnStorage && this.$utils && this.$utils.getStorage && typeof window !== 'undefined') {
      const cacheData = this.$utils.getStorage(this.$route.path)
      if (cacheData.columns) {
        this.columns.forEach((item, i) => {
          const result = cacheData.columns.find(cItem => cItem.dataIndex === item.dataIndex)
          // 缓存中的宽度覆盖初始的 columns 宽度
          if (result && result.width) {
            item.width = result.width
          }
        })
      }
    }
    // 初始化分页配置
    let localPagination = false
    if (this.showPagination) {
      localPagination = {
        ...this.pagination,
        current: this.currentPage,
        pageSize: this.pageSize || (this.$AKIT || {}).pageSize || 10,
        pageSizeOptions,
        showSizeChanger: this.showSizeChanger,
        showTotal: total => `总计 ${total} 条`
      }
    }

    return {
      // 列总计统计，列配置设置 needTotal 时生效
      needTotalList: [],
      // 当前选中的完整行数据
      selectedRows: [],
      // 当前选中的行
      selectedRowKeys: [],
      // 表格加载状态
      localLoading: false,
      // 表格数据
      localDataSource: [],
      // 分页配置
      localPagination
    }
  },
  watch: {
    currentPage (newValue) {
      this.localPagination.current = newValue
    },
    pageSize (newValue) {
      this.localPagination.pageSize = newValue
    },
    showSizeChanger (newValue) {
      this.localPagination.showSizeChanger = newValue
    },
    // columns () {
    //   this.dragTable()
    // },
    loadData: {
      handler (newValue) {
        if (!newValue) {
          return
        }
        if (isObject(newValue) && newValue.rows) {
          this.localDataSource = newValue.rows
        }
        if (isArray(newValue) && !newValue.rows) {
          this.localDataSource = newValue
        }
      },
      deep: true
    }
  },
  computed: {
    // 是否显示选中提示框
    showAlert () {
      return ((isObject(this.alert) && this.alert.show) && this.rowSelection && typeof this.rowSelection.selectedRowKeys !== 'undefined') || this.alert
    },
    // 组装新的 props
    newProps () {
      const attrs = {
        props: {
          ...this.$props,
          size: this.size,
          loading: this.localLoading,
          dataSource: this.localDataSource,
          pagination: this.localPagination,
          // 组装自定义的行属性
          customRow: this.onCustomRow
        },
        scopedSlots: this.$scopedSlots,
        on: {
          ...this.$listeners,
          change: this.tableChange
        }
      }
      // 选择功能配置
      if (this.rowSelection) {
        attrs.props.rowSelection = {
          ...this.rowSelection,
          // todo：支持受控
          selectedRows: this.selectedRows,
          selectedRowKeys: this.selectedRowKeys,
          onChange: (selectedRowKeys, selectedRows) => {
            this.updateSelect(selectedRowKeys, selectedRows)
            isFunction(this.rowSelection.onChange) && this.rowSelection.onChange(selectedRowKeys, selectedRows)
          }
        }
      } else if (!this.rowSelection) {
        attrs.props.rowSelection = null
      }
      // 如果设置列拖动
      if (this.drag) {
        attrs.props.components = { ...this.componentHeader, ...this.components }
      }
      return attrs
    },
    localPageSize () {
      return this.pageSize || (this.$AKIT || {}).pageSize || 10
    }
  },
  created () {
    this.needTotalList = this.initTotalList(this.columns)
    if (this.autoLoad) {
      this.tableChange()
    }
    this.dragTable()
  },
  methods: {
    /**
       * 表格重新加载方法
       * @param {Boolean} resetPage 如果参数为 true，则强制刷新到第一页
       */
    refresh (resetPage = false) {
      if (resetPage) {
        this.localPagination.current = 1
        this.localPagination.pageSize = this.localPageSize
      }
      // 表格出现加载数据的时候，清空行选择 selectedRowKeys
      if (this.clearSelectedRowKeys && this.selectedRowKeys && this.selectedRowKeys.length > 0) {
        this.clearSelected()
      }
      this.tableChange()
    },
    /**
       * 加载数据方法
       * @param {Object} pagination 分页参数
       * @param {Object} filters 过滤条件
       * @param {Object} sorter 排序条件
       */
    tableChange (pagination, filters, sorter) {
      this.localLoading = true
      // 组装请求参数
      const params = {
        currentPage: (pagination && pagination.current) || (this.showPagination && this.localPagination.current) || this.currentPage,
        pageSize: (pagination && pagination.pageSize) || (this.showPagination && this.localPagination.pageSize) || this.localPageSize,
        ...filters
      }
      // 添加排序参数
      if (sorter) {
        if (sorter.field) {
          params.sortField = sorter.field
        }
        if (sorter.order) {
          params.sortOrder = sorter.order
        }
      }
      // 如果是对象，那说明 loadData 就是数据
      if (isObject(this.loadData)) {
        this.queryData(this.loadData, pagination)

        // 如果是数组，重新组装成对象的结构
      } else if (isArray(this.loadData)) {
        this.queryData({ rows: this.loadData }, pagination)

        // 如果是函数
      } else if (isFunction(this.loadData)) {
        // 获取到的数据
        const result = this.loadData(params)
        // 如果返回值已经是对象了，说明已经拿到数据了
        if (isObject(result)) {
          this.queryData(result, pagination)

          // 否则如果是异步请求
        } else if (result && isFunction(result.then)) {
          result.then(res => {
            this.queryData(res.data || res, pagination)
          })
        }
      } else {
        console.warn('loadData 参数格式错误')
      }
    },
    /**
       * 格式化表格数据
       * @param {Object} data 列表数据，结构为 { data: { rows: [], currentPage: 1, totalSize: 1 } }
       * @param {Object} pagination 分页数据
       */
    queryData (data, pagination) {
      // 兼容 currentPage 字段，后端可能返回的是 pageNo
      if (data.pageNo) {
        data.currentPage = data.pageNo
      }
      // 如果分页是无效的，重置为 1
      if (!data.currentPage) {
        data.currentPage = 1
      }
      // 如果没数据就初始化一份默认结构
      if (!data || (data.rows && data.rows.length === 0) || data.length === 0) {
        data = {
          currentPage: 1,
          rows: [],
          totalSize: 0
        }
      }
      // 组装分页参数
      if (this.showPagination) {
        this.localPagination = {
          ...this.localPagination,
          // 返回结果中的当前分页数
          current: (pagination && pagination.current) || data.currentPage,
          // 返回结果中的总记录数
          total: data.totalSize || 0,
          // 显示页数快捷跳转
          showQuickJumper: true,
          // 当前分页条数
          pageSize: (pagination && pagination.pageSize) || this.localPagination.pageSize
        }
      } else {
        this.localPagination = false
      }
      // 为防止删除数据后导致页面当前页面数据长度为 0，自动翻页到上一页
      if (data.rows && data.rows.length === 0 && this.showPagination && this.localPagination.current > 1) {
        this.localPagination.current--
        this.tableChange()
      }
      // 返回结果中的数组数据
      this.localDataSource = data.rows
      this.localLoading = false
    },
    // 初始化总数
    initTotalList (columns) {
      const totalList = []
      isArray(columns) && columns.forEach(column => {
        if (column.needTotal) {
          totalList.push({
            ...column, total: 0
          })
        }
      })
      return totalList
    },
    // 用于更新已选中的列表数据的总计数
    updateSelect (selectedRowKeys, selectedRows) {
      this.selectedRows = selectedRows
      this.selectedRowKeys = selectedRowKeys
      // 计算总数
      this.needTotalList = this.needTotalList.map(item => {
        return {
          ...item,
          total: selectedRows.reduce((sum, row) => {
            const total = sum + parseInt(row[item.dataIndex])
            return isNaN(total) ? 0 : total
          }, 0)
        }
      })
    },
    // 清空 table 已选中项
    clearSelected () {
      if (this.rowSelection) {
        this.rowSelection.onChange([], [])
        this.updateSelect([], [])
      }
    },
    // 清空操作
    onClearSelected () {
      // 调用自定义的清空函数
      if (isFunction(this.alert.clear)) {
        this.alert.clear()
      }
      this.clearSelected()
    },
    // 设置表格行属性，同时合并行拖拽
    onCustomRow (record, index) {
      const customRow = this.customRow ? this.customRow(record, index) : {}
      const rowProps = {
        style: {
          cursor: this.dragSort ? 'pointer' : null
        },
        props: {
          ...customRow.props
        },
        on: {
          ...customRow.on
        }
      }
      // 如果是开启行拖拽，则添加拖拽事件
      if (this.dragSort) {
        rowProps.on = {
          ...rowProps.on,
          ...this.onRowDrag(record, index)
        }
      }
      return rowProps
    },
    // 行拖拽
    onRowDrag (record, index) {
      return {
        // 鼠标移入
        mouseenter: event => {
          // 设置行属性
          event.target.draggable = true
        },
        // 开始拖拽
        dragstart: event => {
          event.stopPropagation()
          // 得到源目标数据
          sourceItem = { ...record }
        },
        // 拖动元素经过的元素
        dragover: event => {
          event.preventDefault()
          event.target.parentNode.style.background = 'rgba(197, 197, 197, 0.5)'
        },
        // 离开拖动元素
        dragleave: event => {
          event.preventDefault()
          event.target.parentNode.style.background = ''
        },
        // 鼠标松开
        drop: event => {
          event.stopPropagation()
          event.target.parentNode.style.background = ''
          // 得到目标数据
          targetItem = { ...record }
          this.dragDataMove(this.localDataSource, index)
          this.$emit('drop', sourceItem, targetItem, isDrop)
          sourceItem = null
          targetItem = null
          isDrop = false
        }
      }
    },
    // 行拖拽结束后，数据处理
    dragDataMove (list = [], endIndex) {
      list.forEach(item => {
        if (item[this.rowKey] === sourceItem[this.rowKey]) {
          isDrop = list.some(children => children[this.rowKey] === targetItem[this.rowKey])
          // 如果是有效拖动，进行页面数据排序
          if (isDrop) {
            const index = list.findIndex(item => sourceItem[this.rowKey] === item[this.rowKey])
            // 删除拖拽行之前的位置
            list.splice(index, 1)
            // 拖拽的行添加到新的位置，这里 endIndex 使用官方监听的 index，保证上移下移位置正确
            list.splice(endIndex, 0, sourceItem)
          }
        }
        if (item.children && item.children.length > 0) {
          this.dragDataMove(item.children, endIndex)
        }
      })
    },
    // 设置表格列拖动
    dragTable () {
      if (this.drag) {
        // 初始化列头宽度
        const thWidth = {}
        this.columns.forEach(item => {
          item.minWidth = item.minWidth || minColWidth
          thWidth[item.key] = item.width
        })
        const dragState = Vue.observable(thWidth)

        // 自定义列头渲染
        const resizeHeader = (h, props, children) => {
          let refTh = null
          let refDraggable = null

          // 如果没有设置宽度，则不拖动
          const { key, ...restProps } = props
          const col = this.columns.find(item => (item.dataIndex || item.key) === key) || {}
          if (col && !col.width) {
            return <th {...restProps}>{children}</th>
          }

          // 拖动时实时更新列宽
          const onDrag = (x, y) => {
            dragState[key] = 0
            if (x < col.minWidth) {
              refDraggable.left = col.minWidth
              return
            }
            // 如果设置了总列宽，拖动的时候同时更新总列宽
            if (this.scroll && this.scroll.x) {
              this.scroll.x += x - col.width
            }
            col.width = Math.max(x, col.minWidth)
          }

          // 拖动结束后缓存最终的列宽
          const onDragStop = (x, y) => {
            dragState[key] = refTh.getBoundingClientRect().width
            // 列拖动结束后缓存
            if (this.columnStorage && this.$utils && this.$utils.setStorage && typeof window !== 'undefined') {
              this.$utils.setStorage(this.$route.path, { columns: this.columns })
            }
          }

          return (
            <th {...restProps} v-ant-ref={r => (refTh = r)} width={col.width} class="table-th-resize">
              {children}
              <ak-draggable
                class="table-drag-box"
                key={col.key}
                v-ant-ref={r => (refDraggable = r)}
                w={10}
                x={dragState[key] || col.width}
                z={1}
                axis="x"
                draggable={true}
                resizable={false}
                onDragging={onDrag}
                onDragstop={onDragStop}
              ></ak-draggable>
            </th>
          )
        }
        this.componentHeader = {
          header: {
            cell: resizeHeader
          }
        }
      }
    },
    // 渲染 alert 组件
    renderAlert () {
      // 显示当前选中列的总数计数
      const needTotalItems = this.needTotalList.map(item => {
        return (
          <span style="margin-right: 12px">
            {item.title} 总计 <a style="font-weight: bold">{item.customRender ? item.customRender(item.total) : item.total}</a>
          </span>
        )
      })
      return (
        <a-alert showIcon={true}>
          <template slot="message">
            <span style="margin-right: 12px">已选择：<a style="font-weight: bold">{this.selectedRows.length}</a></span>
            {needTotalItems}
            {this.selectedRows.length ? <a style="margin-left: 24px" onClick={this.onClearSelected}>清空</a> : null}
          </template>
        </a-alert>
      )
    }
  },
  render () {
    return (
      <div class="ak-table-wrapper">
        {this.showAlert ? this.renderAlert() : null}
        <a-table class="ak-table" {...this.newProps}>
          {Object.keys(this.$slots).map(name => <template slot={name}>{this.$slots[name]}</template>)}
        </a-table>
      </div>
    )
  }
}
</script>
