'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/* ============== && •TWO-FACTOR AUTHENTICATION• && ================= */

const TwoFacAuth = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [inputCode, setInputCode] = useState(new Array(6).fill(''));
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSecure, setIsSecure] = useState(false);

  const router = useRouter();

  const logSecurityEvent = async (event: string) => {
    console.log(`Security Event Logged: ${event}`);
    // Simulate API call
    // await fetch('/api/log-security-event', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event, timestamp: new Date() }),
    // });
  };

  const handleInputChange = (value: string, index: number) => {
    if (value.length > 1) return; 
    const updatedCode = [...inputCode];
    updatedCode[index] = value;
    setInputCode(updatedCode);
  };

  const handleSetup = () => {
    if (userCode.length < 6) {
      setMessage('Your code must be at least 6 characters long.');
      return;
    }
    setIsEnabled(true);
    setIsSecure(true); 
    setMessage('Two-factor authentication has been successfully enabled.');
    logSecurityEvent('2FA enabled');
  };

  const handleVerify = () => {
    const enteredCode = inputCode.join('');
    if (enteredCode === userCode) {
      setMessage('Code verified successfully! Redirecting...');
      logSecurityEvent('2FA code verified');
      setTimeout(() => router.push('/dashboard'), 2000);
    } else {
      setMessage('The code is incorrect. Please try again.');
      logSecurityEvent('2FA code verification failed');
    }
  };


  const handleDisable = () => {
    if (password !== 'password') {  //real backend password
      setMessage('Incorrect password. Please try again.');
      logSecurityEvent('2FA disable attempt failed');
      return;
    }
    setIsEnabled(false);
    setUserCode('');
    setInputCode(new Array(6).fill(''));
    setPassword('');
    setIsSecure(false); 
    setMessage('Two-factor authentication has been disabled.');
    logSecurityEvent('2FA disabled');
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 h-screen text-gray-800">
      <div className={`w-full max-w-md shadow-lg rounded-lg p-6 ${isSecure ? 'bg-green-50 dark:bg-green-900' : 'bg-white dark:bg-gray-800'}`}>
        <h1 className={`text-2xl font-bold mb-4 ${isSecure ? 'text-green-600' : 'dark:text-white'}`}>
          Two-Factor Authentication
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {isSecure
            ? 'Your account is secure with two-factor authentication enabled.'
            : 'Enhance your account security by enabling two-factor authentication.'}
        </p>

        {!isEnabled ? (
          <>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Create Your 2FA Code
            </label>
            <input
              type="password"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 shadow-sm bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2 mb-4"
              placeholder="Enter a secure code"
            />
            <button
              onClick={handleSetup}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none"
            >
              Enable Two-Factor Authentication
            </button>
          </>
        ) : (
          <>
            <p className="text-green-500 text-sm mb-4">
              Two-factor authentication is currently enabled.
            </p>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Verify Your 2FA Code
            </label>
            <div className="flex space-x-2 justify-center mb-4">
              {inputCode.map((char, index) => (
                <input
                  key={index}
                  type="text"
                  value={char}
                  onChange={(e) => handleInputChange(e.target.value, index)}
                  maxLength={1}
                  className="w-12 h-12 text-center border border-gray-300 dark:border-gray-700 shadow-sm bg-transparent dark:bg-gray-800 rounded-lg text-xl"
                />
              ))}
            </div>
            <button
              onClick={handleVerify}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-400 focus:outline-none mb-4"
            >
              Verify Code
            </button>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Enter Password to Disable 2FA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 shadow-sm bg-transparent dark:bg-gray-800 rounded-lg px-3 py-2 mb-4"
              placeholder="Enter your password"
            />
            <button
              onClick={handleDisable}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 focus:ring-2 focus:ring-red-400 focus:outline-none"
            >
              Disable Two-Factor Authentication
            </button>
          </>
        )}

        {message && (
          <p className={`mt-4 text-sm ${message.includes('successfully') ? 'text-green-600' : 'text-red-600'} dark:text-gray-400`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default TwoFacAuth;

/* ============== && •END OF COMPONENT• && ================= */
