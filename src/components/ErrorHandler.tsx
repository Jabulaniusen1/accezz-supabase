'use client';

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';

interface ErrorHandlerProps {
  error: string;
  onClose: () => void;
  retry?: () => void;
}

const ErrorHandler = ({ error, onClose, retry }: ErrorHandlerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-opacity-60 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <Box
        sx={{
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(255, 77, 77, 0.9) 0%, rgba(199, 0, 0, 0.9) 100%)',
          position: 'relative',
          width: { xs: '90%', sm: '70%', md: '50%' },
          maxWidth: '500px',
          boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* CLOSE BUTTON */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#fff',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* ERROR CONTENT */}
        <div className="flex flex-col items-center text-center gap-4">
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
            Oops! Something went wrong
          </Typography>
          
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            {error}
          </Typography>

          {retry && (
            <button
              onClick={retry}
              className="mt-4 px-6 py-2 bg-white text-red-600 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </Box>
    </motion.div>
  );
};

export default ErrorHandler;