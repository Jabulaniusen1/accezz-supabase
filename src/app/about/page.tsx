'use client';
import Layout from '@/components/Layout/Layout';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FaTicketAlt, FaChartLine, FaQrcode, FaLinkedinIn, FaTwitter } from 'react-icons/fa';

const whyChoose = [
  {
    Icon: FaTicketAlt,
    title: 'Effortless Event Creation',
    description:
      'Launch your event from the comfort of your home. Save time, resources, and money while managing your event with ease.',
  },
  {
    Icon: FaChartLine,
    title: 'Global Reach & Smart Marketing',
    description:
      'Market your event to a vast audience. Our platform amplifies your message and connects you with thousands, turning your vision into reality.',
  },
  {
    Icon: FaQrcode,
    title: 'Seamless Virtual Ticketing',
    description:
      'Experience secure, contactless entry with QR code virtual tickets. Enjoy fast, reliable check-ins that make every event unforgettable.',
  },
];

const AboutPage = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">

        {/* ── Hero ── */}
        <div className="relative bg-gray-950 pt-28 pb-24 overflow-hidden">
          {/* Background glows */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(245,69,2,0.25),transparent_60%)]" />
          <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-[#f54502] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative max-w-4xl mx-auto px-4 text-center"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-widest uppercase rounded-full border border-[#f54502]/40 text-[#f54502] bg-[#f54502]/10">
              About Us
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-[#f54502] to-[#ff8c69] bg-clip-text text-transparent">
                Accezz
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Revolutionising event management and ticket sales through
              innovative digital solutions — built for organisers, loved by
              attendees.
            </p>
          </motion.div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-24">

          {/* Row 1: For Event Organizers */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <div className="order-2 md:order-1 w-full md:w-3/5">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase rounded-full bg-[#f54502]/10 text-[#f54502]">
                Organisers
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-5">
                For Event Organizers
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Take your event management to the next level with our
                comprehensive organiser tools. We understand the challenges of
                event planning, which is why we&apos;ve created a platform that
                simplifies every aspect of ticket management. Track sales in
                real-time, monitor attendance patterns, and access detailed
                analytics to make data-driven decisions. Our platform is
                completely free to use, allowing you to focus on creating
                memorable events while we handle the technical aspects. With
                features like automated attendee management, customisable ticket
                designs, and integrated marketing tools, Accezz is your partner
                in successful event planning.
              </p>
            </div>
            <div className="order-1 md:order-2 w-full md:w-2/5 relative h-[280px] md:h-[340px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src="/calendar.png"
                alt="Event Organizers"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#f54502]/20 to-transparent" />
            </div>
          </motion.div>

          {/* Row 2: For Event Attendees */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            <div className="w-full md:w-2/5 relative h-[280px] md:h-[340px] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src="/calendar.png"
                alt="Event Attendees Experience"
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-tl from-[#f54502]/20 to-transparent" />
            </div>
            <div className="w-full md:w-3/5">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase rounded-full bg-[#f54502]/10 text-[#f54502]">
                Attendees
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-5">
                For Event Attendees
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Discover a world of possibilities with Accezz. As an attendee,
                you&apos;ll have seamless access to all the latest events in
                your city right at your fingertips. Our platform makes it
                effortless to browse, select, and purchase tickets for shows,
                games, exhibitions, and concerts. We&apos;ve implemented secure
                QR code-based entry systems and instant ticket delivery,
                ensuring a smooth experience from purchase to event entry. Never
                miss another event — with Accezz, you&apos;re always connected
                to the pulse of your city&apos;s entertainment scene.
              </p>
            </div>
          </motion.div>

          {/* ── Why Choose Accezz? ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-widest uppercase rounded-full border border-[#f54502]/40 text-[#f54502] bg-[#f54502]/10">
                Why Accezz?
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Why Choose Accezz?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {whyChoose.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.15 }}
                  className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-[#f54502]/40 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f54502] to-[#d63a02] flex items-center justify-center mb-6 shadow-lg shadow-[#f54502]/25 group-hover:scale-110 transition-transform duration-300">
                    <feature.Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-xs">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Meet the Team ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 mb-4 text-sm font-semibold tracking-widest uppercase rounded-full border border-[#f54502]/40 text-[#f54502] bg-[#f54502]/10">
                The People Behind It
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Meet the Team
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                A small, focused team passionate about making event management
                simple for everyone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { name: 'Ifiok Victor', role: 'CEO', initials: 'IV' },
                { name: 'Jabulani Usen', role: 'CTO', initials: 'JU' },
                { name: 'Dunamis Chima', role: 'Head of Operations', initials: 'DC' },
              ].map((person, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.15 }}
                  className="group flex flex-col items-center text-center p-8 rounded-2xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-[#f54502]/40 hover:shadow-xl hover:shadow-[#f54502]/5 transition-all duration-300"
                >
                  {/* Avatar placeholder */}
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f54502] to-[#d63a02] flex items-center justify-center shadow-lg shadow-[#f54502]/30 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-white text-2xl font-bold tracking-wide">
                        {person.initials}
                      </span>
                    </div>
                    {/* Online indicator dot */}
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-950" />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {person.name}
                  </h3>
                  <p className="text-sm font-medium text-[#f54502] mb-5">{person.role}</p>

                  {/* Social links — placeholders */}
                  <div className="flex items-center gap-3">
                    <button
                      className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-[#f54502] hover:text-[#f54502] transition-all duration-200"
                      aria-label={`${person.name} on LinkedIn`}
                    >
                      <FaLinkedinIn className="w-4 h-4" />
                    </button>
                    <button
                      className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-[#f54502] hover:text-[#f54502] transition-all duration-200"
                      aria-label={`${person.name} on Twitter`}
                    >
                      <FaTwitter className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Dark card with orange glow */}
            <div className="relative bg-gray-950 rounded-3xl p-12 md:p-16 text-center border border-white/10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,69,2,0.2),transparent_65%)] rounded-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Transform Your Event Management?
                </h2>
                <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
                  Join thousands of event organisers on Accezz — and experience
                  the future of event planning.
                </p>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white font-semibold rounded-xl shadow-lg shadow-[#f54502]/30 hover:shadow-[#f54502]/50 hover:from-[#d63a02] hover:to-[#b52e00] transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
