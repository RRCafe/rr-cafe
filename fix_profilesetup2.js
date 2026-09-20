const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/ProfileSetup.tsx', 'utf8');

if (!code.includes('ConfirmModal')) {
    code = code.replace(/import { MapPin, Phone } from 'lucide-react';/, "import { MapPin, Phone } from 'lucide-react';\nimport { ConfirmModal } from '../components/ConfirmModal';");
    code = code.replace(/const \[loading, setLoading\] = useState\(false\);/, "const [loading, setLoading] = useState(false);\n  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });\n  const showAlert = (title: string, message: string) => setModalConfig({ isOpen: true, title, message });");
    code = code.replace(/alert\("Please enter a valid phone number."\);/, 'showAlert("Required", "Please enter a valid phone number.");');
    
    const modalCode = `      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText="OK"
        hideCancel={true}
        isDestructive={true}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>`;
    code = code.replace(/<\/div>\n    <\/div>/, `</div>\n${modalCode}`);
}

fs.writeFileSync('apps/customer/src/pages/ProfileSetup.tsx', code, 'utf8');
