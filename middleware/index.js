const Router = require('koa-router')()
const BodyParser = require('koa-bodyparser')
const path = require("path")
const miInit = require('./mi-init')
const miRender = require('./mi-render')
const miRouter = require('./mi-router')
const miError = require('./mi-http-error')
const miStaticFiles = require('./mi-static-files')
const isProduction = process.env.NODE_ENV === 'production'

module.exports = (app) => {
  app.use(miError({
    errorPageFolder: path.resolve(__dirname, '../errorPage') // 自定义错误文件夹
  }));
  /**
  * 记录URL以及页面执行时间
  */
  app.use(async (ctx, next) => {
    let time = new Date()
    let sT = time.getTime()
    let eT
    console.log(`process ${ctx.request.method} ${ctx.request.url} ${time}...`)
    await next()
    eT = new Date().getTime() - sT
    ctx.response.set('X-Response-Time', `${eT}ms`)
  })

  /**
   * 初始化模板上下文 scope
   */
  app.use(miInit())

  /**
   * 处理静态文件
   */
  if (!isProduction) {
    app.use(miStaticFiles('/static', path.resolve(__dirname, "../static")))
  }

  /**
   * 解析POST请求
   */
  app.use(BodyParser())

  /**
   * 指定控制器规则和视图规则 
   * {
   *  match: '/login'
   *  controller: 'home.login'
   * }
   * 对应执行 /controller/home.js=>index()
   */
  app.use(miRender({
    rootControllerPath: path.resolve(__dirname, "../controller"),
    viewRootPath: path.resolve(__dirname, "../views")
  }))
  app.use(miRouter(require("../route")))
}