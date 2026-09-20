import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface PricingConfig {
  id: string;
  base_delivery_fee: number;
  per_km_rate: number;
  free_delivery_threshold: number;
  platform_fee_type: 'flat' | 'percentage';
  platform_fee_value: number;
}

export default function Settings() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', isError: false });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pricing_config').select('*').single();
    if (!error && data) {
      setConfig(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    

    const { error } = await supabase
      .from('pricing_config')
      .update({
        base_delivery_fee: config.base_delivery_fee,
        per_km_rate: config.per_km_rate,
        free_delivery_threshold: config.free_delivery_threshold,
        platform_fee_type: config.platform_fee_type,
        platform_fee_value: config.platform_fee_value,
      })
      .eq('id', config.id);

    if (error) {
      setModalConfig({ isOpen: true, title: 'Error', message: 'Error saving settings.', isError: true });
    } else {
      setModalConfig({ isOpen: true, title: 'Success', message: 'Settings saved successfully!', isError: false });
    }
    setSaving(false);
    
    
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading settings...</div>;
  }

  if (!config) {
    return <div className="p-6 text-red-500">Error loading settings.</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Pricing Settings</h2>
      
      

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Delivery Fees</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Delivery Fee (₹)</label>
              <input
                type="number"
                value={config.base_delivery_fee}
                onChange={e => setConfig({ ...config, base_delivery_fee: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per KM Rate (₹)</label>
              <input
                type="number"
                value={config.per_km_rate}
                onChange={e => setConfig({ ...config, per_km_rate: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Free Delivery Threshold (₹)</label>
              <input
                type="number"
                value={config.free_delivery_threshold}
                onChange={e => setConfig({ ...config, free_delivery_threshold: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
              <p className="mt-1 text-xs text-gray-500">Orders above this amount get free delivery.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Platform Fees</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee Type</label>
              <select
                value={config.platform_fee_type}
                onChange={e => setConfig({ ...config, platform_fee_type: e.target.value as 'flat' | 'percentage' })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="flat">Flat Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform Fee Value {config.platform_fee_type === 'flat' ? '(₹)' : '(%)'}
              </label>
              <input
                type="number"
                value={config.platform_fee_value}
                onChange={e => setConfig({ ...config, platform_fee_value: Number(e.target.value) })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

            </form>
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText="OK"
        hideCancel={true}
        isDestructive={modalConfig.isError}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
