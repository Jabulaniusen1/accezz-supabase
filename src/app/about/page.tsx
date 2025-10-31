'use client';
import Layout from '@/components/Layout/Layout';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
// import { FaTicketAlt, FaChartLine, FaQrcode, FaUsers } from 'react-icons/fa';


const AboutPage = () => {
    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gray-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
                    <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gray-500 dark:bg-gray-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                    <div className="absolute bottom-1/1 left-1/3 w-64 h-64 bg-gray-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 py-20">
                    {/*= ========== HERO SECTION ========== */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-[2rem] md:text-5xl font-bold text-gray-700 dark:text-white mb-6">
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-blue-400">Accezz</span>
                        </h1>
                        <p className="sm:text-xl text-base text-gray-700 dark:text-blue-100 max-w-3xl mx-auto">
                            Revolutionizing event management and ticket sales through innovative digital solutions.
                        </p>
                    </motion.div>

                   {/* ========= MAIN CONTENTS ========= */}
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mb-16 w-full text-center px-4"
                    >
                    <div className="space-y-16">
                        {/* Row 1: For Event Organizers */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 w-full">
                        {/* Text Section - 60% width */}
                        <div className="order-2 md:order-1 w-full md:w-3/5 text-left">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            For Event Organizers
                            </h2>
                            <p className="text-base md:text-lg text-gray-700 dark:text-blue-100 leading-relaxed">
                            Take your event management to the next level with our comprehensive organizer tools. We understand the challenges of event planning, which is why we&apos;ve created a platform that simplifies every aspect of ticket management. Track sales in real-time, monitor attendance patterns, and access detailed analytics to make data-driven decisions. Our platform is completely free to use, allowing you to focus on creating memorable events while we handle the technical aspects. With features like automated attendee management, customizable ticket designs, and integrated marketing tools, Accezz is your partner in successful event planning.
                            </p>
                        </div>
                        {/* Image Section - 40% width */}
                        <div className="order-1 md:order-2 w-full md:w-2/5 relative h-[300px] md:h-[300px] rounded-xl">
                            <Image
                            src="https://img.freepik.com/free-photo/appointment-agenda-reminder-personal-organizer-calendar-concept_53876-13792.jpg?t=st=1739448835~exp=1739452435~hmac=d414ab78769b21c0d5705aa0b3c26d162aaaf985a7a7c3a713ec130b36a114f0&w=740"
                            alt="Event Organizers"
                            fill
                            className="object-cover rounded-xl shadow-2xl transform transition-transform hover:scale-105"
                            />
                        </div>
                        </div>

                        {/* Row 2: For Event Attendees */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 w-full">
                        {/* Image Section - 40% width */}
                        <div className="order-1 w-full md:w-2/5 relative h-[260px] md:h-[300px] rounded-xl">
                            <Image
                            src="/calendar.png"
                            alt="Event Attendees Experience"
                            fill
                            className="object-cover rounded-xl shadow-2xl transform transition-transform hover:scale-105"
                            />
                        </div>
                        {/* Text Section - 60% width */}
                        <div className="order-2 w-full md:w-3/5 text-left">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            For Event Attendees
                            </h2>
                            <p className="text-base md:text-lg text-gray-700 dark:text-blue-100 leading-relaxed">
                            Discover a world of possibilities with Accezz. As an attendee, you&apos;ll have seamless access to all the latest events in your city right at your fingertips. Our platform makes it effortless to browse, select, and purchase tickets for shows, games, exhibitions, and concerts. We&apos;ve implemented secure QR code-based entry systems and instant ticket delivery, ensuring a smooth experience from purchase to event entry. Never miss another event – with Accezz, you&apos;re always connected to the pulse of your city&apos;s entertainment scene.
                            </p>
                        </div>
                        </div>
                    </div>
                    </motion.div>



                    {/* ========= FEATURE SECTION ========= */}
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="w-full text-center mb-16 text-gray-800 dark:text-white px-4"
                    >
                    <h2 className="text-3xl font-bold mb-12">Why Choose Accezz?</h2>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                        {[
                            {
                                title: "Effortless Event Creation",
                                description:
                                "Launch your event from the comfort of your home. Save time, resources, and money while managing your event with ease."
                            },
                            {
                                title: "Global Reach & Smart Marketing",
                                description:
                                "Market your event to a vast audience. Our platform amplifies your message and connects you with thousands, turning your vision into reality."
                            },
                            {
                                title: "Seamless Virtual Ticketing",
                                description:
                                "Experience secure, contactless entry with our QR code virtual tickets. Enjoy fast, reliable check-ins that make every event unforgettable."
                            }
                        ].map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className="flex flex-col items-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
                            <span className="text-white text-xl font-bold">
                                {feature.title.charAt(0)}
                            </span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-base text-gray-600 dark:text-blue-100 max-w-xs">
                            {feature.description}
                            </p>
                        </motion.div>
                        ))}
                    </div>
                    </motion.div>


                    {/* CTA Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="text-center"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                            Ready to Transform Your Event Management?
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-blue-100 mb-8">
                            Join Accezz today and experience the future of event planning!
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl
                                            transform transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            Get Started Free
                        </Link>
                    </motion.div>
                </div>
            </div>
        </Layout>
    );
};

export default AboutPage;