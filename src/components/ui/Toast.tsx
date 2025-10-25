import React, { useEffect } from 'react';
import gsap from 'gsap';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    gsap.fromTo(
      '.toast-container',
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );

    const timeout = setTimeout(() => {
      gsap.to('.toast-container', {
        y: -50,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>X</button>
      </div>
      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 90vw;
          padding: 16px;
          border-radius: 12px;
          font-size: 15px;
          color: #fff;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(8px);
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .toast-icon {
          flex-shrink: 0;
          font-size: 18px;
        }

        .toast-message {
          flex-grow: 1;
          margin-right: 8px;
          line-height: 1.4;
        }

        .toast-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
          line-height: 1;
        }

        .toast-close:hover {
          opacity: 1;
        }

        .success {
          background-color: rgba(34, 197, 94, 0.95);
          border-left: 4px solid rgb(21, 128, 61);
        }

        .error {
          background-color: rgba(239, 68, 68, 0.95);
          border-left: 4px solid rgb(185, 28, 28);
        }

        .warning {
          background-color: rgba(249, 115, 22, 0.95);
          border-left: 4px solid rgb(194, 65, 12);
        }

        .info {
          background-color: rgba(59, 130, 246, 0.95);
          border-left: 4px solid rgb(29, 78, 216);
        }

        @media (max-width: 768px) {
          .toast-container {
            top: 2px;
            right: 20px;
            min-width: unset;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
