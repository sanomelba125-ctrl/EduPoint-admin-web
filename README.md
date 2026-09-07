# 校园活动积分平台 (EduPoint) - 管理端后台 (Admin Web)

基于 **Vue 3**、**Vite**、**TypeScript**、**Element Plus**、**Pinia** 与 **Vue Router 4** 构建的现代化响应式后台管理系统。

---

## 📌 接口与协同对齐基准

- **需求说明书**：[《校园活动积分平台需求说明.md》](../校园活动积分平台需求说明.md)
- **后端接口契约**：[《API.md》](../backend/API.md)（所有接口请求路径、入参、响应字段以此为准）
- **本地后端地址**：`http://localhost:8080/api`（Vite 已配置本地反向代理 `/api`）
- **初始管理员账号**：`admin`，密码 `123`；辅导员账号：`counselor`，密码 `123`

---

## 🛠️ 技术栈说明

- **前端框架**：Vue 3 (Composition API + `<script setup>`)
- **构建工具**：Vite 5
- **开发语言**：TypeScript 5
- **UI 组件库**：Element Plus + @element-plus/icons-vue
- **状态管理**：Pinia
- **路由控制**：Vue Router 4
- **数据可视化**：ECharts
- **HTTP 客户端**：Axios (自动在 Request Header 中携带 `satoken: <token>`)

---

## 📁 页面模块与功能颗粒度

```text
admin-web/src/
├── api/                # RESTful 请求接口与 TypeScript 泛型契约 (严格对照 API.md)
├── layout/             # 后台整体左右与顶部布局外壳
├── router/             # 页面路由与前置权限拦截守卫
├── store/              # Pinia 用户登录态与全局配置存储
├── utils/              # Axios 统一封装、异常提示与 Token 拦截
└── views/              # 核心业务视图
    ├── login/          # 管理员登录页
    ├── dashboard/      # 数据可视化看板 (活动数、签到率、Top5积分榜、Excel 导出)
    ├── user/           # 系统管理员账号与权限管理
    ├── student/        # 学生档案检索、账号状态维护 (启用/冻结)
    ├── activity/       # 活动发布 (支持高德/腾讯地图选点经纬度回填、动态二维码展示)
    ├── student-activity/# 学生活动打卡与签到审核记录
    ├── student-point/  # 积分明细流水台账与手动调账
    ├── gift/           # 礼品库上架、编辑、总库存与可用库存维护
    └── student-gift/   # 礼品兑换订单流转、提货码核销发放、取消订单退还积分
```

---

## 🚀 启动与调试

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务 (默认监听 3000 端口)
npm run dev

# 3. 生产环境构建
npm run build
```

- **访问地址**：[http://localhost:3000](http://localhost:3000)
