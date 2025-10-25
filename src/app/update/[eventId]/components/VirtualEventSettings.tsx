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
          <div className="space-y-4 mt-6 dark:text-gray-100 text-gray-800">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
              <FaLink className="text-lg" />
              <h4 className="font-medium">Custom Meeting Link</h4>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800"
                placeholder="https://example.com/meeting"
                required
              />
            </div>
          </div>
        );
      
      case 'zoom':
        return (
          <div className="space-y-4 mt-6">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
              <FaVideo className="text-lg" />
              <h4 className="font-medium">Zoom Meeting Details</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 dark:text-gray-100 text-gray-800">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-300">
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800"
                  placeholder="123 456 789 0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                  placeholder="Zoom passcode if required"
                />
              </div>
            </div>
          </div>
        );

      case 'whereby':
        return (
          <div className="space-y-4 mt-6">
            <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400">
              <FaGlobe className="text-lg" />
              <h4 className="font-medium">Whereby Meeting Settings</h4>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-start space-x-3">
                <FaInfoCircle className="text-purple-500 mt-1 flex-shrink-0" />
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  A Whereby meeting room will be automatically created when you save the event.
                </p>
              </div>
              <div className="space-y-3 mt-4">
                <label className="flex items-center space-x-3 p-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg cursor-pointer">
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
                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable waiting room (attendees wait for host)
                  </span>
                </label>
                <label className="flex items-center space-x-3 p-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg cursor-pointer">
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
                    className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lock room after event starts
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'google-meet':
        return (
          <div className="space-y-4 mt-6">
        <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
          <FaGoogle className="text-lg" />
          <h4 className="font-medium">Google Meet Details</h4>
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800"
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Event Type
        </h3>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={formData?.isVirtual || false}
            onChange={(e) => handleVirtualToggle(e.target.checked)}
            className="sr-only peer" 
          />
          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
          className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800/80 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/30 space-y-6"
        >
          <div>
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center">
              <RiEarthLine className="mr-2 text-blue-500" /> Virtual Event Platform
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the platform you&apos;ll use for your virtual event
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  id: 'google-meet',
                  name: 'Google Meet',
                  icon: <FaGoogle className="text-red-500 text-xl" />,
                  color: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                },
                { 
                  id: 'zoom',
                  name: 'Zoom',
                  icon: <FaVideo className="text-blue-500 text-xl" />,
                  color: 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                },
                { 
                  id: 'whereby',
                  name: 'Whereby',
                  icon: <FaGlobe className="text-purple-500 text-xl" />,
                  color: 'bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                },
                { 
                  id: 'custom',
                  name: 'Custom',
                  icon: <FaLink className="text-green-500 text-xl" />,
                  color: 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }
              ].map((platform) => (
                <motion.button
                  key={platform.id}
                  type="button"
                  onClick={() => handleVirtualPlatformChange(platform.id as 'google-meet' | 'zoom' | 'whereby' | 'custom')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${platform.color}
                    ${formData.virtualEventDetails?.platform === platform.id
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-[1.02] shadow-md'
                      : 'hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-2">
                    {platform.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-white">
                    {platform.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {renderPlatformFields()}

          <div className="space-y-4 pt-4 border-t border-blue-200 dark:border-blue-900/30">
            <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
              <FaLock className="text-lg" />
              <h4 className="font-medium">Security Settings</h4>
            </div>
            
            <label className="flex items-start space-x-3 p-3 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-xl cursor-pointer">
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
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                className="space-y-2 pl-11"
              >
                <div className="relative dark:text-gray-100 text-gray-800">
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
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