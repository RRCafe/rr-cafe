const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  // Ignore Vercel CLI's proxy req.url and look at the original URL the browser requested
  let originalUrl = req.headers['x-forwarded-path'] || req.headers['x-invoke-path'] || req.url;
  
  if (originalUrl.includes('%3F')) originalUrl = originalUrl.replace(/%3F/g, '?');
  
  // Clean query strings
  let reqPath = originalUrl.split('?')[0];
  
  let filePath = path.join(__dirname, 'dist', reqPath);
  
  // If the file exists directly (e.g. /assets/index.js), serve it!
  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath);
    let contentType = 'text/plain';
    if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.html') contentType = 'text/html';
    
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  
  // If we reach here, it's a SPA fallback route (like /admin/billing)
  if (reqPath.startsWith('/admin')) filePath = path.join(__dirname, 'dist/admin/index.html');
  else if (reqPath.startsWith('/delivery')) filePath = path.join(__dirname, 'dist/delivery/index.html');
  else filePath = path.join(__dirname, 'dist/index.html');
  
  if (fs.existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => console.log('Static server listening on ' + port));
