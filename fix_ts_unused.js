const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(/const \[initialPhone, setInitialPhone\] = useState\(''\);/, '');
code = code.replace(/const \[initialAddress, setInitialAddress\] = useState\(''\);/, '');
code = code.replace(/setInitialPhone\(data\.phone\);/, '');
code = code.replace(/setInitialAddress\(data\.address\);/, '');
code = code.replace(/setInitialPhone\(phoneNumber\);/, '');
code = code.replace(/setInitialAddress\(deliveryAddress\);/, '');
code = code.replace(/Store, ShoppingBag, Truck, Navigation, MapPin/g, 'Store, ShoppingBag, Truck, Navigation');

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
