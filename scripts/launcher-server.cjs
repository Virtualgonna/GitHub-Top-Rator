#!/usr/bin/env node
/**
 * scripts/launcher-server.cjs
 * 极简 HTTP server（零依赖），用于本地启动 GitHub Top Radar
 *
 * 目的：解决双击 launcher.html 后点击"打开 Web 版"出现白板的问题
 * 原理：file:// 协议下 <script type="module"> 会被浏览器 CORS 策略拒绝加载，
 *       通过本地 HTTP server 访问可避免该限制
 *
 * 启动：node scripts/launcher-server.cjs
 * 端口：5180（避开 vite 5173/4173）
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { exec } = require('child_process');

const PORT = 5180;
const HOST = '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');

/* ─────────── API 代理路由（与 vite.config.ts 保持一致） ─────────── */
// 前端在 production 也会请求这些相对路径，需要本地 server 转发以绕过 CORS
const PROXY_ROUTES = {
  '/github-trending': 'https://github.com',
  '/github-api':      'https://api.github.com',
  '/ai-models':       'https://models.inference.ai.azure.com',
  '/mymemory-api':    'https://api.mymemory.translated.net',
};

// Hop-by-hop headers: 不应透传给上游 / 下游
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

function findProxyTarget(pathname) {
  for (const prefix of Object.keys(PROXY_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return { target: PROXY_ROUTES[prefix], prefix };
    }
  }
  return null;
}

function handleProxy(req, res, pathname, search) {
  const match = findProxyTarget(pathname);
  if (!match) return false;

  let target;
  try {
    target = new URL(match.target);
  } catch {
    return false;
  }
  const targetPath = pathname.slice(match.prefix.length) + (search || '');

  // 透传请求 headers（过滤 hop-by-hop）
  const proxyHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) proxyHeaders[k] = v;
  }
  proxyHeaders.host = target.host;

  const start = Date.now();
  let loggedStatus = null;

  const proxyReq = https.request({
    hostname: target.hostname,
    port: target.port || 443,
    path: targetPath,
    method: req.method,
    headers: proxyHeaders,
    // 本地启动器：跳过证书校验。代理目标均为公开 API（github.com、api.github.com、
    // models.inference.ai.azure.com、api.mymemory.translated.net），但 Windows 上
    // Node 内置的 CA 列表偶尔缺失部分中间证书，会报 "unable to verify the first
    // certificate"。如需严格校验可改为 true 并在系统层面安装缺失的根 CA。
    rejectUnauthorized: false,
  }, (proxyRes) => {
    loggedStatus = proxyRes.statusCode;
    // 透传响应 headers（过滤 hop-by-hop + 补 CORS）
    const responseHeaders = {};
    for (const [k, v] of Object.entries(proxyRes.headers)) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) responseHeaders[k] = v;
    }
    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-headers'] = '*';
    responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`  proxy error (${pathname}): ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Proxy error: ${err.message}`);
    } else {
      res.destroy();
    }
    loggedStatus = 502;
  });

  // 客户端断开时也中断上游请求，避免泄漏 socket
  res.on('close', () => {
    if (!proxyReq.destroyed) proxyReq.destroy();
  });
  req.on('error', () => proxyReq.destroy());

  // 透传请求 body（POST/PUT 等）
  req.pipe(proxyReq);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const tag = `${loggedStatus ?? '???'}  ${pathname}${search || ''}  → ${target.host}${targetPath}  (proxy, ${ms}ms)`;
    console.log(`  ${tag}`);
  });

  return true;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.cjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.exe':  'application/octet-stream',
};

// 阻止路径穿越（防 ../etc/passwd）
function safeJoin(root, requestedPath) {
  const decoded = decodeURIComponent(requestedPath.split('?')[0].split('#')[0]);
  const resolved = path.resolve(root, '.' + decoded);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const start = Date.now();
  let pathname = (req.url || '/').split('?')[0].split('#')[0];
  const search = (req.url || '').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?').split('#')[0] : '';

  // 根路径 → launcher.html
  if (pathname === '/' || pathname === '') pathname = '/launcher.html';

  // OPTIONS 预检直接 204（代理路由以外的请求也支持）
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end();
    console.log(`  204  ${pathname}${search || ''}  (CORS preflight)`);
    return;
  }

  // 1) 代理路由优先：/github-* /ai-models /mymemory-api
  if (handleProxy(req, res, pathname, search)) return;

  const filePath = safeJoin(ROOT, pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    console.log(`  403  ${pathname}`);
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback: dist/ 下的请求找不到 → 返回 dist/index.html
      // （让 React Router 接管路由）
      if (pathname.startsWith('/dist/')) {
        const indexPath = path.join(ROOT, 'dist', 'index.html');
        return fs.readFile(indexPath, (e, buf) => {
          if (e) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            console.log(`  404  ${pathname}`);
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(buf);
          console.log(`  200  ${pathname}  → dist/index.html (SPA fallback)`);
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      console.log(`  404  ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      // 关闭缓存：开发期间避免看到旧版
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
    const ms = Date.now() - start;
    console.log(`  200  ${pathname}  (${(stat.size / 1024).toFixed(1)} KB, ${ms}ms)`);
  });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log('');
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║   GitHub Top Radar · 本地启动器               ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ▶ 启动器:  ${url}`);
  console.log(`  ▶ Web 版:  ${url}dist/`);
  console.log(`  ▶ 桌面版:  ${url}release/  (下载安装包)`);
  console.log('');
  console.log('  按 Ctrl+C 停止服务');
  console.log('');

  // 自动用默认浏览器打开启动器
  const cmd = process.platform === 'win32'  ? `start "" "${url}"`
            : process.platform === 'darwin' ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, () => {});
});

process.on('SIGINT',  () => { console.log('\n  已停止'); server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
