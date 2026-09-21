const fs = require('fs');

let dpd = fs.readFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', 'utf8');

dpd = dpd.replace(/<p className="text-sm font-bold text-gray-900 truncate">\{partner\.license_number \|\| 'N\/A'\}<\/p>/, '<p className="text-sm font-bold text-gray-900 break-words">{partner.license_number || "N/A"}</p>');
dpd = dpd.replace(/<p className="text-sm font-bold text-gray-900 truncate">\{partner\.address \|\| 'N\/A'\}<\/p>/, '<p className="text-sm font-bold text-gray-900 break-words">{partner.address || "N/A"}</p>');

const newGrid = `
            {/* Grid Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Bike className="w-3 h-3" /> Vehicle</p>
                <p className="text-sm font-bold text-gray-900">\${partner.vehicle_name || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-0.5">\${partner.vehicle_number || 'No Plate'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Key className="w-3 h-3" /> License</p>
                <p className="text-sm font-bold text-gray-900 break-words">\${partner.license_number || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> DOB</p>
                <p className="text-sm font-bold text-gray-900">\${partner.dob || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Map className="w-3 h-3" /> Location</p>
                <p className="text-sm font-bold text-gray-900 break-words">\${partner.address || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Gender</p>
                <p className="text-sm font-bold text-gray-900 capitalize">\${partner.gender || 'N/A'}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Govt ID</p>
                <p className="text-sm font-bold text-gray-900">\${partner.aadhar_number || partner.govt_id_number || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 col-span-2">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">Bank Details</p>
                <p className="text-sm font-bold text-gray-900">\${partner.bank_account_number ? 'A/C: ' + partner.bank_account_number : 'N/A'}</p>
                \${partner.ifsc_code && <p className="text-xs text-gray-500 mt-0.5">IFSC: \${partner.ifsc_code}</p>}
              </div>
            </div>
`;
dpd = dpd.replace(/\{\/\* Grid Details \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Earnings Cards/, newGrid + '\n          </div>\n\n          {/* Earnings Cards');

dpd = dpd.replace(/<div key=\{order\.id\} className="border border-gray-100/g, '<Link to={`/?order_id=\\${order.id}`} key={order.id} className="block border border-gray-100');
dpd = dpd.replace(/<\/div>\s*<\/div>\s*\)\)}\s*<\/div>/, '      </Link>\n                ))}\n              </div>'); // Closing Link instead of div

fs.writeFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', dpd, 'utf8');
