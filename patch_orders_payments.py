import re

with open('apps/admin/src/pages/Orders.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Order interface
interface_patch = """  delivery_partner_id?: string;
  customer: { name: string; phone: string } | null;
  partner: { name: string; phone_number: string } | null;
  payments?: { razorpay_order_id: string, razorpay_payment_id: string, payment_method: string }[];
}"""
content = content.replace("  delivery_partner_id?: string;\n  customer: { name: string; phone: string } | null;\n  partner: { name: string; phone_number: string } | null;\n}", interface_patch)

# 2. Update fetchOrders select
select_patch = """        id, created_at, status, order_type, grand_total, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id,
        customer(name, phone),
        partner:delivery_partners(name, phone_number),
        payments(razorpay_order_id, razorpay_payment_id, payment_method)"""
content = content.replace("""        id, created_at, status, order_type, grand_total, source, delivery_address, delivery_lat, delivery_lng, delivery_partner_id,
        customer(name, phone),
        partner:delivery_partners(name, phone_number)""", select_patch)

# 3. Add to UI
ui_patch = """                {selectedOrder.order_type === 'delivery' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Delivery Partner</p>
                    <p className="font-medium">{selectedOrder.partner?.name || 'Not assigned yet'}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.partner?.phone_number}</p>
                  </div>
                )}
                {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Details</p>
                    <p className="font-medium capitalize">{selectedOrder.payments[0].payment_method.replace('_', ' ')}</p>
                    {selectedOrder.payments[0].razorpay_order_id && (
                      <p className="text-xs text-gray-600 mt-1 break-all">Order ID: {selectedOrder.payments[0].razorpay_order_id}</p>
                    )}
                    {selectedOrder.payments[0].razorpay_payment_id && (
                      <p className="text-xs text-gray-600 break-all">Payment ID: {selectedOrder.payments[0].razorpay_payment_id}</p>
                    )}
                  </div>
                )}
              </div>"""

content = content.replace("""                {selectedOrder.order_type === 'delivery' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Delivery Partner</p>
                    <p className="font-medium">{selectedOrder.partner?.name || 'Not assigned yet'}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.partner?.phone_number}</p>
                  </div>
                )}
              </div>""", ui_patch)

with open('apps/admin/src/pages/Orders.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
