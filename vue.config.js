module.exports = {
  css: {
    extract: false,
    loaderOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  },
  configureWebpack: {
    // externals: {
    //   vue: {
    //     root: 'Vue',
    //     commonjs: 'vue',
    //     commonjs2: 'vue',
    //     amd: 'vue'
    //   },
    //   'vue-router': 'VueRouter',
    //   vuex: 'Vuex',
    //   moment: 'moment',
    //   axios: 'axios',
    //   'ant-design-vue': 'antd'
    // }
  },
  chainWebpack: config => {

  }
}
