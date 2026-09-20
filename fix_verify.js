const fs = require('fs');
let code = fs.readFileSync('supabase/functions/verify-razorpay-payment/index.ts', 'utf8');

const newFetch = `
    const rzpResponse = await fetch(\`https://api.razorpay.com/v1/orders/\${razorpay_order_id}\`, {
      headers: { 'Authorization': \`Basic \${auth}\` }
    });
    
    if (!rzpResponse.ok) {
      const errText = await rzpResponse.text();
      throw new Error("Razorpay API Error: " + errText);
    }

    const rzpOrderData = await rzpResponse.json();
    
    if (rzpOrderData.receipt !== system_order_id) {
      throw new Error(\`Order ID mismatch. Expected \${system_order_id}, got \${rzpOrderData.receipt}\`);
    }
`;

code = code.replace(/const rzpResponse = await fetch\(`https:\/\/api\.razorpay\.com\/v1\/orders\/\$\{razorpay_order_id\}`.*if \(rzpOrderData\.receipt !== system_order_id\) \{\n\s*throw new Error\("Order ID mismatch\. Malicious request detected\."\);\n\s*\}/s, newFetch);

fs.writeFileSync('supabase/functions/verify-razorpay-payment/index.ts', code, 'utf8');
