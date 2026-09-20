const fs = require('fs');

// Settings.tsx
let settings = fs.readFileSync('apps/admin/src/pages/Settings.tsx', 'utf-8');
if (!settings.includes('<ConfirmModal')) {
    settings = settings.replace(/<\/form>\s*<\/div>\s*\);\s*\}/, `      </form>\n      <ConfirmModal\n        isOpen={modalConfig.isOpen}\n        title={modalConfig.title}\n        message={modalConfig.message}\n        confirmText="OK"\n        hideCancel={true}\n        isDestructive={modalConfig.isError}\n        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}\n        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}\n      />\n    </div>\n  );\n}`);
    fs.writeFileSync('apps/admin/src/pages/Settings.tsx', settings);
}

// MenuManager.tsx
let menu = fs.readFileSync('apps/admin/src/pages/MenuManager.tsx', 'utf-8');
if (!menu.includes('<ConfirmModal')) {
    menu = menu.replace(/<\/div>\s*\);\s*\}/, `      <ConfirmModal\n        isOpen={modalConfig.isOpen}\n        title={modalConfig.title}\n        message={modalConfig.message}\n        confirmText="OK"\n        hideCancel={true}\n        isDestructive={modalConfig.isError}\n        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}\n        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}\n      />\n    </div>\n  );\n}`);
    fs.writeFileSync('apps/admin/src/pages/MenuManager.tsx', menu);
}

// DeliveryPartnerDetails.tsx
let details = fs.readFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', 'utf-8');
details = details.replace(/import \{.*?Bike.*?\} from 'lucide-react';/, "import { Search, MapPin, X, ExternalLink } from 'lucide-react';");
fs.writeFileSync('apps/admin/src/pages/DeliveryPartnerDetails.tsx', details);
