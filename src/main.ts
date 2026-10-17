// 管理端应用入口：统一装配 Pinia 状态容器、Vue Router 与 Element Plus 组件样式
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
// 样式顺序不可调换：Element 官方样式在前，全局设计规范在后（后者覆盖前者）
import 'element-plus/dist/index.css'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
