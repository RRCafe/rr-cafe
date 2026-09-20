import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's see the current broken content around the button
broken_part = """    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Delivery Partners</h2>
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {syncComplete ? (
            <><Check size={18} /> Synced</>
          ) : (
            <><RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}</>
          )}
        </button>
      </div>"""

fix_part = """  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Delivery Partners</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMapModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-green-500 hover:bg-green-600 text-white"
          >
            Show Location
          </button>
          <button
            onClick={triggerPing}
            disabled={isSyncing || syncComplete}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              syncComplete 
                ? 'bg-green-500 text-white cursor-default' 
                : isSyncing 
                  ? 'bg-blue-400 text-white cursor-wait' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {syncComplete ? (
              <><Check size={18} /> Synced</>
            ) : (
              <><RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}</>
            )}
          </button>
        </div>
      </div>"""

# Wait, let's use a regex to replace everything from "return (" up to {syncComplete ? (
content = re.sub(r'return \(\s*<div className="p-6">.*?\{syncComplete \? \(', fix_part.replace("""          >\n            {syncComplete ? (""", """          >\n            {syncComplete ? ("""), content, flags=re.DOTALL)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
