import re

with open('apps/customer/src/pages/Cart.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

insert_target = """                    items_subtotal: subtotal,
                    delivery_fee: deliveryFee,
                    partner_commission: partnerCommission,
                  })
                  .select()"""
insert_replace = """                    items_subtotal: subtotal,
                    delivery_fee: deliveryFee,
                    partner_commission: partnerCommission,
                    owner_platform_fee: ownerPlatformFee,
                  })
                  .select()"""
content = content.replace(insert_target, insert_replace)

with open('apps/customer/src/pages/Cart.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
