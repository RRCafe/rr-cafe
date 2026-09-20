import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPin, Phone } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showAlert = (title: string, message: string) => setModalConfig({ isOpen: true, title, message });

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.from('customer').select('phone, address').eq('id', user?.id).maybeSingle();
      if (data) {
        if (data.phone) setPhone(data.phone);
        if (data.address) setAddress(data.address);
      }
    };
    if (user) loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      showAlert("Required", "Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    const name = user?.user_metadata?.full_name || '';
    const { error } = await supabase.from('customer').upsert({ id: user.id, phone, address, name });
    setLoading(false);
    if (!error) {
      navigate('/');
    } else {
      console.error(error);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('profileSetup', 'skipped');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
        <p className="text-gray-500 mb-8">Add your delivery details for a seamless ordering experience.</p>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                placeholder="Enter 10-digit number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-start pt-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                placeholder="Enter your complete delivery address"
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full bg-white text-gray-600 font-medium py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText="OK"
        hideCancel={true}
        isDestructive={true}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}
