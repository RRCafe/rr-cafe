const fs = require('fs');
let dpd = fs.readFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', 'utf8');
dpd = dpd.replace(/<Link to={`\/\?order_id=\\$\{order\.id\}`} key=\{order\.id\}/g, '<Link to={`/orders?order_id=\\${order.id}`} key={order.id}');
fs.writeFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', dpd, 'utf8');
