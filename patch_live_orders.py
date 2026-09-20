import re

with open('apps/admin/src/pages/LiveOrders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Order Interface
content = content.replace("    order_items: any[];\n  }", "    order_items: any[];\n    delivery_partner_id?: string;\n  }")

# Add Partner Assigned badge
badge_code = """        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
            {order.order_type.replace('_', ' ')}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
            {order.business_type}
          </span>
          {order.delivery_partner_id && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
              Partner Assigned
            </span>
          )}
        </div>"""

content = content.replace("""        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
            {order.order_type.replace('_', ' ')}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
            {order.business_type}
          </span>
        </div>""", badge_code)


with open('apps/admin/src/pages/LiveOrders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
