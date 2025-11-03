import { motion } from "framer-motion";
import { FaInstagram, FaFacebookF, FaTwitter, FaLinkedin } from "react-icons/fa";
import { Event } from "../../../../types/event";

interface SocialMediaLinksProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
}

export default function SocialMediaLinks({ 
  formData, 
  setFormData 
}: SocialMediaLinksProps) {
  return (
    <motion.div
      className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-[5px] shadow-xl border border-gray-200 dark:border-gray-700"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 sm:mb-6">
        Social Media Links
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { 
            icon: <FaInstagram className="text-[#f54502] text-base sm:text-lg" />,
            name: 'instagram',
            placeholder: 'https://instagram.com/yourpage'
          },
          {
            icon: <FaFacebookF className="text-[#f54502] text-base sm:text-lg" />,
            name: 'facebook', 
            placeholder: 'https://facebook.com/yourpage'
          },
          {
            icon: <FaTwitter className="text-[#f54502] text-base sm:text-lg" />,
            name: 'twitter',
            placeholder: 'https://twitter.com/yourhandle'
          },
          {
            icon: <FaLinkedin className="text-[#f54502] text-base sm:text-lg" />,
            name: 'linkedin',
            placeholder: 'https://linkedin.com/in/yourprofile'
          }
        ].map((social) => (
          <div key={social.name} className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {social.name.charAt(0).toUpperCase() + social.name.slice(1)}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData?.socialMediaLinks?.[social.name as keyof typeof formData.socialMediaLinks] || ''}
                onChange={(e) => {
                  if (!formData) return;
                  setFormData({
                    ...formData,
                    socialMediaLinks: {
                      ...formData.socialMediaLinks,
                      [social.name]: e.target.value
                    }
                  });
                }}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
                placeholder={social.placeholder}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {social.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}