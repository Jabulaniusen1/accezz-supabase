"use client";

import React from "react";
import Layout from "@/components/Layout/Layout";

const sections = [
  {
    title: "1. Overview",
    body: [
      "This Refund Policy explains how Accezz (“we”, “our”, “us”) supports organisers and attendees when ticket orders need to be changed, cancelled, or refunded.",
      "Organisers set the rules for their events. Accezz provides tools and payment rails to help them manage those rules responsibly.",
    ],
  },
  {
    title: "2. Organiser Responsibilities",
    items: [
      "Publish clear refund terms on the event page (window for cancellations, handling of booking fees, partial refunds).",
      "Respond to attendee refund requests within 3 business days.",
      "Use Accezz order management to approve, reject, or partially refund requests so attendees receive accurate updates.",
      "Ensure all outstanding payouts have sufficient balance to cover approved refunds.",
    ],
  },
  {
    title: "3. Attendee Options",
    items: [
      "Review the organiser’s refund terms before purchase.",
      "Submit a refund request directly from the order confirmation page or via the Accezz mobile ticket.",
      "Contact the organiser using the support link in the confirmation email if additional context is needed.",
      "Escalate to Accezz Support if there is no response after 3 business days.",
    ],
  },
  {
    title: "4. Refund Windows",
    items: [
      "Organisers can define full, partial, or no-refund windows up until event start.",
      "Events without explicit policies default to: full refunds up to 7 days before the event, and at organiser discretion thereafter.",
      "No refunds are processed once an event has concluded unless mandated by law or under our Force Majeure guidelines.",
    ],
  },
  {
    title: "5. Service Fees",
    body: [
      "Accezz charges organisers a 6% fee on paid tickets. When a refund is issued before payouts, fees are automatically reversed. Refunds processed after the organiser receives payouts will deduct the refundable amount from future balances.",
    ],
  },
  {
    title: "6. Event Changes & Cancellations",
    items: [
      "Organisers must notify attendees immediately through the Accezz dashboard if dates, venues, or formats change.",
      "If an event is cancelled, organisers must offer attendees a full refund or a rescheduled date. Refunds for cancelled events must be initiated within 10 business days.",
      "Accezz reserves the right to automatically refund attendees if the organiser fails to act or if we detect fraudulent behaviour.",
    ],
  },
  {
    title: "7. Force Majeure",
    body: [
      "In cases of natural disasters, government restrictions, public health emergencies, or other events outside the organiser’s control, Accezz will work with both organisers and attendees to determine fair resolutions, which may include rescheduling, crediting, or refunding orders.",
    ],
  },
  {
    title: "8. Chargebacks",
    body: [
      "If an attendee disputes a charge with their bank, Accezz will notify the organiser and provide documentation. Chargeback fees and liabilities are passed on to the organiser, and unresolved disputes may result in withheld payouts or account suspension.",
    ],
  },
  {
    title: "9. Contact & Support",
    body: [
      "For assistance with refunds or escalations, contact refunds@accezz.io or reach out via the support widget inside your organiser dashboard.",
    ],
  },
  {
    title: "10. Policy Updates",
    body: [
      "We may update this Refund Policy to reflect platform changes or legal requirements. Material updates will be communicated through organiser notices or email.",
    ],
  },
];

const RefundPolicyPage = () => {
  return (
    <Layout>
      <div className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#f54502]">
              Refund Policy
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">
              Fair Resolutions for Organisers & Attendees
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-gray-500 sm:text-base">
              Our refund framework balances organiser flexibility with attendee protection, so every event can run smoothly even when plans change.
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
                    {section.items.map((item, index) => (
                      <li key={index} className="flex gap-3 leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f54502]" />
                        <span>{item}</span>
                      </li>
                    ))}
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

export default RefundPolicyPage;

