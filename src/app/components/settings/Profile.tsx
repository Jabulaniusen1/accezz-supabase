import React, { useState, useEffect, useCallback } from 'react';
import SuccessModal from './modal/successModal';
import Toast from '../../../components/ui/Toast';
import Loader from '../../../components/ui/loader/Loaders';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { FiUser, FiMail, FiPhone, FiMapPin, FiGlobe, FiSave } from 'react-icons/fi';
import { Building2 } from 'lucide-react';


type UserDataType = {
  profilePhoto: string;
  fullName: string;
  businessName?: string;
  email: string;
  phone: string;
  timeZone: string;
  companyWebsite?: string;
  address: string;
  eventCategory?: string;
};

type ErrorMessagesType = Record<string, string>;

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserDataType>({
    profilePhoto: '',
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    timeZone: '',
    companyWebsite: '',
    address: '',
    eventCategory: ''
  });
  const [errorMessages] = useState<ErrorMessagesType>({});
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    type: 'success',
    message: '',
  });
  const toast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);


  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast('error', 'Please login to view your profile');
          router.push('/auth/login');
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileErr && profileErr.code !== 'PGRST116') throw profileErr;

        const user = session.user;
        const metadata = user.user_metadata || {};

        setUserData({
          profilePhoto: profile?.avatar_url || '',
          fullName: profile?.full_name || metadata.full_name || user.email?.split('@')[0] || '',
          businessName: metadata.businessName || '',
          email: user.email || '',
          phone: profile?.phone || metadata.phone || '',
          timeZone: metadata.timeZone || '',
          companyWebsite: metadata.companyWebsite || '',
          address: metadata.address || '',
          eventCategory: metadata.eventCategory || ''
        });
      } catch (error: unknown) {
        console.error('Error fetching profile:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch profile data';
        toast('error', message);
      }
    };

    fetchUserProfile();
  }, [router, toast]);

  useEffect(() => {
    localStorage.setItem('profileData', JSON.stringify(userData));
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast('error', 'Please login to update your profile');
        router.push('/auth/login');
        return;
      }

      // Update profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id,
          full_name: userData.fullName,
          phone: userData.phone,
          avatar_url: userData.profilePhoto || null,
        }, { onConflict: 'user_id' });
      if (profileErr) throw profileErr;

      // Update user metadata for extra fields
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          businessName: userData.businessName,
          timeZone: userData.timeZone,
          companyWebsite: userData.companyWebsite,
          address: userData.address,
          eventCategory: userData.eventCategory,
        }
      });
      if (metaErr) throw metaErr;

      toast('success', 'Profile updated successfully!');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast('error', message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {loading && <Loader />}
      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}
      
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Profile Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
          Manage your personal information and account details
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FiUser className="w-5 h-5 text-[#f54502]" />
            Personal Information
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiUser className="w-4 h-4 text-gray-500" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={userData?.fullName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200"
                  style={{ borderRadius: '5px' }}
                  placeholder="Enter your full name"
                  required
                />
                {errorMessages.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errorMessages.fullName}</p>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  Business Name <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={userData?.businessName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200"
                  style={{ borderRadius: '5px' }}
                  placeholder="Enter your business name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiMail className="w-4 h-4 text-gray-500" />
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={userData?.email}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    placeholder="Enter your email"
                    readOnly
                    disabled
                  />
                  <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-50 cursor-not-allowed"></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email cannot be changed from here
                </p>
                {errorMessages.email && (
                  <p className="text-red-500 text-sm mt-1">{errorMessages.email}</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiPhone className="w-4 h-4 text-gray-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={userData?.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200"
                  style={{ borderRadius: '5px' }}
                  placeholder="Enter your phone number"
                />
                {errorMessages.phone && (
                  <p className="text-red-500 text-sm mt-1">{errorMessages.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Details Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#f54502]" />
            Business Details
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Website */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiGlobe className="w-4 h-4 text-gray-500" />
                  Company Website <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  name="companyWebsite"
                  value={userData?.companyWebsite}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200"
                  style={{ borderRadius: '5px' }}
                  placeholder="https://example.com"
                />
                {errorMessages.companyWebsite && (
                  <p className="text-red-500 text-sm mt-1">{errorMessages.companyWebsite}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiMapPin className="w-4 h-4 text-gray-500" />
                  Address <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={userData?.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-[#f54502] transition-all duration-200"
                  style={{ borderRadius: '5px' }}
                  placeholder="Enter your address"
                />
                {errorMessages.address && (
                  <p className="text-red-500 text-sm mt-1">{errorMessages.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Make sure all information is correct before saving.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white font-semibold py-3 px-8 rounded-lg shadow-sm hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ borderRadius: '5px' }}
            >
              <FiSave className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {showModal && (
        <SuccessModal
          title="Settings Saved"
          message="Your profile has been successfully updated."
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;
