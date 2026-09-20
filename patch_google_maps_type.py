import re

with open('apps/admin/src/components/DirectionsRoute.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("new google.maps.Polyline", "new (window as any).google.maps.Polyline")

with open('apps/admin/src/components/DirectionsRoute.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
