// import Image from 'next/image';
import React, { useState, useEffect, useCallback } from 'react';
import SuccessModal from './modal/successModal';
import Toast from '../../../components/ui/Toast';
import Loader from '../../../components/ui/loader/Loaders';
import axios, { AxiosError }  from 'axios';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '../../../../config';


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

  const handleAxiosError = useCallback((error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          toast('error', 'Bad request. Please check your input.');
          break;
        case 401:
          toast('error', 'Unauthorized. Please log in again.');
          router.push('/auth/login');
          break;
        case 404:
          toast('error', 'Endpoint not found.');
          break;
        case 500:
          toast('error', 'Server error. Please try again later.');
          break;
        default:
          toast('error', `An error occurred: ${error.response.statusText}`);
      }
    } else {
      toast('error', 'Network error. Please check your connection.');
    }
  }, [router, toast]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast('error', 'Please login to view your profile');
          router.push('/auth/login');
          return;
        }
        console.log(token);

        const response = await axios.get(
          `${BASE_URL}api/v1/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const user = response.data.user;
        if (user) {
          setUserData({
            profilePhoto: user.profilePic || '',
            fullName: user.fullName || '',
            businessName: user.businessName || '',
            email: user.email || '',
            phone: user.phone || '',
            timeZone: user.timezone || '',
            companyWebsite: user.companyWebsite || '',
            address: user.address || '',
            eventCategory: user.eventCategory || ''
          });

          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          handleAxiosError(error);
        } else {
          toast('error', 'Failed to fetch profile data');
        }
      }
    };

    fetchUserProfile();
  }, [router, handleAxiosError, toast]);

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

  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     handleImageUpload(file);
  //   }
  // };

  // const handleImageUpload = async (file: File) => {
  //   setLoading(true);
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token) {
  //       toast('error', 'Please login to update your profile picture');
  //       return;
  //     }

  //     // Convert image file to base64
  //     const reader = new FileReader();
  //     reader.onloadend = async () => {
  //       const base64String = reader.result as string;
        
  //       // Update userData with the new image
  //       setUserData(prevData => ({
  //         ...prevData,
  //         profilePhoto: base64String
  //       }));

  //       try {
  //         const response = await axios.patch(
  //           `${BASE_URL}api/v1/users/profile`,
  //           { ...userData, profilePhoto: base64String },
  //           {
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //               'Content-Type': 'application/json',
  //             },
  //           }
  //         );

  //         if (response.data) {
  //           localStorage.setItem('user', JSON.stringify(response.data.data));
  //           toast('success', 'Profile picture updated successfully!');
  //         }
  //       } catch (error) {
  //         if (axios.isAxiosError(error)) {
  //           handleAxiosError(error);
  //         } else {
  //           toast('error', 'Failed to update profile picture');
  //         }
  //       }
  //     };

  //     reader.readAsDataURL(file);
  //   } catch (error) {
  //     console.log(error);
  //     toast('error', 'Error processing image');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast('error', 'You are not authenticated. Please log in and try again.');
        router.push('/auth/login');
        return;
      }

      // Update user data
      const response = await axios.patch(
        `${BASE_URL}api/v1/users/profile`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        toast('success', 'Profile updated successfully!');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleAxiosError(error);
      } else {
        toast('error', 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="sm:max-w-4xl mt-2 p-2 sm:p-6 w-full">
      {loading && <Loader />}
      {showToast && (
        <Toast
          type={toastProps.type}
          message={toastProps.message}
          onClose={() => setShowToast(false)}
        />
      )}
      <h1 className="text-2xl font-bold mb-2">Profile Account</h1>
      <p className="text-gray-600 mb-6">
        Manage your Virtual Ticket account. All changes will be applied to your events and account settings.
      </p>

      {/* ===================== && •FORM SECTION• && ======================== */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===================== && •PROFILE SETUP SECTION• && =========================== */}
        {/* <div className="flex items-center space-x-4">
          <div className="relative">
            <Image
              src={userData?.profilePhoto || '/phishing.png'}
              width={150}
              height={150}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-md"
            />
          </div>
          <label htmlFor="profilePhoto" className="cursor-pointer">
            <span className="text-blue-500 font-semibold underline">Upload Profile Photo</span>
            <input
              type="file"
              id="profilePhoto"
              name="profilePhoto"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div> */}

        {/* ===================== && •INPUT FIELDS SECTION• && ========================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={userData?.fullName}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
              placeholder="Enter your full name"
            />
            {errorMessages.fullName && (
              <p className="text-red-500 text-sm">{errorMessages.fullName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Business Name (optional)</label>
            <input
              type="text"
              name="businessName"
              value={userData?.businessName}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
              placeholder="Enter your business name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={userData?.email}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-400"
              placeholder="Enter your email"
              readOnly
            />
            {errorMessages.email && (
              <p className="text-red-500 text-sm">{errorMessages.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={userData?.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
              placeholder="Enter your phone number"
            />
            {errorMessages.phone && (
              <p className="text-red-500 text-sm">{errorMessages.phone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Website</label>
            <input
              type="text"
              name="companyWebsite"
              value={userData?.companyWebsite}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
              placeholder="Enter your company website "
            />
            {errorMessages.companyWebsite && (
              <p className="text-red-500 text-sm">{errorMessages.companyWebsite}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={userData?.address}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
              placeholder="Enter your address"
            />
            {errorMessages.address && (
              <p className="text-red-500 text-sm">{errorMessages.address}</p>
            )}
          </div>
        </div>

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Time Zone</label>
            <select
              name="timeZone"
              value={userData?.timeZone}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
            >
              <option value="">Select your time zone</option>
              <option value="UTC-12:00">UTC-12:00</option>
              <option value="UTC-11:00">UTC-11:00</option>
              <option value="UTC+00:00">UTC+00:00 (GMT)</option>
              <option value="UTC+01:00">UTC+01:00 (CET)</option>
              <option value="UTC+05:30">UTC+05:30 (IST)</option>
              <option value="UTC+09:00">UTC+09:00 (JST)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Event Category (optional)</label>
            <select
              name="eventCategory"
              value={userData?.eventCategory}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-none shadow-md dark:shadow-gray-500/50 bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2"
            >
              <option value="">Select an event category</option>
              <option value="Music">Music</option>
              <option value="Sports">Sports</option>
              <option value="Business">Business</option>
              <option value="Education">Education</option>
              <option value="Technology">Technology</option>
            </select>
          </div>
        </div> */}

        <div>
          <button
            type="submit"
            className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition"
          >
            Update Profile
          </button>
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
