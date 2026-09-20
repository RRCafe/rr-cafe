const fs = require('fs');
let text = fs.readFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', 'utf-8');

const avatarOld = /<div className="flex items-center gap-4">[\s\S]*?<div>\s*<h2 className="text-xl font-bold">\{partner\.name \|\| 'Unnamed Partner'\}<\/h2>\s*<p className="text-gray-500">\{partner\.phone_number \|\| 'No phone number'\}<\/p>\s*<div className="mt-2 inline-flex items-center gap-1 text-sm bg-gray-100 px-3 py-1 rounded-full">\s*<Bike size=\{16\} className="text-gray-600" \/>\s*<span className="font-medium text-gray-700">\{partner\.vehicle_number\}<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/;

const avatarNew = `<div className="flex items-center gap-4">
            {partner.avatar_url || partner.image_url ? (
              <img src={partner.avatar_url || partner.image_url} alt={partner.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                {partner.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{partner.name || 'Unnamed Partner'}</h2>
              <div className="mt-1 text-sm text-gray-600 space-y-1">
                <p>Phone: {partner.phone_number || 'N/A'} | Email: {partner.email || 'N/A'}</p>
                <p>DOB: {partner.dob || 'N/A'} | Gender: {partner.gender || 'N/A'}</p>
                <p>Address: {partner.address || 'N/A'}</p>
                <p>Vehicle: {partner.vehicle_name || 'N/A'} ({partner.vehicle_number || 'N/A'}) | License: {partner.license_number || 'N/A'}</p>
              </div>
            </div>
          </div>`;

text = text.replace(avatarOld, avatarNew);

const badgeOld = /<div className=\{`px-4 py-1\.5 rounded-full text-sm font-bold uppercase tracking-wider \$\{\s*partner\.status === 'online' \? 'bg-green-100 text-green-700' :\s*partner\.status === 'suspend' \? 'bg-red-100 text-red-700' :\s*'bg-gray-100 text-gray-700'\s*\}`\}>\s*\{partner\.status\}\s*<\/div>/;

const badgeNew = `<div className="text-right">
            <div className={\`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-2 inline-block \${
              partner.status === 'online' ? 'bg-green-100 text-green-700' :
              partner.status === 'suspend' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }\`}>
              {partner.status}
            </div>
            {partner.last_location_update && (
              <div className="text-xs text-gray-500 font-medium">
                Last seen: {new Date(partner.last_location_update).toLocaleString()}
              </div>
            )}
          </div>`;

text = text.replace(badgeOld, badgeNew);
fs.writeFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', text);
