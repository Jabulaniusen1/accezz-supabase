import { motion } from "framer-motion";
import { useState } from "react";
import { 
  // FaVideo, 
  FaLink, 
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaGoogle,
  FaVideo,
  FaGlobe
} from "react-icons/fa";
import { RiEarthLine } from "react-icons/ri";
import { Event } from "../../../../types/event";

interface VirtualEventSettingsProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
}

export default function VirtualEventSettings({ 
  formData, 
  setFormData 
}: VirtualEventSettingsProps) {
  const [showVirtualPassword, setShowVirtualPassword] = useState(false);

  const handleVirtualToggle = (isVirtual: boolean) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      isVirtual,
      ...(isVirtual && {
        location: "Online",
        venue: "Virtual Event",
        virtualEventDetails: formData.virtualEventDetails || {
          platform: undefined,
          requiresPassword: false,
          virtualPassword: "",
          meetingUrl: "",
          meetingId: "",
          passcode: ""
        }
      }),
      ...(!isVirtual && {
        location: "",
        venue: "",
        virtualEventDetails: undefined
      })
    });
  };

  const handleVirtualPlatformChange = (platform: 'google-meet' | 'zoom' | 'whereby' | 'custom') => {
    if (!formData || !formData.isVirtual) return;
    
    setFormData({
      ...formData,
      virtualEventDetails: {
        ...(formData.virtualEventDetails || {}),
        platform,
        meetingUrl: platform === 'custom' ? formData.virtualEventDetails?.meetingUrl || "" : "",
        meetingId: platform === 'zoom' ? formData.virtualEventDetails?.meetingId || "" : "",
        passcode: platform === 'zoom' ? formData.virtualEventDetails?.passcode || "" : ""
      },
      location: platform === 'google-meet' ? 'Google Meet' : 
               platform === 'zoom' ? 'Zoom Meeting' : 
               platform === 'whereby' ? 'Whereby Meeting' : 
               'Virtual Event'
    });
  };

  const renderPlatformFields = () => {
    if (!formData?.isVirtual || !formData.virtualEventDetails?.platform) return null;

    switch(formData.virtualEventDetails.platform) {
      case 'custom':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
              <FaLink className="text-sm sm:text-base" />
              <h4 className="font-medium text-sm sm:text-base">Custom Meeting Link</h4>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Meeting URL *
              </label>
              <input
                type="url"
                value={formData.virtualEventDetails?.meetingUrl || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  virtualEventDetails: {
                    ...formData.virtualEventDetails,
                    meetingUrl: e.target.value
                  }
                })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 text-sm sm:text-base"
                placeholder="https://example.com/meeting"
                required
              />
            </div>
          </div>
        );
      
      case 'zoom':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
              <FaVideo className="text-sm sm:text-base" />
              <h4 className="font-medium text-sm sm:text-base">Zoom Meeting Details</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-300">
                  Meeting ID *
                </label>
                <input
                  type="text"
                  value={formData.virtualEventDetails?.meetingId || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    virtualEventDetails: {
                      ...formData.virtualEventDetails,
                      meetingId: e.target.value
                    }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 text-sm sm:text-base"
                  placeholder="123 456 789 0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Passcode (Optional)
                </label>
                <input
                  type="text"
                  value={formData.virtualEventDetails?.passcode || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    virtualEventDetails: {
                      ...formData.virtualEventDetails,
                      passcode: e.target.value
                    }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 text-sm sm:text-base"
                  placeholder="Zoom passcode if required"
                />
              </div>
            </div>
          </div>
        );

      case 'whereby':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
              <FaGlobe className="text-sm sm:text-base" />
              <h4 className="font-medium text-sm sm:text-base">Whereby Meeting Settings</h4>
            </div>
            <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <FaInfoCircle className="text-[#f54502] mt-1 flex-shrink-0 text-sm sm:text-base" />
                <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                  A Whereby meeting room will be automatically created when you save the event.
                </p>
              </div>
              <div className="space-y-2 sm:space-y-3 mt-3 sm:mt-4">
                <label className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 rounded-[5px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.virtualEventDetails?.enableWaitingRoom || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      virtualEventDetails: {
                        ...formData.virtualEventDetails,
                        enableWaitingRoom: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#f54502] focus:ring-[#f54502] border-gray-300 rounded-[5px]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable waiting room (attendees wait for host)
                  </span>
                </label>
                <label className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 rounded-[5px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.virtualEventDetails?.lockRoom || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      virtualEventDetails: {
                        ...formData.virtualEventDetails,
                        lockRoom: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#f54502] focus:ring-[#f54502] border-gray-300 rounded-[5px]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lock room after event starts
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'google-meet':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
        <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
          <FaGoogle className="text-sm sm:text-base" />
          <h4 className="font-medium text-sm sm:text-base">Google Meet Details</h4>
        </div>
        <div className="space-y-2 sm:space-y-3">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            Meeting URL *
          </label>
          <input
            type="url"
            value={formData.virtualEventDetails?.meetingUrl || ""}
            onChange={(e) => setFormData({
          ...formData,
          virtualEventDetails: {
            ...formData.virtualEventDetails,
            meetingUrl: e.target.value
          }
            })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 text-sm sm:text-base"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste your Google Meet link here. Attendees will use this link to join the event.
          </p>
        </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
          Event Type
        </h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData?.isVirtual || false}
            onChange={(e) => handleVirtualToggle(e.target.checked)}
            className="sr-only peer" 
          />
          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f54502]/30 dark:peer-focus:ring-[#f54502]/50 rounded-[5px] peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-[5px] after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[#f54502]"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
            {formData?.isVirtual ? 'Virtual Event' : 'In-Person Event'}
          </span>
        </label>
      </div>

      {formData?.isVirtual && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-4 sm:p-6 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30 space-y-4 sm:space-y-6"
        >
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#f54502] dark:text-[#f54502] mb-3 sm:mb-4 flex items-center">
              <RiEarthLine className="mr-2 text-[#f54502]" /> Virtual Event Platform
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
              Select the platform you&apos;ll use for your virtual event
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { 
                  id: 'google-meet',
                  name: 'Google Meet',
                  icon: <FaGoogle className="text-[#f54502] text-lg sm:text-xl" />
                },
                { 
                  id: 'zoom',
                  name: 'Zoom',
                  icon: <FaVideo className="text-[#f54502] text-lg sm:text-xl" />
                },
                { 
                  id: 'whereby',
                  name: 'Whereby',
                  icon: <FaGlobe className="text-[#f54502] text-lg sm:text-xl" />
                },
                { 
                  id: 'custom',
                  name: 'Custom',
                  icon: <FaLink className="text-[#f54502] text-lg sm:text-xl" />
                }
              ].map((platform) => (
                <motion.button
                  key={platform.id}
                  type="button"
                  onClick={() => handleVirtualPlatformChange(platform.id as 'google-meet' | 'zoom' | 'whereby' | 'custom')}
                  className={`p-3 sm:p-4 rounded-[5px] border-2 transition-all duration-200 flex flex-col items-center bg-white dark:bg-gray-800
                    ${formData.virtualEventDetails?.platform === platform.id
                      ? 'ring-2 ring-offset-2 ring-[#f54502] border-[#f54502] scale-[1.02] shadow-md bg-[#f54502]/10 dark:bg-[#f54502]/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-[#f54502] dark:hover:border-[#f54502]'
                    }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-2">
                    {platform.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white text-center">
                    {platform.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {renderPlatformFields()}

          <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-[#f54502]/20 dark:border-[#f54502]/30">
            <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
              <FaLock className="text-sm sm:text-base" />
              <h4 className="font-medium text-sm sm:text-base">Security Settings</h4>
            </div>
            
            <label className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 rounded-[5px] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.virtualEventDetails?.requiresPassword || false}
                onChange={(e) => setFormData({
                  ...formData,
                  virtualEventDetails: {
                    ...formData.virtualEventDetails,
                    requiresPassword: e.target.checked,
                    virtualPassword: e.target.checked ? formData.virtualEventDetails?.virtualPassword || "" : ""
                  }
                })}
                className="h-4 w-4 text-[#f54502] focus:ring-[#f54502] border-gray-300 rounded-[5px] mt-1"
              />
              <div className="flex-1">
                <span className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require password to join
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Attendees will need to enter this password to access your virtual event
                </p>
              </div>
            </label>

            {formData.virtualEventDetails?.requiresPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="space-y-2 pl-8 sm:pl-11"
              >
                <div className="relative">
                  <input
                    type={showVirtualPassword ? "text" : "password"}
                    value={formData.virtualEventDetails?.virtualPassword || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      virtualEventDetails: {
                        ...formData.virtualEventDetails,
                        virtualPassword: e.target.value
                      }
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 text-sm sm:text-base"
                    placeholder="Create a secure password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowVirtualPassword(!showVirtualPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showVirtualPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Minimum 8 characters, include numbers and special characters for security
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}