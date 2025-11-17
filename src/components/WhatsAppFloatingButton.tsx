'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppFloatingButton = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide on dashboard routes
  const isDashboard = pathname?.startsWith('/dashboard') || 
                      pathname?.startsWith('/admin') || 
                      pathname?.startsWith('/analytics');

  if (!mounted || isDashboard) {
    return null;
  }

  const phoneNumber = '+2347018610048';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`;

  const handleClick = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-[999] pointer-events-auto"
      style={{ 
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999,
      }}
    >
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleClick}
        className="bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center relative overflow-visible"
        aria-label="Contact us on WhatsApp"
        style={{
          width: '60px',
          height: '60px',
          position: 'relative',
        }}
      >
        {/* Pulse animation effect - behind the icon */}
        <motion.div
          className="absolute inset-0 rounded-full bg-[#25D366] pointer-events-none"
          style={{
            zIndex: 0,
          }}
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.6, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        
        {/* WhatsApp Icon - on top */}
        <FaWhatsapp 
          className="w-8 h-8 relative" 
          style={{
            zIndex: 10,
            position: 'relative',
          }}
        />
      </motion.button>
    </div>
  );
};

export default WhatsAppFloatingButton;

