// COMPONENTS/VIRTUAL-EVENT/VIRTUAL-EVENT-PLATFORM.TSX
import React from 'react';
import { motion } from 'framer-motion';
import { type Event } from '@/types/event';
import { FaGoogle, FaVideo, FaLink,  FaQrcode, FaCopy } from 'react-icons/fa';
import { Button } from '@mui/material';
import Image from 'next/image';
import { useState } from 'react';
import { Snackbar, Alert, Tooltip, IconButton } from '@mui/material';

interface VirtualEventPlatformProps {
  event: Event;
}

export default function VirtualEventPlatform({ event }: VirtualEventPlatformProps) {
  const getPlatformDetails = () => {
    switch(event.virtualEventDetails?.platform) {
      case 'google-meet':
        return {
          name: 'Google Meet',
          icon: <FaGoogle className="text-red-500 text-2xl" />,
          link: event.virtualEventDetails?.meetingUrl || `https://meet.google.com/new?authuser=0`,
          color: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-700 dark:text-red-300'
        };
      case 'zoom':
        return {
          name: 'Zoom Meeting',
          icon: <FaVideo className="text-blue-500 text-2xl" />,
          link: `https://zoom.us/j/${event.virtualEventDetails?.meetingId}`,
          color: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300'
        };
      case 'meets':
        return {
          name: 'Meets',
          icon: <FaVideo className="text-purple-500 text-2xl" />,
          link: event.virtualEventDetails?.meetingUrl || '#',
          color: 'bg-purple-100 dark:bg-purple-900/20',
          textColor: 'text-purple-700 dark:text-purple-300'
        };
      default:
        return {
          name: 'Custom Platform',
          icon: <FaLink className="text-green-500 text-2xl" />,
          link: event.virtualEventDetails?.meetingUrl || '#',
          color: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-700 dark:text-green-300'
        };
    }
  };

  const platform = getPlatformDetails();

  const [toastOpen, setToastOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
        className={`relative overflow-hidden rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-0 md:p-0`}
      >
        {/* Decorative Gradient Blob */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-indigo-400/30 via-purple-400/20 to-blue-400/10 rounded-full blur-2xl pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-6 md:p-10">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center w-full md:w-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-4 border border-gray-100 dark:border-gray-800 transition-all hover:scale-105 duration-200">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(platform.link)}&format=png&qzone=2&color=6366F1`}
                alt="QR Code"
                width={140}
                height={140}
                className="rounded-xl"
                priority
              />
            </div>
            <p className="mt-3 text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium tracking-wide">
              <FaQrcode className="mr-1 text-indigo-500" /> Scan to Join
            </p>
          </div>

          {/* Main Info Section */}
          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl shadow bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                  {platform.icon}
                </span>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    {platform.name}
                  </h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 tracking-wide">
                    JOIN VIA {platform.name.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Joining Link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 rounded-xl px-5 py-4 shadow-sm mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
                  JOINING LINK
                </p>
                <a
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block font-mono text-base md:text-lg font-medium ${platform.textColor} hover:underline truncate transition-all`}
                >
                  {platform.link}
                </a>
              </div>
              <Tooltip title="Copy Link" arrow>
                <IconButton
                  onClick={() => copyToClipboard(platform.link)}
                  className="!text-indigo-500 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/20 transition"
                  size="large"
                >
                  <FaCopy />
                </IconButton>
              </Tooltip>
            </div>

            {/* Join Button */}
            <div className="mt-6">
              <Button
                fullWidth
                variant="contained"
                href={platform.link}
                target="_blank"
                sx={{
                  py: 1.7,
                  borderRadius: '16px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.04em',
                  background: 'linear-gradient(90deg, #6366F1 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 24px 0 rgba(99,102,241,0.15)',
                  textTransform: 'none',
                  ':hover': {
                    background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
                    transform: 'translateY(-2px) scale(1.03)',
                    boxShadow: '0 8px 32px 0 rgba(99,102,241,0.18)',
                  },
                  transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                }}
                endIcon={<FaVideo />}
              >
                Join Now
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toast Snackbar */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={2000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity="success"
          variant="filled"
          sx={{
            background: 'linear-gradient(90deg, #6366F1 0%, #8b5cf6 100%)',
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
          icon={<FaCopy />}
        >
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}