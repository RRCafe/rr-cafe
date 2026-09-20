const fs = require('fs');
let text = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf-8');

// The corrupt symbol is literally the bytes for ?, 1 or similar. We can just replace based on the surrounding known text.
text = text.replace(/<div className="text-gray-500 text-sm">[^<]*\{c\.item\.price\}/g, '<div className="text-gray-500 text-sm">?{c.item.price}');
text = text.replace(/<span className="font-medium">[^<]*\{subtotal\.toFixed\(2\)\}/g, '<span className="font-medium">?{subtotal.toFixed(2)}');
text = text.replace(/\{deliveryData \? `[^$]*\$\{deliveryData\.total_delivery_charge\?\.toFixed\(2\)\}` : 'Calculated next'\}/g, '{deliveryData ? `?${deliveryData.total_delivery_charge?.toFixed(2)}` : \'Calculated next\'}');
text = text.replace(/<span>[^<]*\{\(subtotal \+ \(orderType === 'delivery' \? \(deliveryData\?\.total_delivery_charge \|\| 0\) : 0\)\)\.toFixed\(2\)\}<\/span>/g, '<span>?{(subtotal + (orderType === \'delivery\' ? (deliveryData?.total_delivery_charge || 0) : 0)).toFixed(2)}</span>');

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', text, 'utf-8');
