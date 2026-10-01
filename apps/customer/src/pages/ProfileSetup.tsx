import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MapPin, Phone, User as UserIcon } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

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
    <div className="flex flex-col justify-center items-center py-12 px-4 animate-fade-in-up">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-amber-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(220,38,38,0.4)] border-2 border-white/20">
            {user?.user_metadata?.avatar_url ? (
               <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
               <UserIcon size={32} className="text-white" />
            )}
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-wide">Complete Profile</h1>
          <p className="text-white/60 text-sm">Add your details for a seamless dining experience.</p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Phone Number *</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-white/30 group-focus-within:text-red-400 transition-colors" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-12 w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-white placeholder-white/30 focus:border-red-500 focus:bg-white/10 outline-none transition-all shadow-inner"
                  placeholder="Enter 10-digit number"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Default Address *</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 pt-4 flex items-start pointer-events-none">
                  <MapPin className="h-5 w-5 text-white/30 group-focus-within:text-red-400 transition-colors" />
                </div>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="pl-12 w-full bg-white/5 border border-white/10 rounded-xl py-3.5 text-white placeholder-white/30 focus:border-red-500 focus:bg-white/10 outline-none transition-all shadow-inner resize-none"
                  placeholder="Enter your complete delivery address"
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full glass-button py-4 rounded-xl font-bold shadow-lg uppercase tracking-widest text-sm"
              >
                {loading ? 'Saving Profile...' : 'Save & Continue'}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full bg-transparent text-white/50 font-bold py-3.5 rounded-xl border border-white/10 hover:bg-white/5 hover:text-white transition-colors uppercase tracking-widest text-xs"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
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
