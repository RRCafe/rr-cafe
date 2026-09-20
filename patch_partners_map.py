import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Map UX fixes
old_map = """                <Map 
                  defaultCenter={{ lat: 8.395596, lng: 78.052598 }} 
                  zoom={13} 
                  gestureHandling={'auto'} 
                  disableDefaultUI={false} 
                  zoomControl={true}
                  fullscreenControl={true}
                  mapTypeControl={false}
                  streetViewControl={false}
                  mapId="admin-partners-map"
                >"""

new_map = """                <Map 
                  defaultCenter={{ lat: 8.395596, lng: 78.052598 }} 
                  zoom={13} 
                  gestureHandling={'greedy'} 
                  disableDefaultUI={true} 
                  mapId="admin-partners-map"
                >"""

content = content.replace(old_map, new_map)


# 2. DistanceCalculator fix
old_calc = """function DistanceCalculator({ 
  partner, 
  shopLoc 
}: { 
  partner: DeliveryPartner; 
  shopLoc: { lat: number, lng: number } 
}) {
  const [distText, setDistText] = useState('Calculating...');
  
  useEffect(() => {
    const w = window as any;
    if (!partner.current_lat || !partner.current_lng || !w.google) return;
    const service = new w.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [shopLoc],
      destinations: [{ lat: partner.current_lat, lng: partner.current_lng }],
      travelMode: w.google.maps.TravelMode.DRIVING,
    }, (response: any, status: any) => {
      if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
        setDistText(response.rows[0].elements[0].distance.text);
      } else {
        setDistText('Unavailable');
      }
    });
  }, [partner.current_lat, partner.current_lng, shopLoc]);

  return <span className="font-semibold text-blue-700">{distText} away</span>;
}"""

new_calc = """function DistanceCalculator({ 
  partner, 
  shopLoc 
}: { 
  partner: DeliveryPartner; 
  shopLoc: { lat: number, lng: number } 
}) {
  const [distText, setDistText] = useState('Calculating...');
  const olaApiKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
  
  useEffect(() => {
    let active = true;
    const fetchDist = async () => {
      if (!partner.current_lat || !partner.current_lng) return;
      if (!olaApiKey) {
        setDistText('No API Key');
        return;
      }
      try {
        const response = await fetch(
          `https://api.olamaps.io/routing/v1/directions?origin=${shopLoc.lat},${shopLoc.lng}&destination=${partner.current_lat},${partner.current_lng}&api_key=${olaApiKey}`,
          { method: 'POST' }
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0 && active) {
          const route = data.routes[0];
          const distKm = (route.legs[0].distance / 1000).toFixed(1);
          const durationMin = Math.ceil(route.legs[0].duration / 60);
          setDistText(`${distKm} km, ~${durationMin} min`);
        } else if (active) {
          setDistText('Unavailable');
        }
      } catch (err) {
        if (active) setDistText('Unavailable');
      }
    };
    fetchDist();
    return () => { active = false; };
  }, [partner.current_lat, partner.current_lng, shopLoc, olaApiKey]);

  return <span className="font-semibold text-blue-700">{distText}</span>;
}"""

content = content.replace(old_calc, new_calc)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
