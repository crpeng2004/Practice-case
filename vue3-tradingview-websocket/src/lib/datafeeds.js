/* eslint-disable */
/**
 * 数据更新器
 */
export class DataUpdater {
  constructor(datafeeds) {
    this.subscribers = {}
    this.requestsPending = 0
    this.historyProvider = datafeeds
  }
  subscribeBars(symbolInfo, resolution, newDataCallback, listenerGuid) {
    this.subscribers[listenerGuid] = {
      lastBarTime: null,
      listener: newDataCallback,
      resolution: resolution,
      symbolInfo: symbolInfo
    }
  }
  unsubscribeBars(listenerGuid) {
    delete this.subscribers[listenerGuid]
  }
  updateData() {
    if (this.requestsPending) return
    this.requestsPending = 0
    for (let listenerGuid in this.subscribers) {
      this.requestsPending++
      this.updateDataForSubscriber(listenerGuid).then(() => this.requestsPending--).catch(() => this.requestsPending--)
    }
  }
  updateDataForSubscriber(listenerGuid) {
    return new Promise((resolve, reject) => {
      const subscriptionRecord = this.subscribers[listenerGuid]
      const rangeEndTime = parseInt((Date.now() / 1000).toString())
      const rangeStartTime = rangeEndTime - this.periodLengthSeconds(subscriptionRecord.resolution, 10)
      this.historyProvider.getBars(subscriptionRecord.symbolInfo, subscriptionRecord.resolution, rangeStartTime, rangeEndTime,
        bars => {
          this.onSubscriberDataReceived(listenerGuid, bars)
          resolve()
        },
        () => reject()
      )
    })
  }
  onSubscriberDataReceived(listenerGuid, bars) {
    if (!this.subscribers.hasOwnProperty(listenerGuid)) return
    if (!bars.length) return
    const lastBar = bars[bars.length - 1]
    const subscriptionRecord = this.subscribers[listenerGuid]
    if (subscriptionRecord.lastBarTime !== null && lastBar.time < subscriptionRecord.lastBarTime) return
    const isNewBar = subscriptionRecord.lastBarTime !== null && lastBar.time > subscriptionRecord.lastBarTime
    if (isNewBar) {
      if (bars.length < 2) {
        throw new Error(' >> Not enough bars in history for proper pulse update. Need at least 2.');
      }

      const previousBar = bars[bars.length - 2]
      subscriptionRecord.listener(previousBar)
    }

    subscriptionRecord.lastBarTime = lastBar.time
    subscriptionRecord.listener(lastBar)
  }
  periodLengthSeconds(resolution, requiredPeriodsCount) {
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
}

/**
 * JS API
 */
export class Datafeeds {
  // ws://localhost:666/trader || ws://118.190.201.181:666/trader
  constructor(options, url = 'ws://118.190.201.181:666/trader') {
    this.url = url
    this.options = options || {}
    this.HistoricalData = null  // 历史数据
    this.PushData = null // 推送数据
    this.awaitCount = 0  // 等待统计
    this.lastTime = 0
    this.barsUpdater = new DataUpdater(this)
    this.initSocket()
  }

  initSocket(params) {
    const data = params ? params : this.options
    const { symbol, resolution } = data
    this.socket = new SocketIo(this.url)
    this.socket.init()
    this.socket.on('open', () => this.socket.emit({ symbol, resolution }))
    this.socket.on('message', this.onMessage.bind(this))
  }

  closeSocket() {
    this.socket.close()
    this.awaitCount = 0
    this.HistoricalData = null
    this.PushData = null
  }

  onMessage(data) {
    if (!data || !data.s) return
    const bars = this.dataProvider(data)
    if (bars.length > 100 && !this.HistoricalData) {
      this.HistoricalData = bars
    } else {
      if (bars.length) {
        const list = []
        bars.sort((a, b) => a.time > b.time ? 1 : -1)
        bars.forEach(function (element) {
          if (element.time >= this.lastTime && element.time <= Date.now()) {
            list.push(element)
          }
        }, this)
        if (list.length) {
          this.PushData = list
          this.lastTime = list[list.length - 1].time
          this.barsUpdater.updateData()
        }
      }
    }
  }
  /**
   * @param {*Function} callback  回调函数
   * `onReady` should return result asynchronously.
   */
  onReady(callback) {
    return new Promise(resolve => {
      const defaultConfiguration = this.defaultConfiguration()
      resolve(defaultConfiguration)
    }).then(data => callback(data))
  }

  /**
   * @param {*String} symbolName  商品名称或ticker
   * @param {*Function} onSymbolResolvedCallback 成功回调 
   * @param {*Function} onResolveErrorCallback   失败回调
   * `resolveSymbol` should return result asynchronously.
   */
  resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
    return new Promise(resolve => {
      const symbolInfo = this.defaultSymbol()
      resolve(symbolInfo)
    }).then(data => onSymbolResolvedCallback(data))
  }

  /**
   * 解析数据
   * @param {*} response 
   */
  dataProvider(response) {
    const bars = []
    if (response.s !== 'no_data') {
      const volumePresent = response.v !== undefined
      const ohlPresent = response.o !== undefined
      for (let i = 0; i < response.t.length; i++) {
        const barValue = {
          time: response.t[i] * 1000,
          close: Number(response.c[i]),
          open: Number(response.c[i]),
          high: Number(response.c[i]),
          low: Number(response.c[i])
        }
        if (ohlPresent) {
          barValue.open = Number(response.o[i])
          barValue.high = Number(response.h[i])
          barValue.low = Number(response.l[i])
        }
        if (volumePresent) {
          barValue.volume = Number(response.v[i])
        }
        bars.push(barValue)
      }
    }
    return bars
  }

