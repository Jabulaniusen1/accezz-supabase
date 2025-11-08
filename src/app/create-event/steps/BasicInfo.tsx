'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaCloudUploadAlt, FaExclamationTriangle, FaGoogle, FaIdCard, FaInfoCircle, FaLink, FaTrash, FaVideo } from 'react-icons/fa';
import { type Event } from '@/types/event';
import { RiEarthLine } from 'react-icons/ri';
import { ToastProps } from '@/types/event';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { SiGooglemeet } from 'react-icons/si';
import { BiLogoZoom } from 'react-icons/bi';
import { BsMicrosoftTeams } from 'react-icons/bs';

interface BasicInfoProps {
  formData: Event;
  updateFormData: (data: Partial<Event>) => void;
  onNext: () => void;
  setToast: (toast: ToastProps | null) => void;
}

const BasicInfo = ({ formData, updateFormData, onNext, setToast }: BasicInfoProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (formData.image instanceof File) {
      const previewUrl = URL.createObjectURL(formData.image);
      setImagePreview(previewUrl);
  
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }
  }, [formData.image]);

  const handleImageChange = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToast({
        type: 'error',
        message: 'Invalid image format. Please upload JPG, PNG, or WEBP files only.',
        onClose: () => setToast(null)
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
  
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    updateFormData({ image: file });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageChange(file);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setToast({
        type: 'error',
        message: 'Please enter an event title',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.description.trim()) {
      setToast({
        type: 'error',
        message: 'Please enter an event description',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.image) {
      setToast({
        type: 'error',
        message: 'Please upload an event image',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.date) {
      setToast({
        type: 'error',
        message: 'Please select an event date',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.time) {
      setToast({
        type: 'error',
        message: 'Please select an event time',
        onClose: () => setToast(null)
      });
      return false;
    }
    
    // Virtual event specific validation
    if (formData.isVirtual) {
      if (!formData.virtualEventDetails?.platform) {
        setToast({
          type: 'error',
          message: 'Please select a virtual event platform',
          onClose: () => setToast(null)
        });
        return false;
      }
      
      if (formData.virtualEventDetails.platform === 'google-meet' && !formData.virtualEventDetails.meetingUrl) {
        setToast({
          type: 'error',
          message: 'Please enter a Google Meet URL',
          onClose: () => setToast(null)
        });
        return false;
      }
      
      if (formData.virtualEventDetails.platform === 'zoom' && !formData.virtualEventDetails.meetingId) {
        setToast({
          type: 'error',
          message: 'Please enter a Zoom meeting ID',
          onClose: () => setToast(null)
        });
        return false;
      }
      
      if (formData.virtualEventDetails.platform === 'custom' && !formData.virtualEventDetails.meetingUrl) {
        setToast({
          type: 'error',
          message: 'Please enter a meeting URL',
          onClose: () => setToast(null)
        });
        return false;
      }
    } else {
      // Physical event validation
      if (!formData.venue.trim()) {
        setToast({
          type: 'error',
          message: 'Please enter a venue',
          onClose: () => setToast(null)
        });
        return false;
      }
      if (!formData.location.trim()) {
        setToast({
          type: 'error',
          message: 'Please enter a location',
          onClose: () => setToast(null)
        });
        return false;
      }
    }
    
    return true;
  };

  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Event Basic Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Start by setting up the foundation of your event
        </p>
      </div>

      {/* Image Upload - Simplified */}
      <div className="space-y-3 sm:space-y-4">
        <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Event Image *
        </label>
        <div
          className={`relative border-2 border-dashed rounded-[5px] p-4 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-[#f54502] bg-[#f54502]/10 dark:bg-[#f54502]/20"
              : "border-gray-300 dark:border-gray-600 hover:border-[#f54502] dark:hover:border-[#f54502]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Validate image type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                  setToast({
                    type: 'error',
                    message: 'Invalid image format. Please upload JPG, PNG, or WEBP files only.',
                    onClose: () => setToast(null)
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }
                handleImageChange(file);
              }
            }}
          />

          {imagePreview ? (
            <div className="relative h-40 sm:h-48 w-full rounded-[5px] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={imagePreview}
                alt="Event preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={() => {
                  setToast({
                    type: 'error',
                    message: 'Failed to load image. Please upload a valid image file.',
                    onClose: () => setToast(null)
                  });
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                  updateFormData({ image: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                  updateFormData({ image: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 sm:p-2 bg-[#f54502] text-white rounded-[5px] hover:bg-[#d63a02] transition-colors duration-200"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-3 py-4 sm:py-6">
              <FaCloudUploadAlt className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPG, PNG, or WEBP
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid gap-4 sm:gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              placeholder="e.g., Tech Conference 2023"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Host Name *
            </label>
            <input
              type="text"
              value={formData.hostName}
              onChange={(e) => updateFormData({ hostName: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              placeholder="Your name or organization"
              required
            />
          </div>
        </div>


        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={4}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            placeholder="Tell attendees what your event is about..."
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <DateTimePicker
              type="date"
              value={formData.date}
              onChange={(value) => updateFormData({ date: value })}
              minDate={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time *
            </label>
            <DateTimePicker
              type="time"
              value={formData.time}
              onChange={(value) => updateFormData({ time: value })}
            />
          </div>
        </div>
        {/* Virtual Event Toggle - Improved */}
        <div className="pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isVirtual}
              onChange={(e) => {
                const isVirtual = e.target.checked;
                updateFormData({ 
                  isVirtual,
                  // Automatically set location and venue when toggling virtual event
                  location: isVirtual ? 'Online' : formData.location,
                  venue: isVirtual ? 'Virtual Event' : formData.venue,
                  // Clear virtual details when toggling off
                  virtualEventDetails: isVirtual ? formData.virtualEventDetails : undefined
                });
              }}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f54502]/30 dark:peer-focus:ring-[#f54502]/50 rounded-[5px] peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-[5px] after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#f54502]"></div>
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Virtual Event
            </span>
          </label>
        </div>

        {!formData.isVirtual ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Venue *
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => updateFormData({ venue: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="e.g., Convention Center"
                required
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="e.g., 123 Main St, City"
                required
              />
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="bg-[#f54502]/10 dark:bg-[#f54502]/20 rounded-[5px] p-4 sm:p-6 border border-[#f54502]/20 dark:border-[#f54502]/30"
          >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#f54502] dark:text-[#f54502] flex items-center">
                    <RiEarthLine className="mr-2" /> Virtual Event Setup
                  </h3>
                  <span className="px-2 sm:px-3 py-1 bg-[#f54502]/20 dark:bg-[#f54502]/30 text-[#f54502] dark:text-[#f54502] text-xs font-medium rounded-[5px]">
                    Online Event
                  </span>
                </div>

                {/* Platform Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {(['google-meet', 'zoom', 'meets', 'custom'] as const).map((platform) => (
                  <motion.button
                    key={platform}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const previousDetails = formData.virtualEventDetails || {};
                      updateFormData({
                        virtualEventDetails: {
                          ...previousDetails,
                          platform,
                          meetingUrl:
                            platform === 'zoom'
                              ? previousDetails.meetingUrl || ''
                              : platform === 'custom' || platform === 'google-meet' || platform === 'meets'
                                ? previousDetails.meetingUrl || ''
                                : '',
                          meetingId: platform === 'zoom' ? previousDetails.meetingId || '' : ''
                        },
                        venue: 'Online',
                        location:
                          platform === 'google-meet'
                            ? 'Google Meet'
                            : platform === 'zoom'
                              ? 'Zoom Meeting'
                              : platform === 'meets'
                                ? 'Meets'
                                : 'Virtual Event'
                      });
                    }}
                    className={`p-3 sm:p-4 rounded-[5px] border-2 transition-all duration-200 flex flex-col items-center dark:text-white text-gray-900
                      ${formData.virtualEventDetails?.platform === platform
                      ? 'border-[#f54502] bg-[#f54502]/10 dark:bg-[#f54502]/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 hover:border-[#f54502] dark:hover:border-[#f54502]'
                      }`}
                  >
                      {platform === 'google-meet' && <SiGooglemeet className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'zoom' && <BiLogoZoom className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'meets' && <BsMicrosoftTeams className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'custom' && <FaLink className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      <span className="capitalize font-medium text-xs sm:text-sm text-center">
                        {platform === 'google-meet'
                          ? 'Google Meet'
                          : platform === 'meets'
                            ? 'Meets'
                            : platform === 'custom'
                              ? 'Custom Setup'
                              : platform}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Google Meet  */}
                {formData.virtualEventDetails?.platform === 'google-meet' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                    <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                      Please paste your Google Meet link below. Make sure the link is accessible to attendees.
                    </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FaLink className="mr-2 text-sm" /> Google Meet Link *
                    </label>
                    <input
                    type="url"
                    value={formData.virtualEventDetails?.meetingUrl || ''}
                    onChange={(e) => updateFormData({
                      virtualEventDetails: {
                      ...formData.virtualEventDetails,
                      meetingUrl: e.target.value
                      }
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                        focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    required
                    />
                  </div>
                  </div>
                )}

                {/* Meets Section */}
                {formData.virtualEventDetails?.platform === 'meets' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                      <div className="flex items-start">
                        <FaInfoCircle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                        <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                          Share the Meets session link attendees should use after purchasing their tickets.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaLink className="mr-2 text-sm" /> Meets Link *
                      </label>
                      <input
                        type="url"
                        value={formData.virtualEventDetails?.meetingUrl || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingUrl: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="https://meets.your-platform.com/example"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Zoom Section */}
                {formData.virtualEventDetails?.platform === 'zoom' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaIdCard className="mr-2 text-sm" /> Zoom Meeting ID *
                      </label>
                      <input
                        type="text"
                        value={formData.virtualEventDetails?.meetingId || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingId: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="123 456 7890"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Custom Platform Section */}
                {formData.virtualEventDetails?.platform === 'custom' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaLink className="mr-2 text-sm" /> Meeting URL *
                      </label>
                      <input
                        type="url"
                        value={formData.virtualEventDetails?.meetingUrl || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingUrl: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="https://your-platform.com/meeting-id"
                        required
                      />
                    </div>
                    <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                      <div className="flex items-start">
                        <FaExclamationTriangle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                        <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                          For custom platforms, you&apos;re responsible for creating the meeting and managing access.
                          Ensure the URL is correct and accessible to attendees.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

          </motion.div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end mt-6 sm:mt-8">
        <button
          onClick={() => validateForm() && onNext()}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-[5px] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto text-sm sm:text-base"
        >
          Continue to Ticket Setup
        </button>
      </div>
    </motion.div>
  );
};

export default BasicInfo;