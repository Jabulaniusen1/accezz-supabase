"use client";

import React from "react";
import Layout from "@/components/Layout/Layout";

const sections = [
  {
    title: "1. Overview",
    body: [
      "This Privacy Policy explains how Accezz (“we”, “our”, “us”) collects, uses, and protects information when you create, host, or purchase tickets for events on our platform.",
      "By using Accezz you consent to the practices described below. If you do not agree with any part of this policy, please discontinue using our services.",
    ],
  },
  {
    title: "2. Information We Collect",
    items: [
      {
        heading: "Account & Profile Information",
        detail:
          "Name, email, phone number, and password when you create an account. Organisers may also provide business details and payout preferences.",
      },
      {
        heading: "Event & Ticket Data",
        detail:
          "Event descriptions, schedules, images, ticket types, pricing, attendee lists, and communications shared between organisers and buyers.",
      },
      {
        heading: "Payment Information",
        detail:
          "Card and bank details are handled securely by our payment partners. We store limited tokens needed to confirm successful transactions.",
      },
      {
        heading: "Usage Data",
        detail:
          "Device information, browser type, IP address, access times, and pages viewed to improve performance and guard against misuse.",
      },
      {
        heading: "Support Interactions",
        detail:
          "Messages, recordings, or attachments submitted to our support team or through embedded chat tools.",
      },
    ],
  },
  {
    title: "3. How We Use Information",
    items: [
      "To create and manage organiser and attendee accounts.",
      "To process ticket purchases, refunds, payouts, and financial reporting.",
      "To power event discovery, reminders, confirmations, and post-event follow ups.",
      "To deliver personalised product experiences and communicate service updates.",
      "To monitor fraudulent activity, enforce platform policies, and comply with legal obligations.",
      "To analyse feature adoption, performance, and build new capabilities.",
    ],
  },
  {
    title: "4. Sharing Information",
    items: [
      "Organisers receive attendee details required to manage their events. They must protect the information and use it solely for the purchased event.",
      "Attendees receive organiser contact details on tickets and confirmations.",
      "Trusted third parties help us run infrastructure, analytics, payments, messaging, and support. Each partner is bound by confidentiality and data protection obligations.",
      "We may disclose data if required by law, court order, or to defend our rights and the safety of users.",
    ],
  },
  {
    title: "5. Data Retention",
    body: [
      "We retain information for as long as your account is active or as needed to provide services. Certain financial and audit logs are stored for the period required by regulation in each jurisdiction.",
    ],
  },
  {
    title: "6. Your Choices",
    items: [
      "Update or correct account details in your dashboard at any time.",
      "Download invoices, attendee exports, and event records directly from your organiser tools.",
      "Opt-out of marketing emails using the unsubscribe link or within notification settings.",
      "Request deletion of personal information by contacting privacy@accezz.io. Note that legal or legitimate interests may prevent removal of some records.",
    ],
  },
  {
    title: "7. Children’s Privacy",
    body: [
      "Accezz is not directed to children under 16 and we do not knowingly collect information from minors without appropriate consent. If you believe a minor has provided personal data, please contact us for removal.",
    ],
  },
  {
    title: "8. International Transfers",
    body: [
      "We operate across multiple regions. When data moves across borders, we implement safeguards consistent with applicable data protection laws, including approved contractual clauses and encryption in transit and at rest.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We use administrative, technical, and physical measures to protect information (including role-based access, encryption, logging, and continuous monitoring). Despite our efforts, no system is completely secure—please protect your password and notify us of any suspicious activity.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    body: [
      "We may update this privacy policy to reflect changes to our practices. If updates are material, we will alert you via the dashboard, email, or in-app notifications. Continued use of Accezz after the update means you accept the new terms.",
    ],
  },
  {
    title: "11. Contact",
    body: [
      "Questions or requests regarding this Privacy Policy can be sent to privacy@accezz.io or through the contact form on accezz.io/contact.",
    ],
  },
];

const PrivacyPolicyPage = () => {
  return (
    <Layout>
      <div className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#f54502]">
              Privacy Policy
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">
              Your Privacy, Our Commitment
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-gray-500 sm:text-base">
              We built Accezz so organisers and attendees can collaborate confidently. This policy outlines how we collect, use, and safeguard the information you share with us.
            </p>
          </header>

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>

                {section.body &&
                  section.body.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
                      {paragraph}
                    </p>
                  ))}

                {section.items && (
                  <ul className="mt-5 space-y-3 text-sm text-gray-600 sm:text-base">
                    {section.items.map((item, index) => {
                      if (typeof item === "string") {
                        return (
                          <li key={index} className="flex gap-3 leading-relaxed">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f54502]" />
                            <span>{item}</span>
                          </li>
                        );
                      }

                      return (
                        <li key={item.heading} className="leading-relaxed">
                          <p className="font-medium text-gray-700">{item.heading}</p>
                          <p className="mt-1 text-sm text-gray-600 sm:text-base">{item.detail}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicyPage;

