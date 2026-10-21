/* 打卡页 API 地址配置（GitHub Pages 部署版）
 * 页面：https://kinozhao9205.github.io/attendance-checkin/
 * API ：国内阿里云 ECS（已备案域名 www.bydtyr.com 的 /att-api/ 路径反代 → Node :8770）
 * 服务端 CORS 白名单：ATT_CORS_ORIGINS=https://kinozhao9205.github.io
 * 应急：本配置失效时可在 URL 后带 ?api=https://www.bydtyr.com/att-api 临时覆盖。 */
window.ATT_API_BASE = 'https://www.bydtyr.com/att-api';
