import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { FileUp, CheckCircle, CarFront } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ZipReader, BlobReader, TextWriter } from '@zip.js/zip.js';
import * as xmldsigjs from 'xmldsigjs';
import { Application } from 'xmldsigjs';

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [checking, setChecking] = useState(true);
  
  // Aadhaar State
  const [file, setFile] = useState<File | null>(null);
  const [pin, setPin] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');
  const [processingAadhaar, setProcessingAadhaar] = useState(false);

  // Vehicle & Contact State
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    // We need to set the engine for xmldsigjs to use WebCrypto
    Application.setEngine('WebCrypto', window.crypto);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const checkStatus = async () => {
      const { data } = await supabase.from('delivery_partners').select('*').eq('id', user.id).maybeSingle();
      
      if (!data) {
        setStep(1);
      } else if (!data.name || !data.dob) {
        setStep(1);
      } else if (!data.phone_number || !data.vehicle_number || !data.license_number) {
        setStep(2);
      } else {
        // Complete - Force full reload to update auth context
        window.location.href = '/';
        return;
      }
      setChecking(false);
    };
    checkStatus();
  }, [user, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleAadhaarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setAadhaarError('Please select a ZIP file');
      return;
    }
    if (!pin || pin.length !== 4) {
      setAadhaarError('Please enter the 4-digit share code');
      return;
    }

    setProcessingAadhaar(true);
    setAadhaarError('');

    try {
      // 1. Read ZIP file using zip.js
      const zipReader = new ZipReader(new BlobReader(file), { password: pin });
      const entries = await zipReader.getEntries();
      
      const xmlEntry = entries.find(e => e.filename.endsWith('.xml')) as any;
      if (!xmlEntry || !xmlEntry.getData) {
        throw new Error('No XML file found in the ZIP archive. Check your share code or file.');
      }

      // 2. Extract XML content
      const xmlString = await xmlEntry.getData(new TextWriter());
      await zipReader.close();

      // 3. Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      
      // 4. Basic Signature Validation
      try {
        const signature = xmlDoc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature")[0];
        if (!signature) {
           console.warn("No signature found, skipping validation.");
        } else {
           const signedXml = new xmldsigjs.SignedXml(xmlDoc);
           signedXml.LoadXml(signature);
           const isSignatureValid = await signedXml.Verify();
           if (!isSignatureValid) {
             throw new Error('Invalid XML Signature. The file may have been tampered with.');
           }
        }
      } catch (sigErr) {
        console.warn('Signature validation warning:', sigErr);
      }

      // 5. Extract details
      const poi = xmlDoc.getElementsByTagName('Poi')[0];
      const poa = xmlDoc.getElementsByTagName('Poa')[0];
      
      if (!poi || !poa) {
        throw new Error('Invalid Aadhaar XML format.');
      }

      const name = poi.getAttribute('name');
      const dob = poi.getAttribute('dob');
      
      // Check Age (must be 18 or older)
      if (dob) {
        const [day, month, year] = dob.split('-');
        const birthDate = new Date(`${year}-${month}-${day}`);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 18) {
          throw new Error('You must be at least 18 years old to become a delivery partner.');
        }
      }

      const gender = poi.getAttribute('gender');
      
      const house = poa.getAttribute('house') || '';
      const street = poa.getAttribute('street') || '';
      const po = poa.getAttribute('po') || '';
      const dist = poa.getAttribute('dist') || '';
      const pc = poa.getAttribute('pc') || '';
      
      const address = [house, street, po, dist, pc].filter(Boolean).join(', ');

      const avatar_url = user.user_metadata?.avatar_url || null;
      const email = user.email || null;

      // 6. Save to Supabase
      const { error: dbError } = await supabase.from('delivery_partners').upsert({
        id: user.id,
        email,
        name,
        dob,
        gender,
        address,
        avatar_url,
        status: 'offline'
      });

      if (dbError) throw dbError;

      // Proceed to Step 2
      setStep(2);
      
    } catch (err: any) {
      console.error(err);
      setAadhaarError(err.message || 'Failed to process Aadhaar file. Ensure the PIN is correct.');
    } finally {
      setProcessingAadhaar(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !license.trim() || !vehicleName.trim() || !vehicleNumber.trim()) {
      setDetailsError('All fields are required.');
      return;
    }

    // Vehicle number regex
    const vRegex = /^[A-Z]{2}\s?[0-9]{1,3}\s?[A-Z]{1,2}\s?[0-9]{1,4}$/i;
    if (!vRegex.test(vehicleNumber)) {
      setDetailsError('Invalid vehicle number format. Expected format: TN 69 AA 1234');
      return;
    }

    setSavingDetails(true);
    setDetailsError('');

    try {
      const { error } = await supabase.from('delivery_partners').update({
        phone_number: phone,
        license_number: license,
        vehicle_name: vehicleName,
        vehicle_number: vehicleNumber,
        kyc_status: 'verified'
      }).eq('id', user.id);

      if (error) throw error;
      
      // Complete!
      window.location.href = '/';
    } catch (err: any) {
      setDetailsError('Failed to save details. Try again.');
      console.error(err);
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        
        {step === 1 && (
          <>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileUp size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Aadhaar E-KYC</h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Upload your Offline Paperless Aadhaar ZIP file to securely extract your details. All processing happens locally on your device.
            </p>

            {aadhaarError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                {aadhaarError}
              </div>
            )}

            <form onSubmit={handleAadhaarSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aadhaar ZIP File
                </label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={processingAadhaar}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share Code (4-digit PIN)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-[0.5em] font-mono text-xl"
                  disabled={processingAadhaar}
                />
              </div>

              <button
                type="submit"
                disabled={processingAadhaar}
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4"
              >
                {processingAadhaar ? 'Verifying & Extracting...' : 'Verify Identity'}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CarFront size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Delivery Profile</h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Please provide your vehicle and contact details to complete registration. <br/>
              <span className="font-semibold text-yellow-600 mt-2 block">Note: A verification call will be made to the provided phone number.</span>
            </p>

            {detailsError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                {detailsError}
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  disabled={savingDetails}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driving License Number</label>
                <input
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value.toUpperCase())}
                  placeholder="e.g. TN69 20110001234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none uppercase"
                  disabled={savingDetails}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model/Name</label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="e.g. Honda Activa"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  disabled={savingDetails}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TN 69 AA 1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none uppercase"
                  disabled={savingDetails}
                />
              </div>

              <button
                type="submit"
                disabled={savingDetails}
                className="w-full bg-red-600 text-white font-medium py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle size={20} />
                {savingDetails ? 'Saving...' : 'Complete Setup'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
