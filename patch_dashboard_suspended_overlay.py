import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the overlay UI to the return
target = """  return (
    <div className="space-y-6">"""

replace = """  return (
    <div className="space-y-6 relative">
      {status === 'suspend' && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">âš ï¸</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
            <p className="text-gray-600 mb-6">
              Your delivery partner account has been suspended by the administrator. You cannot accept or deliver orders at this time.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the Cafe owner for more information.
            </p>
          </div>
        </div>
      )}"""

content = content.replace(target, replace)
# fix emoji encoding
content = content.replace("âš ï¸", "⚠️")

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
