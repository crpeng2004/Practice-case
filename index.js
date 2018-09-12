const Koa = require('koa')
const websockify = require('koa-websocket')
const app = websockify(new Koa())
const axios = require('axios')

class FetchData {
  constructor() {
    this.timer = null
  }
  init(params, callback) {
    this.timer = setInterval(() => {
      axios.get(`http://www.coinlim.com/service-business-tradingview/v0.1.0/history?symbol=${params.symbol}&resolution=${params.resolution}&from=${params.from}&to=${params.to}`).then(res => {
        callback && callback(res.data)
      })
    }, 1000)
  }
  close() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

const enterTrader = async ctx => {
  const fetchData = new FetchData()
  ctx.websocket.send('Hello World')
  ctx.websocket.on('message', message => {
    console.log(' >> Message: ', message)
    if (typeof message === 'string') {
      try {
        const params = JSON.parse(message)
        if (params && params.symbol && params.resolution) {
          fetchData.init(params, data => {
            if (ctx.websocket.readyState === 1) {
              ctx.websocket.send(JSON.stringify(data))
            }
          })
        }
      } catch (err) {
        console.error(' >> Parse Error: ', err)
      }
    }
  })
  ctx.websocket.on('close', () => {
    fetchData.close()
    console.log(' >> WebSocket Close.')
  })
}

app.ws.use(async ctx => {
  const url = ctx.request.url
  const index = url.indexOf('?')
  const router = index !== -1 ? url.substr(0, index) : url
  switch (router) {
    case '/trader':
      await enterTrader(ctx)
      break
    default:
      ctx.body = { code: 0, error: '参数错误' }
      break
  }
})

app.listen(666, () => {
  console.log(` >> ${new Date().toJSON()} Start service.`)
})