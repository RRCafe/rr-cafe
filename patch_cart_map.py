import re

with open('apps/customer/src/pages/Cart.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';",
                          "import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';")

# 2. Add MapEffect component at the top (before calculateHaversineDistance)
map_effect_comp = """function MapEffect({ mapCenter }: { mapCenter: {lat: number, lng: number} }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.panTo(mapCenter);
  }, [map, mapCenter]);
  return null;
}

// Fallback straight-line distance if Google Maps API fails"""

content = content.replace("// Fallback straight-line distance if Google Maps API fails", map_effect_comp)

# 3. Replace <Map> usage
old_map = """                    <Map
                      mapId="DEMO_MAP_ID"
                      defaultZoom={15}
                      center={mapCenter}
                      onCenterChanged={(ev: any) => !isCalculated && setMapCenter(ev.detail.center)}
                      onClick={(ev: any) => !isCalculated && setPinLocation(ev.detail.latLng)}
                      gestureHandling={isCalculated ? 'none' : 'greedy'}
                      disableDefaultUI={true}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <AdvancedMarker
                        position={pinLocation}
                        draggable={!isCalculated}
                        onDragEnd={(ev: any) =>
                          setPinLocation({ lat: ev.latLng.lat(), lng: ev.latLng.lng() })
                        }
                      />
                    </Map>"""

new_map = """                    <Map
                      mapId="DEMO_MAP_ID"
                      defaultZoom={15}
                      defaultCenter={mapCenter}
                      onClick={(ev: any) => !isCalculated && setPinLocation(ev.detail.latLng)}
                      gestureHandling={isCalculated ? 'none' : 'greedy'}
                      disableDefaultUI={true}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <MapEffect mapCenter={mapCenter} />
                      <AdvancedMarker
                        position={pinLocation}
                        draggable={!isCalculated}
                        onDragEnd={(ev: any) =>
                          setPinLocation({ lat: ev.latLng.lat(), lng: ev.latLng.lng() })
                        }
                      />
                    </Map>"""

content = content.replace(old_map, new_map)

with open('apps/customer/src/pages/Cart.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
