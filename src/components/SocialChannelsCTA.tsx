import React from 'react';
import { FaTelegram, FaWhatsapp, FaDiscord, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

type Props = {
  telegramUrl?: string;
  whatsappUrl?: string;
  discordUrl?: string;
  variant?: 'success' | 'ticket';
};

const SocialChannelsCTA = ({ telegramUrl, whatsappUrl, discordUrl, variant = 'success' }: Props) => {
  const isSuccess = variant === 'success';
  
  const socialLinks = [
    { 
      url: telegramUrl, 
      icon: <FaTelegram className="text-xl" />, 
      name: 'Telegram', 
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      darkColor: 'dark:bg-blue-600',
      darkHoverColor: 'dark:hover:bg-blue-700'
    },
    { 
      url: whatsappUrl, 
      icon: <FaWhatsapp className="text-xl" />, 
      name: 'WhatsApp', 
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      darkColor: 'dark:bg-green-600',
      darkHoverColor: 'dark:hover:bg-green-700'
    },
    { 
      url: discordUrl, 
      icon: <FaDiscord className="text-xl" />, 
      name: 'Discord', 
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      darkColor: 'dark:bg-indigo-600',
      darkHoverColor: 'dark:hover:bg-indigo-700'
    }
  ].filter(link => link.url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className={`
        ${isSuccess ? 'bg-white/10 backdrop-blur-lg' : 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900'} 
        rounded-2xl p-6 max-w-2xl mx-auto border
        ${isSuccess ? 'border-white/20' : 'border-gray-200 dark:border-gray-700'}
        shadow-lg overflow-hidden relative
      `}
    >
      {/* Decorative elements */}
      {isSuccess && (
        <>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-blue-500/20 blur-xl"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-purple-500/20 blur-xl"></div>
        </>
      )}
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={`
              text-xl font-bold mb-3 flex items-center gap-2
              ${isSuccess ? 'text-white' : 'text-gray-800 dark:text-white'}
            `}>
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-2 rounded-lg">
                {isSuccess ? '🎉' : '💬'}
              </span>
              Join Our Community
            </h3>
            
            <p className={`
              text-sm mb-5
              ${isSuccess ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}
            `}>
              {isSuccess 
                ? 'Connect with other attendees, get event updates, and join the conversation!'
                : 'Have questions? Join our community channels for support and updates.'}
            </p>
          </div>
          
          {isSuccess && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-2">
              <FaArrowRight className="text-white/80" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {socialLinks.map((link, index) => (
            <motion.a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -3 }}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl transition-all
                ${link.color} ${link.hoverColor} ${link.darkColor} ${link.darkHoverColor}
                text-white shadow-md hover:shadow-lg
              `}
            >
              <div className="text-2xl">{link.icon}</div>
              <span className="font-medium text-sm">Join {link.name}</span>
            </motion.a>
          ))}
        </div>
        
        {isSuccess && (
          <p className="text-xs text-white/70 mt-4 text-center">
            Already joined? Share your excitement with others!
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default SocialChannelsCTA;