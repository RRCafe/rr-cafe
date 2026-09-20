import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix unused imports
content = content.replace("import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap }", "import { APIProvider, Map, AdvancedMarker, InfoWindow }")
content = content.replace("import { MapPin, X } from 'lucide-react';\n", "import { X } from 'lucide-react';\n")
# Actually, I used MapPin in the button: <MapPin size={18} /> ! Oh wait, maybe it was already imported, so there was a duplicate. 
# Let me just remove my `import { MapPin, X } from 'lucide-react';` entirely and inject X to the existing lucide import.
content = content.replace("import { X } from 'lucide-react';\n", "")
content = content.replace("import { Bike, User, RefreshCcw, Check } from 'lucide-react';", "import { Bike, User, RefreshCcw, Check, X, MapPin } from 'lucide-react';")

# Fix window.google
target_dist = """  useEffect(() => {
    if (!partner.current_lat || !partner.current_lng || !window.google) return;
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [shopLoc],
      destinations: [{ lat: partner.current_lat, lng: partner.current_lng }],
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (response, status) => {"""

replace_dist = """  useEffect(() => {
    const w = window as any;
    if (!partner.current_lat || !partner.current_lng || !w.google) return;
    const service = new w.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [shopLoc],
      destinations: [{ lat: partner.current_lat, lng: partner.current_lng }],
      travelMode: w.google.maps.TravelMode.DRIVING,
    }, (response: any, status: any) => {"""

content = content.replace(target_dist, replace_dist)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
