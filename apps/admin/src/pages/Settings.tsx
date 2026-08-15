import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase.from('pricing_config').select('*').single();
    if (!error && data) setConfig(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (config?.id) {
      await supabase.from('pricing_config').update({
        base_delivery_fee: config.base_delivery_fee,
        per_km_rate: config.per_km_rate,
        platform_fee_type: config.platform_fee_type,
        platform_fee_value: config.platform_fee_value,
        free_delivery_threshold: config.free_delivery_threshold
      }).eq('id', config.id);
    }
    setSaving(false);
    alert('Settings saved!');
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Settings & Pricing Config</h2>
      
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Delivery Fees</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Base Delivery Fee (?)</label>
              <input 
                type="number" step="0.01" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={config?.base_delivery_fee || 0}
                onChange={e => setConfig({...config, base_delivery_fee: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Per KM Rate (?)</label>
              <input 
                type="number" step="0.01" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={config?.per_km_rate || 0}
                onChange={e => setConfig({...config, per_km_rate: parseFloat(e.target.value)})}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Free Delivery Threshold (?)</label>
              <input 
                type="number" step="0.01" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={config?.free_delivery_threshold || 0}
                onChange={e => setConfig({...config, free_delivery_threshold: parseFloat(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Owner Platform Fee Margin</h3>
          <p className="text-sm text-gray-500 mb-4">This fee is secretly added to the customer's delivery charge.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fee Type</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={config?.platform_fee_type || 'flat'}
                onChange={e => setConfig({...config, platform_fee_type: e.target.value})}
              >
                <option value="flat">Flat Charge (?)</option>
                <option value="percentage">Percentage of Subtotal (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fee Value</label>
              <input 
                type="number" step="0.01" required
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={config?.platform_fee_value || 0}
                onChange={e => setConfig({...config, platform_fee_value: parseFloat(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={20} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
