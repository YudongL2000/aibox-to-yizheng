/**
 * [INPUT]: 依赖 Node.js 的 http/https 能力，依赖本地 Flutter web-server 与远端业务/Agent 服务。
 * [OUTPUT]: 对外提供同源开发代理，转发页面流量到 Flutter，转发接口流量到真实后端。
 * [POS]: 仓库根目录的本地 Web 调试入口，专门消除浏览器 CORS；[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const http = require('node:http');
const https = require('node:https');

function readCliArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

const listenPort = Number(readCliArg('port') || process.env.PORT || 18080);
const flutterServer = new URL(
  readCliArg('flutter-web-server') ||
    process.env.FLUTTER_WEB_SERVER ||
    'http://127.0.0.1:18081',
);
const businessServer = new URL(
  readCliArg('business-api') ||
    process.env.BUSINESS_API ||
    'http://115.190.195.204:40015',
);
const agentServer = new URL(
  readCliArg('agent-api') ||
    process.env.AGENT_API ||
    'http://127.0.0.1:3005',
);

const routes = [
  {
    prefix: '/agent-api',
    target: agentServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname.replace(/^\/agent-api/, '') || '/',
  },
  {
    prefix: '/app',
    target: businessServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname,
  },
  {
    prefix: '/resource',
    target: businessServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname,
  },
  {
    prefix: '/base',
    target: businessServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname,
  },
  {
    prefix: '/MAGI',
    target: businessServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname,
  },
  {
    prefix: '/api/v1',
    target: businessServer,
    rewriteOrigin: true,
    rewritePath: (pathname) => pathname,
  },
];

function getHttpModule(target) {
  return target.protocol === 'https:' ? https : http;
}

function resolveRoute(pathname) {
  return (
    routes.find((route) => pathname.startsWith(route.prefix)) || {
      prefix: '/',
      target: flutterServer,
      rewriteOrigin: false,
      rewritePath: (value) => value,
    }
  );
}

function buildHeaders(req, route) {
  const headers = { ...req.headers, host: route.target.host };

  if (route.rewriteOrigin) {
    delete headers['sec-fetch-site'];
    headers.origin = route.target.origin;
    if (headers.referer) {
      headers.referer = `${route.target.origin}/`;
    }
  }

  return headers;
}

function proxyHttpRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const route = resolveRoute(requestUrl.pathname);
  const upstreamPath = `${route.rewritePath(requestUrl.pathname)}${requestUrl.search}`;

  const proxyReq = getHttpModule(route.target).request(
    {
      protocol: route.target.protocol,
      hostname: route.target.hostname,
      port: route.target.port,
      method: req.method,
      path: upstreamPath,
      headers: buildHeaders(req, route),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`proxy error: ${error.message}`);
  });

  req.pipe(proxyReq);
}

function proxyUpgradeRequest(req, socket, head) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const route = resolveRoute(requestUrl.pathname);
  const upstreamPath = `${route.rewritePath(requestUrl.pathname)}${requestUrl.search}`;

  const proxyReq = getHttpModule(route.target).request({
    protocol: route.target.protocol,
    hostname: route.target.hostname,
    port: route.target.port,
    method: req.method,
    path: upstreamPath,
    headers: buildHeaders(req, route),
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      [
        `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}`,
        ...Object.entries(proxyRes.headers).map(([key, value]) => {
          const lineValue = Array.isArray(value) ? value.join(', ') : value;
          return `${key}: ${lineValue}`;
        }),
        '',
        '',
      ].join('\r\n'),
    );

    if (head.length > 0) {
      proxySocket.write(head);
    }
    if (proxyHead.length > 0) {
      socket.write(proxyHead);
    }

    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.destroy();
  });

  proxyReq.end();
}

const server = http.createServer(proxyHttpRequest);
server.on('upgrade', proxyUpgradeRequest);
server.listen(listenPort, '127.0.0.1', () => {
  console.log(
    `[dev-web-proxy] http://127.0.0.1:${listenPort} -> flutter ${flutterServer.origin}`,
  );
});
