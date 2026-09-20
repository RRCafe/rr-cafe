import { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface Props {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

export function DirectionsRoute({ origin, destination }: Props) {
  const map = useMap();
  const geometryLib = useMapsLibrary('geometry');
  const [polyline, setPolyline] = useState<any>(null);

  useEffect(() => {
    if (!map || !geometryLib) return;

    let isActive = true;
    let currentPolyline = polyline;

    const fetchRoute = async () => {
      const olaApiKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
      if (!olaApiKey) {
        console.warn('VITE_OLA_MAPS_API_KEY is missing. Drawing straight line fallback.');
        drawStraightLine();
        return;
      }

      try {
        const response = await fetch(
          `https://api.olamaps.io/routing/v1/directions?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&api_key=${olaApiKey}`,
          {
            method: 'POST',
            headers: { 'X-Request-Id': crypto.randomUUID() }
          }
        );
        const data = await response.json();

        if (isActive && data.routes && data.routes.length > 0) {
          const encodedPolyline = data.routes[0].overview_polyline;
          // Decode using Google Maps geometry library
          const path = geometryLib.encoding.decodePath(encodedPolyline);
          
          if (currentPolyline) {
            currentPolyline.setMap(null);
          }

          currentPolyline = new (window as any).google.maps.Polyline({
            path: path,
            strokeColor: '#3b82f6', // blue-500
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map: map
          });
          setPolyline(currentPolyline);
        }
      } catch (error) {
        console.error('Ola Maps Routing failed, drawing straight line', error);
        if (isActive) drawStraightLine();
      }
    };

    const drawStraightLine = () => {
      if (currentPolyline) {
        currentPolyline.setMap(null);
      }
      currentPolyline = new (window as any).google.maps.Polyline({
        path: [origin, destination],
        strokeColor: '#94a3b8', // slate-400
        strokeOpacity: 0.8,
        strokeWeight: 4,
        geodesic: true,
        map: map
      });
      setPolyline(currentPolyline);
    };

    fetchRoute();

    return () => {
      isActive = false;
      if (currentPolyline) {
        currentPolyline.setMap(null);
      }
    };
  }, [map, geometryLib, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}
