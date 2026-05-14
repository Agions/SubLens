import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeHero from './components/HomeHero.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {})
  },
  enhanceApp({ app }) {
    app.component('HomeHero', HomeHero)
  },
}
