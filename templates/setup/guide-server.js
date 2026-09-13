const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { configure, testConnection, PROVIDERS, AVAILABLE_MODELS } = require('./config-writer');

// 根路径来自 argv[2]（Task 3 启动器传入，无尾反斜杠形态）
const root = path.resolve(process.argv[2] || '.');
const dataDir = path.join(root, 'data');
const setupDir = path.join(root, 'setup');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, providers: PROVIDERS, models: AVAILABLE_MODELS, configured: fs.existsSync(path.join(dataDir, '.configured')) }));
      return;
    }
    if (url.pathname === '/api/configure' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { providers, persona, personaText, agentModels, workspace } = JSON.parse(body);
      configure({ root, providers, persona, personaText, agentModels, workspace });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === '/api/test' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      // baseUrl（可选）存在即自定义 OpenAI 兼容模式：直连该端点而非精选表
      const { provider, apiKey, baseUrl } = JSON.parse(body);
      const result = await testConnection({ provider, apiKey, baseUrl });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    // 静态文件：仅允许 setup 目录内（path.basename 防御路径穿越）
    const rel = url.pathname.replace(/^\/setup\//, '');
    const file = path.join(setupDir, path.basename(rel));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.guide-url'), `http://127.0.0.1:${port}/setup/first-run.html`, 'utf8');
});
