import re

with open('apps/admin/src/components/DirectionsRoute.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace google types with any
content = content.replace("useState<google.maps.DirectionsService>()", "useState<any>()")
content = content.replace("useState<google.maps.DirectionsRenderer>()", "useState<any>()")
content = content.replace("travelMode as google.maps.TravelMode || google.maps.TravelMode.DRIVING", "travelMode || 'DRIVING'")
content = content.replace("then(response =>", "then((response: any) =>")
content = content.replace("catch(e =>", "catch((e: any) =>")

with open('apps/admin/src/components/DirectionsRoute.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the incorrectly placed toggleSuspend (the first one)
bad_code = """    const toggleSuspend = async (partner: DeliveryPartner) => {
    const newStatus = partner.status === 'suspend' ? 'offline' : 'suspend';
    await supabase
      .from('delivery_partners')
      .update({ status: newStatus })
      .eq('id', partner.id);
  };

  return () => {"""

content = content.replace(bad_code, "    return () => {")

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
