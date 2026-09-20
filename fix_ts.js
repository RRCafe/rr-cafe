const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

code = code.replace(/function calculateHaversineDistance\(lat1, lon1, lat2, lon2\) {/, 'function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {');
code = code.replace(/const showAlert = \(title, message, isError = true\) =>/, 'const showAlert = (title: string, message: string, isError = true) =>');
code = code.replace(/const \[drivingDistanceKm, setDrivingDistanceKm\] = useState\(null\);/, 'const [drivingDistanceKm, setDrivingDistanceKm] = useState<number | null>(null);');
code = code.replace(/const \[deliveryData, setDeliveryData\] = useState\(null\);/, 'const [deliveryData, setDeliveryData] = useState<any>(null);');
code = code.replace(/handler: async function \(response\)/, 'handler: async function (response: any)');
code = code.replace(/new window\.Razorpay/, 'new (window as any).Razorpay');
code = code.replace(/\} catch \(err\) \{/g, '} catch (err: any) {');

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
