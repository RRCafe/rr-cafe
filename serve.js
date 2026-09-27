const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let basePath = req.url;
  
  if (basePath.includes('%3F')) basePath = basePath.replace(/%3F/g, '?');
  basePath = basePath.split('?')[0];

  const originalUrl = req.headers['x-forwarded-path'] || req.headers['x-invoke-path'] || req.url;
  
  // Only fallback if the path doesn't have an extension (i.e. it's a page route)
  const hasExtension = path.extname(basePath) !== '';
  
  if (!hasExtension) {
    if (originalUrl.startsWith('/admin')) {
      basePath = '/admin/index.html';
    } else if (originalUrl.startsWith('/delivery')) {
      basePath = '/delivery/index.html';
    } else {
      basePath = '/index.html';
    }
  }
  
  let filePath = path.join(__dirname, 'dist', basePath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.json') contentType = 'application/json';
    
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Ultimate fallback
    if (basePath.startsWith('/admin')) filePath = path.join(__dirname, 'dist/admin/index.html');
    else if (basePath.startsWith('/delivery')) filePath = path.join(__dirname, 'dist/delivery/index.html');
    else filePath = path.join(__dirname, 'dist/index.html');
    
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => console.log('Static server listening on ' + port));
