const fs = require('fs');

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/admin', { recursive: true });
fs.mkdirSync('dist/delivery', { recursive: true });

fs.cpSync('apps/customer/dist', 'dist', { recursive: true });
fs.cpSync('apps/admin/dist', 'dist/admin', { recursive: true });
fs.cpSync('apps/delivery/dist', 'dist/delivery', { recursive: true });
console.log('? Assembled dist for Vercel deployment');

fs.writeFileSync('dist/serve.json', JSON.stringify({
  rewrites: [
    { source: '/admin/**', destination: '/admin/index.html' },
    { source: '/delivery/**', destination: '/delivery/index.html' },
    { source: '/**', destination: '/index.html' }
  ]
}, null, 2));
console.log('? Created serve.json for local SPA routing');
