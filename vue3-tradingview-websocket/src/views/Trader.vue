<template>
  <div class="trade-view" id="trade-view">
  </div>
</template>

<script>
import { Datafeeds } from '../lib/datafeeds'
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
          disabled_features: ['header_symbol_search', 'volume_force_overlay'],
          timezone: 'Asia/Shanghai',
          locale: language,
          overrides: {
            "volumePaneSize": "medium"
          }
        })
        this.widget = widget
      }
    }
  },
  mounted() {
    this.initChart('zh', 'ETH/USDT', '15')
  }
}
</script>
