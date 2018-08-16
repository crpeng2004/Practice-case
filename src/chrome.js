// Chromium 实例 简单demo
class Chrome {
  constructor(puppeteer, browse) {
    this.puppeteer = puppeteer
    this.browse = browse
    this.page = null
    this.id = null
  }
  // 初始化
  async init(options) {
    // 多 Browse 
    if (this.puppeteer) {
      this.browse = await this.puppeteer.launch(options)
    }
    this.page = await this.browse.newPage()
  }
  async goto(url) {
    await this.page.goto(url)
    this.id = Date.now()
  }
  // 关闭页面
  async close() {
    if (this.puppeteer) {
      // 多 Browse 模式
      await this.browse.close()
    } else {
      // 多 Page 模式
      await this.page.close()
    }
  }
}

module.exports = Chrome