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
          min-width: 280px;
          max-width: 90vw;
          padding: 12px 16px;
          border-radius: 5px;
          font-size: 14px;
          color: #fff;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toast-icon {
          flex-shrink: 0;
          font-size: 16px;
        }

        .toast-message {
          flex-grow: 1;
          margin-right: 8px;
          line-height: 1.5;
        }

        .toast-close {
          background: none;
          border: none;
          color: inherit;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          opacity: 0.8;
          transition: opacity 0.2s;
          line-height: 1;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-close:hover {
          opacity: 1;
        }

        .success {
          background-color: rgba(34, 197, 94, 1);
        }

        .error {
          background-color: rgba(239, 68, 68, 1);
        }

        .warning {
          background-color: rgba(245, 69, 2, 1);
        }

        .info {
          background-color: rgba(245, 69, 2, 1);
        }

        @media (max-width: 768px) {
          .toast-container {
            top: 10px;
            right: 10px;
            left: 10px;
            min-width: unset;
            width: auto;
            padding: 10px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
