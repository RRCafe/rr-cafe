import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Rename Sync Locations
content = content.replace("Sync Locations", "Sync")

# Add Suspend button functionality
toggle_func = """  const toggleSuspend = async (partner: DeliveryPartner) => {
    const newStatus = partner.status === 'suspend' ? 'offline' : 'suspend';
    await supabase
      .from('delivery_partners')
      .update({ status: newStatus })
      .eq('id', partner.id);
  };

  return ("""
content = content.replace("  return (", toggle_func)

# Add Suspend button to UI
ui_target = """                <div className="flex items-start gap-3">
                  <Bike className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Vehicle</p>
                    <p className="text-sm text-gray-800">{partner.vehicle_name ? `${partner.vehicle_name} (${partner.vehicle_number})` : 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>"""

ui_replacement = """                <div className="flex items-start gap-3">
                  <Bike className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Vehicle</p>
                    <p className="text-sm text-gray-800">{partner.vehicle_name ? `${partner.vehicle_name} (${partner.vehicle_number})` : 'Not provided'}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => toggleSuspend(partner)}
                  className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                    partner.status === 'suspend'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {partner.status === 'suspend' ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>"""

content = content.replace(ui_target, ui_replacement)

# Update badge logic
badge_target = """                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  partner.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>"""

badge_replacement = """                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  partner.status === 'suspend' ? 'bg-red-100 text-red-700' : partner.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>"""

content = content.replace(badge_target, badge_replacement)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