  /**
   * @param {*Object} symbolInfo  商品信息对象
   * @param {*String} resolution  分辨率
   * @param {*Number} rangeStartDate  时间戳、最左边请求的K线时间
   * @param {*Number} rangeEndDate  时间戳、最右边请求的K线时间
   * @param {*Function} onDataCallback  回调函数
   * @param {*Function} onErrorCallback  回调函数
   */
  getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onDataCallback, onErrorCallback) {
    // 切换周期
    if (resolution !== this.options.resolution) {
      console.log(' >> Change resolution: ', this.options.resolution, resolution)
      this.closeSocket()
      this.options.resolution = resolution
      this.initSocket({ symbol: this.options.symbol, resolution: resolution })
    }
    /// 切换商品
    if (symbolInfo.name.toLocaleUpperCase() !== this.options.symbol.toLocaleUpperCase()) {
      console.log(' >> Change symbol: ', this.options.symbol, symbolInfo.name)
      this.closeSocket()
      this.options.symbol = symbolInfo.name
      this.initSocket({ symbol: symbolInfo.name, resolution: this.options.resolution })
    }
    if (!this.awaitCount && !this.HistoricalData) {
      // 历史数据
      this.asyncCallback().then(data => {
        // console.log(' >> Historical data: ', rangeStartDate, rangeEndDate)
        this.awaitCount = 0
        const bars = []
        if (data.length) {
          data.sort((a, b) => a.time > b.time ? 1 : -1)
          const from = rangeStartDate * 1000
          const to = rangeEndDate * 1000
          data.forEach(function (element) {
            if (element.time >= from && element.time <= to) {
              bars.push(element)
            }
          }, this)
          this.HistoricalData = bars
          this.lastTime = bars[bars.length - 1].time
        }
        onDataCallback(bars, { noData: true })
      })
    } else {
      // 实时数据
      onDataCallback(this.PushData, { noData: true })
    }
  }

  /**
   * 异步回调
   * 5秒之后没响应返回空数组
   */
  asyncCallback() {
    return new Promise((resolve, reject) => {
      this.awaitCount++
      if (this.HistoricalData) {
        return resolve(this.HistoricalData)
      } else {
        return this.awaitCount < 10 ? reject() : resolve([])
      }
    }).catch(() => {
      return new Promise(resolve => {
        setTimeout(resolve, 500)
        console.log(` >> Await counts: ${this.awaitCount * 500}ms`)
      }).then(() => this.asyncCallback())
    })
  }

  /**
   * 订阅K线数据。图表库将调用onRealtimeCallback方法以更新实时数据
   * @param {*Object} symbolInfo 商品信息
   * @param {*String} resolution 分辨率
   * @param {*Function} onRealtimeCallback 回调函数 
   * @param {*String} subscriberUID 监听的唯一标识符
   * @param {*Function} onResetCacheNeededCallback (从1.7开始): 将在bars数据发生变化时执行
   */
  subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
    this.barsUpdater.subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback)
  }

  /**
   * 取消订阅K线数据
   * @param {*String} subscriberUID 监听的唯一标识符
   */
  unsubscribeBars(subscriberUID) {
    this.barsUpdater.unsubscribeBars(subscriberUID)
  }

  /**
   * 默认配置
   */
  defaultConfiguration() {
    return {
      supports_search: false,
      supports_group_request: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
      supports_marks: false,
      supports_timescale_marks: false,
    }
  }

  /**
   * 默认商品信息
   */
  defaultSymbol() {
    return {
      'name': this.options.symbol,
      'timezone': 'Asia/Shanghai',
      'pointvalue': 1,
      'fractional': false,
      'session': '24x7',
      'minmov': 1,
      'minmove2': 1,
      'has_intraday': true,
      'has_no_volume': false,
      'description': this.options.symbol,
      'pricescale': 100,
      'ticker': this.options.symbol,
      'supported_resolutions': ['1', '5', '15', '30', '60', '1D', '2D', '3D', '1W', '1M']
    }
  }
}

/**
 * WebSocket
 */
export class SocketIo {
  constructor(url) {
    this.messageMap = {}
    this.connState = 0
    this.ws = null
    this.url = url
  }
  init() {
    if (this.connState) return
    const BrowserWebSocket = window.WebSocket || window.MozWebSocket
    const socket = new BrowserWebSocket(this.url)
    socket.onopen = evt => this.onOpen(evt)
    socket.onclose = evt => this.onClose(evt)
    socket.onmessage = evt => this.onMessage(evt.data)
    socket.onerror = err => this.onError(err)
    this.ws = socket
  }
  onOpen(evt) {
    this.connState = 1
    this.onReceiver({ Event: 'open' })
  }
  checkOpen() {
    return this.connState
  }
  onClose() {
    if (this.connState) {
      this.connState = 0
      this.onReceiver({ Event: 'close' })
    }
  }
  emit(data) {
    if (this.connState) {
      this.ws.send(JSON.stringify(data))
    }
  }
  onMessage(message) {
    try {
      const data = message.indexOf('{') !== -1 ? JSON.parse(message) : message
      this.onReceiver({ Event: 'message', Data: data })
    } catch (err) {
      console.error(' >> Data parsing error:', err)
    }
  }
  onError(err) {
    // You Code
  }
  onReceiver(data) {
    const callback = this.messageMap[data.Event]
    if (callback) callback(data.Data)
  }
  on(name, handler) {
    this.messageMap[name] = handler
  }
  close() {
    this.ws.close()
  }
  destroy() {
    this.close()
    this.messageMap = {}
    this.connState = 0
    this.ws = null
  }
}