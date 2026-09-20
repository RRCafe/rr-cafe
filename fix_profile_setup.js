const fs = require('fs');
let code = fs.readFileSync('apps/customer/src/pages/ProfileSetup.tsx', 'utf8');

const regexCheck = `
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      alert("Please enter a valid phone number.");
      return;
    }
`;

code = code.replace(/const handleSave = async \(e: React.FormEvent\) => \{\n    e\.preventDefault\(\);\n    if \(\!user\) return;/, 
`const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\\D/g, ''))) {
      alert("Please enter a valid phone number.");
      return;
    }
`);

fs.writeFileSync('apps/customer/src/pages/ProfileSetup.tsx', code, 'utf8');
