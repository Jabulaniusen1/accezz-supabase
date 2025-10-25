'use client';
import React from 'react';
import { FaRegCalendarAlt, FaTicketAlt, FaChartBar } from "react-icons/fa";

const FeaturedEvent = () => {
  const features = [
    {
      icon: <FaRegCalendarAlt className="text-[#f54502] dark:text-[#f54502] w-10 h-10" />, 
      title: "Effortless Event Creation",
      description:
        "Create, manage, and edit virtual events with our intuitive tools. Plan and schedule events with ease, and make updates anytime.",
    },
    {
      icon: <FaTicketAlt className="text-[#f54502] dark:text-[#f54502] w-10 h-10" />,
      title: "Smart Digital Ticketing",
      description:
        "Generate secure digital tickets with unique QR codes. Automatically send receipts via email or allow users to save them as PDFs for event validation.",
    },
    {
      icon: <FaChartBar className="text-[#f54502] dark:text-[#f54502] w-10 h-10" />,
      title: "Real-Time Event Analytics",
      description:
        "Monitor ticket sales, track earnings, and analyze event performance in real-time through your personalized dashboard.",
    },
  ];

  return (
    <section className="bg-gradient-to-b from-[#f54502] via-[#d63a02] to-[#f54502] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200 pb-2">
            Why Choose Accezz?
          </h2>
          <p className="text-lg md:text-xl text-gray-300 dark:text-gray-400 mt-4">
            Simplify event management, boost ticket sales, and engage your audience like never before.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white dark:bg-gray-800 rounded-xl p-8 shadow-xl 
                         hover:shadow-2xl dark:shadow-[#f54502]/30
                         transform hover:-translate-y-1 transition-all duration-300
                         animate-fade-in-up"
              style={{
                animationDelay: `${index * 150}ms`
              }}
            >
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-fit
                            group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mt-6 text-gray-900 dark:text-white
                           group-hover:text-[#f54502] dark:group-hover:text-[#f54502]
                           transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default FeaturedEvent;