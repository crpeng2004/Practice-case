import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const router = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/trader',
    name: 'trader',
    component: () => import('../views/Trader.vue')
  }
]

export default new Router({
  mode: 'history',
  scrollBehavior: () => ({ y: 0 }),
  routes: router
})