'use client';
import { useMemo } from 'react';
import Layout from '@/components/Layout/Layout';
import { motion } from 'framer-motion';

const TermsAndConditionsPage = () => {
  // Memoize sections to prevent unnecessary recalculations
  const sections = useMemo(() => [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using Accezz, you agree to be legally bound by these Terms and Conditions. Continued use constitutes acceptance. If you disagree with any provision, you must immediately cease all use."
    },
    {
      title: "2. User Registration & Eligibility",
      content: "Users must be at least 18 years old and provide accurate information. You are solely liable for all activities under your account. Accezz reserves the right to suspend accounts with suspicious activity."
    },
    {
      title: "3. Event Creation & Organizer Obligations",
      content: "Organizers guarantee the legality, accuracy, and appropriateness of event details. Prohibited events include illegal activities, hate speech, or adult content. Accezz may remove events without notice."
    },
    {
      title: "4. Ticket Sales & Payments",
      content: "All ticket sales are final. Organizers receive 94% of ticket revenue minus payment processing fees. Accezz take only 6% commission on both online, and offline ticket sales. Organizers agree to:",
      subpoints: [
        "Accurate event pricing disclosure",
        "Clear communication of event details",
        "Compliance with all applicable laws"
      ]
    },
    {
      title: "5. No Refund Policy",
      content: "All sales are final. No refunds will be issued unless required by law. Organizers may set their own refund policies, but Accezz provides no refund processing services."
    },
    {
      title: "6. Digital Tickets & Validation",
      content: "Tickets are non-transferable unless allowed by the organizer. QR codes are cryptographically secured and valid only once. Duplication or fraudulent use voids the ticket. Accezz provides no ticket validation services."
    },
    {
      title: "7. Data Privacy & Security",
      content: "User data is processed per our Privacy Policy. We may share necessary data with organizers for event management but are not responsible for their data practices. Accezz provides no data privacy or security services."
    },
    {
      title: "8. Intellectual Property",
      content: "Platform content is owned by Accezz or licensors. Organizers retain ownership of event content but grant Accezz a license to display it for operational purposes."
    },
    {
      title: "9. Service Availability",
      content: "Accezz is provided 'as is'. We may modify, suspend, or terminate services without liability for maintenance, security, or force majeure events. Accezz provides no service availability or uptime guarantees."
    },
    {
      title: "10. Limitation of Liability",
      content: "Our liability is limited to fees paid in the preceding 12 months. We exclude liability for indirect, consequential, or punitive damages."
    },
    {
      title: "11. Governing Law",
      content: "Disputes are governed by the laws of Nigeria, with exclusive jurisdiction in Lagos courts."
    },
    {
      title: "12. Contact Information",
      content: <>For questions contact <a href="mailto:accezzlive@gmail.com" className="text-blue-500 underline">accezzlive@gmail.com</a></>
    }
  ], []);

  // Simple animation variant
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  return (
    <Layout>
      <div className="min-h-screen px-4 py-8 bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <div className="max-w-4xl mx-auto p-6 shadow-lg rounded-lg">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-center mb-4">Terms of Service</h1>
            <h2 className="text-xl text-center border-b pb-4 mb-6 dark:border-gray-700">
              Accezz Platform Terms
            </h2>
            <p className="text-center mb-8">
              <strong>Effective:</strong> {new Date().toLocaleDateString()}
            </p>
          </motion.div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="mb-6"
              >
                <h2 className="text-lg font-semibold border-b pb-2 dark:border-gray-700">
                  {section.title}
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  {section.content}
                </p>
                {section.subpoints && (
                  <ul className="mt-3 space-y-2 pl-5 list-disc text-gray-600 dark:text-gray-400">
                    {section.subpoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsAndConditionsPage;
