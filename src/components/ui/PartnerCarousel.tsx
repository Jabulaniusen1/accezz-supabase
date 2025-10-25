'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const PARTNER_LOGOS = [
    '/images/daddy-yard.jpeg',
    '/images/Airsplash.jpeg',
    '/images/wildboxs.png',
    '/images/Airplane.png'
];

const PartnerCarousel = () => {
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
            <div className="container mx-auto px-4">
                <h3 className="text-center text-3xl font-bold mb-10 text-gray-800 dark:text-white tracking-tight">
                    Trusted by Industry Leaders
                </h3>
                
                <div 
                    className="relative flex overflow-x-hidden before:absolute before:left-0 before:top-0 before:z-10 before:w-20 before:h-full before:bg-gradient-to-r before:from-gray-50 before:to-transparent dark:before:from-gray-900 after:absolute after:right-0 after:top-0 after:z-10 after:w-20 after:h-full after:bg-gradient-to-l after:from-gray-50 after:to-transparent dark:after:from-gray-900"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className={`flex animate-scroll ${isHovered ? 'pause-animation' : ''}`}>
                        {[...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS].map((logo, index) => (
                            <div 
                                key={index}
                                className="flex-shrink-0 mx-6 transition-all duration-300 hover:scale-110"
                            >
                                <div className="w-44 h-28 relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
                                    <Image 
                                        src={logo}
                                        alt={`Partner logo ${index + 1}`}
                                        fill
                                        className="object-contain p-2 filter contrast-125"
                                        sizes="(max-width: 768px) 100px, 176px"
                                        priority={index < 4}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                    display: flex;
                    width: max-content;
                }
                .pause-animation {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

export default PartnerCarousel;