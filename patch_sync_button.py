import re

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for sync button
state_target = """  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);"""
state_replace = """  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);"""
content = content.replace(state_target, state_replace)

# Modify triggerPing function
ping_target = """  const triggerPing = () => {
    const channel = supabase.channel('admin_pings');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'request_location',
          payload: {}
        });
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });
  };"""

ping_replace = """  const triggerPing = () => {
    setIsSyncing(true);
    const channel = supabase.channel('admin_pings');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'request_location',
          payload: {}
        });
        setTimeout(() => {
          supabase.removeChannel(channel);
          setIsSyncing(false);
          setSyncComplete(true);
          fetchPartners();
          setTimeout(() => setSyncComplete(false), 3000);
        }, 1000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setIsSyncing(false);
      }
    });
  };"""
content = content.replace(ping_target, ping_replace)

# Add Check icon to lucide imports
import_target = "import { Bike, User, RefreshCcw } from 'lucide-react';"
import_replace = "import { Bike, User, RefreshCcw, Check } from 'lucide-react';"
content = content.replace(import_target, import_replace)

# Modify Sync button UI
btn_target = """        <button
          onClick={triggerPing}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <RefreshCcw size={18} />
          Sync
        </button>"""

btn_replace = """        <button
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
        </button>"""
content = content.replace(btn_target, btn_replace)

with open('apps/admin/src/pages/DeliveryPartners.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
