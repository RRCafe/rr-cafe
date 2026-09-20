const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf8');

// select
code = code.replace(/select\('address, phone, latitude, longitude, distance'\)/, "select('address, phone, delivery_lat, delivery_lng, calculated_distance_km')");

// read
code = code.replace(/if \(data\.latitude && data\.longitude\)/, "if (data.delivery_lat && data.delivery_lng)");
code = code.replace(/const loc = \{ lat: data\.latitude, lng: data\.longitude \};/, "const loc = { lat: data.delivery_lat, lng: data.delivery_lng };");
code = code.replace(/if \(data\.distance !== null && data\.distance !== undefined\)/, "if (data.calculated_distance_km !== null && data.calculated_distance_km !== undefined)");
code = code.replace(/setInitialDistance\(data\.distance\);/g, "setInitialDistance(data.calculated_distance_km);");
code = code.replace(/setDrivingDistanceKm\(data\.distance\);/g, "setDrivingDistanceKm(data.calculated_distance_km);");
code = code.replace(/calculateFeeOnly\(data\.distance\);/g, "calculateFeeOnly(data.calculated_distance_km);");

// update
code = code.replace(/latitude: pinLocation\.lat,/, "delivery_lat: pinLocation.lat,");
code = code.replace(/longitude: pinLocation\.lng,/, "delivery_lng: pinLocation.lng,");
code = code.replace(/distance: distKm/, "calculated_distance_km: distKm");

fs.writeFileSync('apps/customer/src/pages/Cart.tsx', code, 'utf8');
