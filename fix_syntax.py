import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            {syncComplete ? (
              <><Check size={18} /> Synced</>
            ) : (
              <><RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}</>
            )}
          </button>
        </div>
      </div>
            <><Check size={18} /> Synced</>
          ) : (
            <><RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">"""

replace = """            {syncComplete ? (
              <><Check size={18} /> Synced</>
            ) : (
              <><RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">"""

content = content.replace(target, replace)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
