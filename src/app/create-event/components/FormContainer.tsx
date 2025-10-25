import React, { ReactNode } from 'react';

interface FormContainerProps {
  children: ReactNode;
  className?: string;
}

export const FormContainer: React.FC<FormContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 animate-slideUp ${className}`}>
      {children}
    </div>
  );
};