const fs = require('fs');

const fixEncoding = (file) => {
  let text = fs.readFileSync(file, 'utf8');
  // Match dYYc and dYY\uFFFD or dYY? or any dYY followed by a character
  text = text.replace(/dYY./g, (match) => {
    if (match.includes('c')) return '\uD83D\uDFE9';
    return '\uD83D\uDFE5';
  });
  text = text.replace(/,1/g, '\u20B9'); // ,1 is ₹
  // Fix the literal '?{' in price blocks to be '₹{'
  text = text.replace(/\?\{item\.price/g, '\u20B9{item.price');
  text = text.replace(/\?\{total/g, '\u20B9{total');
  
  fs.writeFileSync(file, text, 'utf8');
};

['apps/admin/src/pages/Billing.tsx', 'apps/admin/src/pages/MenuManager.tsx', 'apps/admin/src/pages/Orders.tsx', 'apps/admin/src/pages/LiveOrders.tsx', 'apps/admin/src/pages/DeliveryPartnerDetails.tsx'].forEach(f => {
  try { fixEncoding(f); } catch (e) {}
});

// Fix DashboardLayout gap
let dash = fs.readFileSync('apps/admin/src/layouts/DashboardLayout.tsx', 'utf8');
dash = dash.replace(/h-screen/g, 'h-[100dvh]');
dash = dash.replace(/safe-area-bottom/g, '');
fs.writeFileSync('apps/admin/src/layouts/DashboardLayout.tsx', dash, 'utf8');

// Fix MenuManager
let menu = fs.readFileSync('apps/admin/src/pages/MenuManager.tsx', 'utf8');
// Change business types
menu = menu.replace(/const BUSINESS_TYPES = \['cafe', 'restaurant', 'bakery', 'sweets'\];/, "const BUSINESS_TYPES = ['cafe', 'ice cream'];");
fs.writeFileSync('apps/admin/src/pages/MenuManager.tsx', menu, 'utf8');

// Fix DeliveryPartners
let dp = fs.readFileSync('apps/admin/src/pages/DeliveryPartners.tsx', 'utf8');
dp = dp.replace(
  /<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">/,
  '<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 bg-transparent">'
);
dp = dp.replace(
  /<h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Delivery Partners<\/h1>/,
  '<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1"><h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Delivery Partners</h1></div>'
);
dp = dp.replace(/bg-gray-50\/50 border-y/g, 'bg-white border-y');
fs.writeFileSync('apps/admin/src/pages/DeliveryPartners.tsx', dp, 'utf8');

// Billing.tsx fixes requested by user
let b = fs.readFileSync('apps/admin/src/pages/Billing.tsx', 'utf8');
b = b.replace(/<h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">New Order<\/h2>/, '<h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Billing</h2>');
b = b.replace(/{cart\.length === 0 \? 'Add Items to Bill' : 'Complete Order'}/, "{cart.length === 0 ? 'Add Items to Bill' : 'Checkout'}");
b = b.replace(/bg-gray-900 text-white/g, 'bg-white text-gray-900 border border-gray-100'); // total block
b = b.replace(/<p className="text-gray-400 font-medium text-sm mb-1">Grand Total/g, '<p className="text-gray-500 font-medium text-sm mb-1">Grand Total');
// search dropdown fix overflow -> z-index and remove overflow-hidden on parent
b = b.replace(/bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden/, 'bg-white rounded-2xl shadow-sm border border-gray-100');
fs.writeFileSync('apps/admin/src/pages/Billing.tsx', b, 'utf8');
