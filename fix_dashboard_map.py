import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                          </a>
                        )}
                      </div>
                      
                      {order.status === 'out_for_delivery' ? ("""

replacement = """                          </a>
                        )}
                      </div>
                      
                      <LiveDeliveryMap 
                        status={order.status}
                        apiKey={mapKey || ''}
                        partnerLoc={currentLocation}
                        customerLat={order.delivery_lat}
                        customerLng={order.delivery_lng}
                      />
                      
                      {order.status === 'out_for_delivery' ? ("""

content = content.replace(target, replacement)

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
