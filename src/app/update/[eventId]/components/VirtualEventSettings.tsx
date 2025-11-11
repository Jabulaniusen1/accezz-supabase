import { motion } from "framer-motion";
import { FaLink, FaVideo } from "react-icons/fa";
import { RiEarthLine } from "react-icons/ri";
import { SiGooglemeet } from "react-icons/si";
import { BiLogoZoom } from "react-icons/bi";
import { BsMicrosoftTeams } from "react-icons/bs";
import { Event } from "../../../../types/event";

interface VirtualEventSettingsProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
}

const platformLocationLabel = (platform: 'google-meet' | 'zoom' | 'meets' | 'custom'): string => {
  switch (platform) {
    case 'google-meet':
      return 'Google Meet';
    case 'zoom':
      return 'Zoom Meeting';
    case 'meets':
      return 'Meets';
    default:
      return 'Virtual Event';
  }
};

export default function VirtualEventSettings({
  formData,
  setFormData,
}: VirtualEventSettingsProps) {
  const locationVisibility = formData?.locationVisibility ?? 'public';
  const isSecret = locationVisibility === 'secret';

  const handleLocationVisibilityChange = (value: 'public' | 'secret') => {
    setFormData((prev) => (prev ? { ...prev, locationVisibility: value } : prev));
  };

  const handleVirtualToggle = (isVirtual: boolean) => {
    if (!formData) return;

    setFormData({
      ...formData,
      isVirtual,
      ...(isVirtual
        ? {
            location: "Online",
            venue: "Virtual Event",
            address: "",
            city: "",
            country: "",
            locationId: undefined,
            latitude: null,
            longitude: null,
            locationVisibility: formData.locationVisibility === 'secret' ? 'secret' : 'public',
            virtualEventDetails:
              formData.virtualEventDetails || {
                platform: undefined,
                meetingUrl: "",
                meetingId: "",
              },
          }
        : {
            virtualEventDetails: undefined,
          }),
    });
  };

  const handleVirtualPlatformChange = (
    platform: "google-meet" | "zoom" | "meets" | "custom"
  ) => {
    if (!formData || !formData.isVirtual) return;

    setFormData({
      ...formData,
      virtualEventDetails: {
        ...(formData.virtualEventDetails || {}),
        platform,
        meetingUrl:
          platform === "custom" || platform === "google-meet" || platform === "meets"
            ? formData.virtualEventDetails?.meetingUrl || ""
            : formData.virtualEventDetails?.meetingUrl || "",
        meetingId:
          platform === "zoom" ? formData.virtualEventDetails?.meetingId || "" : "",
      },
      location: platformLocationLabel(platform),
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
          </div>
        );

      case 'meets':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
              <FaVideo className="text-sm sm:text-base" />
              <h4 className="font-medium text-sm sm:text-base">Meets Details</h4>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Meets URL *
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
                placeholder="https://meets.your-platform.com/example"
                required
              />
            </div>
          </div>
        );

      case 'google-meet':
        return (
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
        <div className="flex items-center space-x-2 sm:space-x-3 text-[#f54502]">
          <SiGooglemeet className="text-sm sm:text-base" />
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
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Access visibility
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'public', label: 'Show access info' },
                { value: 'secret', label: 'Share after purchase' },
              ] as const).map((option) => {
                const isActive = locationVisibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleLocationVisibilityChange(option.value)}
                    className={`px-3 py-2 rounded-[5px] border text-xs sm:text-sm transition ${
                      isActive
                        ? 'bg-[#f54502] text-white border-[#f54502] shadow-sm'
                        : 'border-[#f54502]/40 text-[#f54502] bg-white dark:bg-gray-900 hover:border-[#f54502]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {isSecret ? (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Meeting links and IDs stay hidden on the event page. Ticket buyers receive them by email and on their receipt.
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Choose “Share after purchase” if you want to keep access details private until attendees buy a ticket.
              </p>
            )}
          </div>

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
                  icon: <SiGooglemeet className="text-[#f54502] text-lg sm:text-xl" />
                },
                { 
                  id: 'zoom',
                  name: 'Zoom',
                  icon: <BiLogoZoom className="text-[#f54502] text-lg sm:text-xl" />
                },
                { 
                  id: 'meets',
                  name: 'Meets',
                  icon: <BsMicrosoftTeams className="text-[#f54502] text-lg sm:text-xl" />
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
                  onClick={() => handleVirtualPlatformChange(platform.id as 'google-meet' | 'zoom' | 'meets' | 'custom')}
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
        </motion.div>
      )}
    </motion.div>
  );
}