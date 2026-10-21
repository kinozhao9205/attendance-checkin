/* 打卡页 API 地址配置 —— 跨域部署唯一需要改的文件
 *
 * 留空 ''  = API 与页面同源（默认：本地演示 / 阿里云整站部署）
 * 跨域部署 = 打卡页静态资源放 GitHub Pages（海外员工访问快 + 自带 HTTPS），
 *            API/数据库留在国内阿里云。此时把下面改为阿里云 API 地址，例如：
 *              window.ATT_API_BASE = 'https://att.bydtyr.com';
 *
 * 服务端放行：阿里云上启动时设置环境变量白名单（逗号分隔多个域名）：
 *   ATT_CORS_ORIGINS='https://kinozhao9205.github.io' node server/index.js
 *
 * 应急通道：不改文件也可在打卡页 URL 后带 ?api=https://att.bydtyr.com
 * （会被记住到手机本地，PWA 离线打开也生效；文件里的正式配置优先级更高）。 */
window.ATT_API_BASE = 'https://www.bydtyr.com/att-api';
