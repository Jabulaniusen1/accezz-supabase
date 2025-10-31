'use client'

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const FailedPage = () => {
    const router = useRouter();

    const handleTryAgain = () => {
        // Get the stored payment info
        const storedPayment = localStorage.getItem('pendingPayment');
        if (storedPayment) {
            const { paymentLink } = JSON.parse(storedPayment);
            if (paymentLink) {
                window.location.href = paymentLink;
            }
        }
    };

    const handleHomeRedirect = () => {
        router.push("/");
    };

    return (
        <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-4 py-8">
            {/* Floating Blobs */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            {/* Failed Animation and Icon */}
            <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
                className="bg-white p-8 rounded-full shadow-2xl z-10"
            >
                <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="w-20 h-20 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </motion.svg>
            </motion.div>

            {/* Heading */}
            <motion.h1
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-white text-4xl md:text-5xl font-bold mt-8 text-center z-10"
            >
                Payment Failed
            </motion.h1>

            {/* Message */}
            <motion.p
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-white text-lg md:text-xl mt-6 text-center max-w-2xl px-4 z-10"
            >
                We couldn&apos;t process your payment. This could be due to a connection issue,
                insufficient funds, or the transaction was cancelled.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md px-4 z-10"
            >
                <button
                    onClick={handleTryAgain}
                    className="backdrop-blur-md bg-white text-red-600 text-base font-medium px-6 py-3 rounded-lg 
                    shadow-[0_4px_12px_rgba(255,255,255,0.3)] transition-all duration-300 
                    hover:bg-red-50 hover:shadow-[0_8px_20px_rgba(255,255,255,0.4)] 
                    hover:scale-[1.02] focus:ring-2 focus:ring-white/40 w-full"
                >
                    Try Again
                </button>
                <button
                    onClick={handleHomeRedirect}
                    className="backdrop-blur-md bg-transparent border-2 border-white text-white text-base font-medium px-6 py-3 rounded-lg 
                    shadow-[0_4px_12px_rgba(255,255,255,0.2)] transition-all duration-300 
                    hover:bg-white/10 hover:shadow-[0_8px_20px_rgba(255,255,255,0.3)] 
                    hover:scale-[1.02] focus:ring-2 focus:ring-white/40 w-full"
                >
                    Return Home
                </button>
            </motion.div>

            {/* Support Information */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="mt-12 bg-white/10 backdrop-blur-md rounded-lg p-6 max-w-md mx-4 z-10"
            >
                <div className="flex items-center space-x-3 mb-2">
                    <svg
                        className="w-6 h-6 text-yellow-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="text-yellow-300 font-bold">Need Help?</span>
                </div>
                <p className="text-white text-sm">
                    If you continue to experience issues, please contact our support team at{" "}
                    <a href="mailto:accezzlive@gmail.com" className="underline">
                        accezzlive@gmail.com
                    </a>
                </p>
            </motion.div>
        </div>
    );
};

export default FailedPage;