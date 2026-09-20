import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  // Read-only
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [license, setLicense] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('delivery_partners').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setPhone(data.phone_number || '');
        setAddress(data.address || '');
        setVehicleName(data.vehicle_name || '');
        setVehicleNumber(data.vehicle_number || '');
        
        setName(data.name || '');
        setDob(data.dob || '');
        setGender(data.gender || '');
        setLicense(data.license_number || '');
        setEmail(data.email || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const vRegex = /^[A-Z]{2}\s?[0-9]{1,3}\s?[A-Z]{1,2}\s?[0-9]{1,4}$/i;
    if (!vRegex.test(vehicleNumber)) {
      setError('Invalid vehicle number format. Expected format: TN 69 AA 1234');
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase.from('delivery_partners').update({
      phone_number: phone,
      address,
      vehicle_name: vehicleName,
      vehicle_number: vehicleNumber
    }).eq('id', user.id);

    if (updateError) {
      setError('Failed to update profile.');
    } else {
      setSuccess('Profile updated successfully!');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center p-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Account Profile</h2>
      </div>

      <div className="p-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">{success}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Aadhaar E-KYC Details (Read-only)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">{name}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Gender</label>
                <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">{gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">DOB</label>
                <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">{dob}</div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">License Number</label>
                <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">{license}</div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm">{email}</div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Editable Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model</label>
                <input type="text" value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none uppercase" required />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 text-white font-medium py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
