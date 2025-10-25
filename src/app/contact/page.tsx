'use client';

import { motion } from 'framer-motion';
import Layout from '@/components/Layout/Layout';

const ContactPage = () => {
    return (
        <Layout>
            <div className="relative min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 px-4 py-8">
                {/* Floating Blobs */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                    <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                    <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
                </div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-lg w-full shadow-lg z-10"
                >
                    <h1 className="text-white text-4xl font-bold text-center">Contact Us</h1>
                    <p className="text-white text-sm text-center mt-2">We&apos;d love to hear from you! Fill out the form below or book a call.</p>

                    {/* Form */}
                    <form className="mt-6">
                        <div className="mb-4">
                            <label className="text-white block text-sm font-medium">Name</label>
                            <input type="text" className="w-full px-4 py-3 mt-2 rounded-md bg-white/20 text-white placeholder-white focus:ring-2 focus:ring-white/40 outline-none" placeholder="Enter your name" required />
                        </div>
                        <div className="mb-4">
                            <label className="text-white block text-sm font-medium">Email</label>
                            <input type="email" className="w-full px-4 py-3 mt-2 rounded-md bg-white/20 text-white placeholder-white focus:ring-2 focus:ring-white/40 outline-none" placeholder="Enter your email" required />
                        </div>
                        <div className="mb-4">
                            <label className="text-white block text-sm font-medium">Message</label>
                            <textarea className="w-full px-4 py-3 mt-2 rounded-md bg-white/20 text-white placeholder-white focus:ring-2 focus:ring-white/40 outline-none" placeholder="Enter your message" required></textarea>
                        </div>
                        <button type="submit" className="w-full bg-white text-blue-600 font-medium py-3 rounded-lg hover:bg-blue-50 hover:scale-[1.02] transition-all duration-300">Send Message</button>
                    </form>
                </motion.div>

                {/* Call Booking Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-12 bg-white/10 backdrop-blur-md rounded-lg p-6 max-w-lg text-center shadow-lg z-10"
                >
                    <h2 className="text-white text-2xl font-bold">Book a Call</h2>
                    <p className="text-white text-sm mt-2">Need a direct conversation? Click below to schedule a call.</p>
                    <a 
                        href="https://calendly.com/mazinoishioma/30min" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="mt-4 inline-block bg-white text-blue-600 font-medium px-6 py-3 rounded-lg hover:bg-blue-50 hover:scale-[1.02] transition-all duration-300"
                    >
                        Book a Call
                    </a>
                </motion.div>

            </div>
        </Layout>
    );
};

export default ContactPage;
