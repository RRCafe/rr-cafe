const fs = require('fs');
let text = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf-8');

const oldCode = `      const url = \`https://api.olamaps.io/routing/v1/distanceMatrix?origins=\${CAFE_LOC.lat},\${CAFE_LOC.lng}&destinations=\${pinLocation.lat},\${pinLocation.lng}&api_key=\${olaKey}\`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.rows && data.rows.length > 0 && data.rows[0].elements[0].status === "OK") {
        const distMeters = data.rows[0].elements[0].distance.value || 0;
        distKm = distMeters / 1000;
      } else {
        throw new Error("No route found in Ola Maps");
      }`;

const newCode = `      const url = \`https://api.olamaps.io/routing/v1/directions?origin=\${CAFE_LOC.lat},\${CAFE_LOC.lng}&destination=\${pinLocation.lat},\${pinLocation.lng}&api_key=\${olaKey}\`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const distMeters = data.routes[0].legs[0].distance || 0;
        distKm = distMeters / 1000;
      } else {
        throw new Error("No route found in Ola Maps");
      }`;

text = text.replace(oldCode, newCode);
fs.writeFileSync('apps/customer/src/pages/Cart.tsx', text, 'utf-8');
