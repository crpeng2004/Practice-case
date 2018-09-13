<template>
  <div id="app" class="app">
    <ul class="header-nav">
      <li>
        <router-link to="/">首页</router-link>
      </li>
      <li>
        <router-link to="/trader">币币交易</router-link>
      </li>
    </ul>
    <router-view></router-view>
  </div>
</template>

<script>

export default {
  name: 'app'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
}

.app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.header-nav {
  line-height: 48px;
  margin-bottom: 30px;
}

.trade-view iframe {
  margin: 0 auto;
  border: 1px solid #d1d5da;
}
</style>
