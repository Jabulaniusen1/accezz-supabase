'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppFloatingButton = () => {
  const pathname = usePathname();

  // Hide on dashboard routes
  const isDashboard = pathname?.startsWith('/dashboard') || 
                      pathname?.startsWith('/admin') || 
                      pathname?.startsWith('/analytics');

  if (isDashboard) {
    return null;
  }

  const phoneNumber = '+2347018610048';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      aria-label="Contact us on WhatsApp"
      style={{
        width: '60px',
        height: '60px',
      }}
    >
      <FaWhatsapp className="w-8 h-8" />
      
      {/* Pulse animation effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#25D366]"
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.7, 0, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
    </motion.button>
  );
};

export default WhatsAppFloatingButton;

