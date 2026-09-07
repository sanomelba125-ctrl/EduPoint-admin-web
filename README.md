# 学生活动打卡与积分管理系统 - 管理端后台 (Admin Web)

基于 **Vue 3**、**Vite**、**TypeScript**、**Element Plus**、**Pinia** 与 **Vue Router 4** 构建的响应式后台管理系统。

---

## 🛠️ 技术栈说明

- **前端框架**：Vue 3 (Composition API + `<script setup>`)
- **构建工具**：Vite 5
- **开发语言**：TypeScript 5
- **UI 组件库**：Element Plus + @element-plus/icons-vue
- **状态管理**：Pinia
- **路由控制**：Vue Router 4
- **数据可视化**：ECharts
- **HTTP 客户端**：Axios (支持 Sa-Token 鉴权头注入与全局拦截)

---

## 📁 模块与路由结构

```text
admin-web/
├── src/
│   ├── api/            # RESTful 请求接口与 TypeScript 泛型契约
│   ├── layout/         # 后台整体左右与顶部布局外壳
│   ├── router/         # 页面路由与前置权限拦截守卫
│   ├── store/          # Pinia 用户态与全局配置存储
│   ├── utils/          # Axios 统一封装与请求异常处理
│   └── views/          # 业务视图页面
│       ├── login/              # 管理员登录页
│       ├── dashboard/          # 数据可视化看板 (签到率、活跃人数、积分榜)
│       ├── user/               # 系统管理员与权限管理
│       ├── student/            # 学生档案管理与学号检索
│       ├── activity/           # 校园活动发布与启停维护
│       ├── student-activity/   # 学生打卡记录与审核核验
│       ├── student-point/      # 学生积分汇总与手动调账
│       ├── gift/               # 积分兑换礼品库上架管理
│       └── student-gift/       # 礼品核销发放流转
```

---

## 🚀 启动与调试

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务 (默认监听 3000 端口并反向代理 /api 到后端 8080)
npm run dev

# 3. 生产环境静态打包构建
npm run build
```

- **访问地址**：[http://localhost:3000](http://localhost:3000)
- **初始管理员账号**：`admin`
- **初始登录密码**：`123`
