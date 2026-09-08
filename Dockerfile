# ===================================================================
# 学生活动打卡与积分管理系统 - 管理端后台 Dockerfile
# 基础镜像: 官方精简版 Nginx Alpine
# ===================================================================
FROM nginx:alpine

# 拷贝 Nginx 路由代理配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝前端打包产物
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
