'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaShareAlt, FaCopy, FaLinkedin, FaTwitter, FaFacebook, FaLink } from 'react-icons/fa';
import { SiWhatsapp, SiTelegram } from 'react-icons/si';
import { MdEmail } from 'react-icons/md';

interface ShareEventSectionProps {
    eventSlug: string;
    setToast: (toast: { type: 'error' | 'success'; message: string } | null) => void;
}

export const ShareEventSection: React.FC<ShareEventSectionProps> = ({ eventSlug, setToast }) => {
    const [activeTab, setActiveTab] = useState<'link' | 'social'>('social');
    const [copied, setCopied] = useState(false);
    const eventUrl = `${window.location.origin}/${eventSlug}`;

    const copyLink = () => {
        navigator.clipboard.writeText(eventUrl);
        setCopied(true);
        setToast({ type: 'success', message: 'Event link copied to clipboard!' });
        setTimeout(() => {
            setCopied(false);
            setToast(null);
        }, 3000);
    };

    const shareOnSocial = (platform: string) => {
        const text = `Hey! I'm turning up for this amazing event! Wanna come?`;
        let url = '';

        switch(platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(text)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(`${text} ${eventUrl}`)}`;
                break;
            case 'telegram':
                url = `https://t.me/share/url?url=${encodeURIComponent(eventUrl)}&text=${encodeURIComponent(text)}`;
                break;
            case 'email':
                url = `mailto:?subject=${encodeURIComponent('Check out this event!')}&body=${encodeURIComponent(`${text}\n\n${eventUrl}`)}`;
                break;
        }

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="max-w-3xl mx-auto my-6 md:my-12 px-4 md:px-0">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700"
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-[#f54502] to-[#d63a02] p-4 md:p-6">
                    <div className="absolute inset-0 bg-[url('/pattern/overcast.svg')] opacity-20" />
                    <h2 className="text-lg md:text-2xl font-bold text-white relative z-10 flex items-center">
                        <FaShareAlt className="mr-2 md:mr-3 text-sm md:text-base" />
                        Share This Event
                    </h2>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 md:mb-6">
                        {['social', 'link'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as 'social' | 'link')}
                                className={`px-3 md:px-4 py-2 font-medium text-xs md:text-sm flex items-center ${
                                    activeTab === tab 
                                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' 
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                {tab === 'link' ? <FaLink className="mr-1 md:mr-2 text-xs" /> : <FaShareAlt className="mr-1 md:mr-2 text-xs" />}
                                {tab === 'link' ? 'Copy Link' : 'Social Share'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'link' ? (
                        <div className="space-y-3 md:space-y-4">
                            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 md:p-3 rounded-lg">
                                <div className="truncate text-gray-800 dark:text-gray-200 text-xs md:text-sm flex-1 mr-2">
                                    {eventUrl}
                                </div>
                                <button 
                                    onClick={copyLink}
                                    className="p-1.5 md:p-2 text-gray-500 hover:text-blue-500 transition-colors flex items-center shrink-0"
                                >
                                    <FaCopy className="mr-1 text-xs md:text-sm" /> 
                                    <span className="text-xs md:text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            {[
                                { icon: FaTwitter, name: 'Twitter', platform: 'twitter', color: 'text-blue-400' },
                                { icon: FaFacebook, name: 'Facebook', platform: 'facebook', color: 'text-blue-600' },
                                { icon: FaLinkedin, name: 'LinkedIn', platform: 'linkedin', color: 'text-blue-700' },
                                { icon: SiWhatsapp, name: 'WhatsApp', platform: 'whatsapp', color: 'text-green-500' },
                                { icon: SiTelegram, name: 'Telegram', platform: 'telegram', color: 'text-blue-500' },
                                { icon: MdEmail, name: 'Email', platform: 'email', color: 'text-gray-600 dark:text-gray-300' },
                            ].map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => shareOnSocial(item.platform)}
                                    className="p-2 md:p-4 rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 
                                             dark:hover:bg-gray-600 transition-colors flex flex-col items-center justify-center"
                                >
                                    <item.icon className={`${item.color} text-lg md:text-2xl mb-1 md:mb-2`} />
                                    <span className="text-xs md:text-sm font-medium">{item.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer Message */}
                    <div className="mt-4 md:mt-6 bg-purple-50 dark:bg-purple-900/10 p-3 md:p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300">
                            Share this event with your network and let&apos;s make it unforgettable together!
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};