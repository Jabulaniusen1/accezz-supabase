'use client';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { RefreshCw, AlertTriangle, Mail } from 'lucide-react';

export default function ServerDown() {
    useEffect(() => {
        document.title = 'Service Temporarily Unavailable';
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-2xl w-full bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center space-y-8 border border-slate-600/30"
            >
                <div className="space-y-6">
                    <motion.div
                        animate={{ 
                            y: [0, -5, 0],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 3,
                            ease: "easeInOut"
                        }}
                        className="flex justify-center"
                    >
                        <div className="p-5 bg-rose-500/20 rounded-full">
                            <AlertTriangle className="w-16 h-16 text-rose-400" strokeWidth={1.5} />
                        </div>
                    </motion.div>
                    
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold text-white">
                            503 Service Unavailable
                        </h1>
                        
                        <p className="text-xl text-slate-300">
                            Our servers are currently undergoing maintenance
                        </p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/50"
                >
                    <p className="text-slate-300 leading-relaxed">
                        We&apos;re experiencing technical difficulties due to high traffic on our servers. 
                        Our engineering team is working to resolve this as quickly as possible.
                    </p>
                </motion.div>

                <div className="flex flex-col items-center space-y-5">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-rose-500/30"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Refresh Page
                        </Link>
                    </motion.div>
                    
                    <div className="text-sm text-slate-400 pt-2 flex items-center justify-center gap-1">
                        <Mail className="w-4 h-4" />
                        Need help? Contact{' '}
                        <Link 
                            href="mailto:support@vtickets.com" 
                            className="text-rose-400 hover:underline hover:text-rose-300 transition-colors"
                        >
                            support@vtickets.com
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}