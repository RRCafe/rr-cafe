const fs = require('fs');

// Fix Settings.tsx
let settings = fs.readFileSync('apps/admin/src/pages/Settings.tsx', 'utf-8');
if (!settings.includes('<ConfirmModal')) {
    settings = settings.replace('</form>\n    </div>', `</form>\n      <ConfirmModal\n        isOpen={modalConfig.isOpen}\n        title={modalConfig.title}\n        message={modalConfig.message}\n        confirmText="OK"\n        hideCancel={true}\n        isDestructive={modalConfig.isError}\n        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}\n        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}\n      />\n    </div>`);
    fs.writeFileSync('apps/admin/src/pages/Settings.tsx', settings);
}

// Fix MenuManager.tsx
let menu = fs.readFileSync('apps/admin/src/pages/MenuManager.tsx', 'utf-8');
if (!menu.includes('<ConfirmModal')) {
    menu = menu.replace('</div>\n  );\n}', `      <ConfirmModal\n        isOpen={modalConfig.isOpen}\n        title={modalConfig.title}\n        message={modalConfig.message}\n        confirmText="OK"\n        hideCancel={true}\n        isDestructive={modalConfig.isError}\n        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}\n        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}\n      />\n    </div>\n  );\n}`);
    fs.writeFileSync('apps/admin/src/pages/MenuManager.tsx', menu);
}

// Fix DeliveryPartnerDetails.tsx unused Bike
let details = fs.readFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', 'utf-8');
details = details.replace("import { Search, MapPin, X, ExternalLink, Bike } from 'lucide-react';", "import { Search, MapPin, X, ExternalLink } from 'lucide-react';");
fs.writeFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', details);
