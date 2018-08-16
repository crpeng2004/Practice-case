const Koa = require('koa')
const App = new Koa()
const Chrome = require('./src/chrome')

const puppeteer = require('puppeteer')

let Browse
let BrowseClass

// 配置参数
const options = {
  devtools: true,
  executablePath: './chrome/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}

App.use(async ctx => {
  if (Browse) {
    await BrowseClass.init()
    await BrowseClass.goto('https://www.baidu.com/')
    // 可执行关闭 await BrowseClass.close()
    ctx.body = BrowseClass.id
  } else {
    const currentChrome = new Chrome(puppeteer)
    await currentChrome.init(options)
    await currentChrome.goto('https://www.baidu.com/')
    // 可执行关闭 await currentChrome.close()
    ctx.body = currentChrome.id
  }
})

App.listen(8088, () => {
  // 多 Page 的话在这里启动 puppeteer
  puppeteer.launch(options).then(browse => {
    Browse = browse
    BrowseClass = new Chrome(null, Browse)
  })
  console.log(` >> ${new Date().toJSON()} Start service.`)
})