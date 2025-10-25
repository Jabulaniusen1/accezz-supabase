import React from 'react';

type SuccessModalProps = {
  title: string;
  message: string;
  onClose: () => void;
};

const SuccessModal: React.FC<SuccessModalProps> = ({ title, message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 sm:w-96 p-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 text-green-600 rounded-full p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-600 mt-2">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition w-full"
        >
          Okay
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
