const fs = require('fs');
let text = fs.readFileSync('apps/admin/src/pages/Settings.tsx', 'utf-8');
text = text.replace("      </form>\n    </div>\n  );\n}", `      </form>\n      <ConfirmModal\n        isOpen={modalConfig.isOpen}\n        title={modalConfig.title}\n        message={modalConfig.message}\n        confirmText="OK"\n        hideCancel={true}\n        isDestructive={modalConfig.isError}\n        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}\n        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}\n      />\n    </div>\n  );\n}`);
fs.writeFileSync('apps/admin/src/pages/Settings.tsx', text);
