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
      className="bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-gray-800 dark:to-gray-800/80 p-6 rounded-2xl shadow-xl border border-pink-100 dark:border-pink-900/30"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="text-xl font-semibold text-pink-700 dark:text-pink-300 mb-6">
        Social Media Links
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            icon: <FaInstagram className="text-pink-100 text-xl" />,
            name: 'instagram',
            placeholder: 'https://instagram.com/yourpage',
            color: 'from-pink-500 to-rose-500'
          },
          {
            icon: <FaFacebookF className="text-white text-xl" />,
            name: 'facebook', 
            placeholder: 'https://facebook.com/yourpage',
            color: 'from-blue-600 to-indigo-600'
          },
          {
            icon: <FaTwitter className="text-sky-100 text-xl" />,
            name: 'twitter',
            placeholder: 'https://twitter.com/yourhandle', 
            color: 'from-sky-400 to-blue-500'
          },
          {
            icon: <FaLinkedin className="text-white text-xl" />,
            name: 'linkedin',
            placeholder: 'https://linkedin.com/in/yourprofile',
            color: 'from-blue-700 to-blue-800'
          }
        ].map((social) => (
          <div key={social.name} className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className={`bg-gradient-to-r ${social.color} p-2 rounded-lg mr-2 shadow-lg`}>
                {social.icon}
              </span>
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
                className={`w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:border-transparent bg-white/80 dark:bg-gray-700/30 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200`}
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