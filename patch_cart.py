import re

with open('apps/customer/src/pages/Cart.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ownerPlatformFee state
state_target = """  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [partnerCommission, setPartnerCommission] = useState<number>(0);"""
state_replace = """  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [partnerCommission, setPartnerCommission] = useState<number>(0);
  const [ownerPlatformFee, setOwnerPlatformFee] = useState<number>(0);"""
content = content.replace(state_target, state_replace)

# Update the set state block
calc_target = """          if (!error && data?.total_delivery_charge !== undefined) {
            setDeliveryFee(data.total_delivery_charge);
            setPartnerCommission(data.breakdown_internal?.base_delivery || 0);
            setIsCalculated(true);"""
calc_replace = """          if (!error && data?.total_delivery_charge !== undefined) {
            setDeliveryFee(data.total_delivery_charge);
            setPartnerCommission(data.breakdown_internal?.base_delivery || 0);
            setOwnerPlatformFee(data.breakdown_internal?.platform_fee || 0);
            setIsCalculated(true);"""
content = content.replace(calc_target, calc_replace)

# Update the order insert payload
insert_target = """                    items_subtotal: subtotal,
                    delivery_fee: deliveryFee,
                    partner_commission: partnerCommission,
                    calculated_distance_km: drivingDistanceKm || 0,"""
insert_replace = """                    items_subtotal: subtotal,
                    delivery_fee: deliveryFee,
                    owner_platform_fee: ownerPlatformFee,
                    partner_commission: partnerCommission,
                    calculated_distance_km: drivingDistanceKm || 0,"""
content = content.replace(insert_target, insert_replace)

with open('apps/customer/src/pages/Cart.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
