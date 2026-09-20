const fs = require('fs');
let text = fs.readFileSync('apps/admin/src/pages/Login.tsx', 'utf-8');

const oldLogic = /if \(user\) \{\s*if \(isOwner\) \{\s*return <Navigate to="\/" replace \/>;\s*\} else \{\s*return \(\s*<div.*?Unauthorized Access.*?<\/div>\s*\);\s*\}\s*\}/s;

const newLogic = `if (user) {
    if (isOwner) {
      return <Navigate to="/" replace />;
    } else {
      // Force sign out immediately if they have a session but aren't an owner
      // This prevents them from being stuck in a redirect loop and removes their session
      supabase.auth.signOut();
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
          <h2 className="text-2xl font-bold text-red-600">Unauthorized Access</h2>
          <p>You do not have administrator privileges for this application.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Return to Login</button>
        </div>
      );
    }
  }`;

text = text.replace(oldLogic, newLogic);
fs.writeFileSync('apps/admin/src/pages/Login.tsx', text);
