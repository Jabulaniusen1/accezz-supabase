import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="text-center px-4">
                <h1 className="text-9xl font-bold text-[#f54502]">404</h1>
                <div className="text-6xl font-medium py-8 text-gray-600">
                    oops! Page not found
                </div>
                <div className="text-xl text-gray-500 mb-8">
                    The page you&apos;re looking for doesn&lsquo;t exist or has been moved.
                </div>
                <div className="animate-bounce mb-8">
                    <span role="img" aria-label="confused face" className="text-6xl">
                        😕
                    </span>
                </div>
                <Link
                    to="/"
                    className="px-6 py-3 bg-[#f54502] hover:bg-[#f54502]/90 text-white 
                                         font-semibold rounded-lg transition-colors duration-300"
                >
                    Go back home
                </Link>
            </div>
        </div>
    );
};

export default NotFound;