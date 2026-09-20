const fs = require('fs');
let text = fs.readFileSync('apps/customer/src/pages/Cart.tsx', 'utf-8');

const oldDist = /try \{\s*\/\/ Use DirectionsService for real road distance\s*const googleMaps = \(window as any\)\.google\.maps;\s*const directionsService = new googleMaps\.DirectionsService\(\);\s*const result = await directionsService\.route\(\{\s*origin: CAFE_LOC,\s*destination: pinLocation,\s*travelMode: googleMaps\.TravelMode\.TWO_WHEELER \|\| googleMaps\.TravelMode\.DRIVING\s*\}\);\s*if \(result\.routes && result\.routes\.length > 0\) \{\s*const distMeters = result\.routes\[0\]\.legs\[0\]\.distance\?\.value \|\| 0;\s*distKm = distMeters \/ 1000;\s*\} else \{\s*throw new Error\("No route found"\);\s*\}\s*\} catch \(err\) \{\s*console\.warn\("Directions API failed, using Haversine distance", err\);\s*distKm = calculateHaversineDistance\(CAFE_LOC\.lat, CAFE_LOC\.lng, pinLocation\.lat, pinLocation\.lng\);\s*\/\/ Rough multiplier for road vs straight-line\s*distKm = distKm \* 1\.3;\s*\}/;

const newDist = `try {
      // Use Ola Maps Distance Matrix for routing distance
      const olaKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
      const url = \`https://api.olamaps.io/routing/v1/distanceMatrix?origins=\${CAFE_LOC.lat},\${CAFE_LOC.lng}&destinations=\${pinLocation.lat},\${pinLocation.lng}&api_key=\${olaKey}\`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.rows && data.rows.length > 0 && data.rows[0].elements[0].status === "OK") {
        const distMeters = data.rows[0].elements[0].distance.value || 0;
        distKm = distMeters / 1000;
      } else {
        throw new Error("No route found in Ola Maps");
      }
    } catch (err) {
      console.warn("Ola Maps Distance Matrix failed, using Haversine distance", err);
      distKm = calculateHaversineDistance(CAFE_LOC.lat, CAFE_LOC.lng, pinLocation.lat, pinLocation.lng);
      distKm = distKm * 1.3;
    }`;

text = text.replace(oldDist, newDist);
fs.writeFileSync('apps/customer/src/pages/Cart.tsx', text);
