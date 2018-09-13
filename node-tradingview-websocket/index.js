const Koa = require('koa')
const websockify = require('koa-websocket')
const app = websockify(new Koa())
const axios = require('axios')

class FetchData {
  constructor() {
    this.timer = null
    this.firstTime = null
    this.baseUrl = 'http://www.coinlim.com/service-business-tradingview/v0.1.0/history'
  }
  init(params, callback) {
    this.timer = setInterval(() => {
      const { symbol, resolution } = params
      const { from, to } = this.period(resolution)
      axios.get(`${this.baseUrl}?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`).then(res => {
        callback && callback(res.data)
      })
    }, 1000)
  }
  period(resolution) {
    const time = parseInt(Date.now() / 1000)
    if (!this.firstTime) {
      this.firstTime = true
      console.log(' >> Start Time: ', time - this.periodLength(resolution, 1400), time)
      return {
        from: time - this.periodLength(resolution, 1400),
        to: time
      }
    } else {
      return {
        from: time - this.periodLength(resolution, 10),
        to: time
      }
    }
  }
  periodLength(resolution, requiredPeriodsCount) {
    let daysCount = 0
    if (resolution === 'D' || resolution === '1D') {
      daysCount = requiredPeriodsCount
    } else if (resolution === 'M' || resolution === '1M') {
      daysCount = 31 * requiredPeriodsCount
    } else if (resolution === 'W' || resolution === '1W') {
      daysCount = 7 * requiredPeriodsCount
    } else {
      daysCount = requiredPeriodsCount * parseInt(resolution) / (24 * 60)
    }
    return daysCount * 24 * 60 * 60
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
  ctx.websocket.send(JSON.stringify({ type: 'Hello World' }))
  ctx.websocket.on('message', message => {
    console.log(' >> Message: ', message)
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