<template>
  <div class="trade-view" id="trade-view">
  </div>
</template>

<script>
import { Datafeeds } from '../lib/datafees'
export default {
  data() {
    return {
      widget: null
    }
  },
  methods: {
    initChart(language, symbol, interval) {
      if (!this.widget) {
        // eslint-disable-next-line
        const widget = new TradingView.widget({
          // debug: true,
          symbol: symbol,
          interval: interval,
          container_id: 'trade-view',
          datafeed: new Datafeeds({ symbol: symbol, resolution: interval }),
          library_path: './tradingview/charting_library/',
          disabled_features: ['header_symbol_search'],
          timezone: 'Asia/Shanghai',
          locale: language
        })
        this.widget = widget
      }
    }
  },
  mounted() {
    this.initChart('zh', 'ETH/USDT', '1')
  }
}
</script>
