"use client";
import React, { useState } from "react";
import { FiMapPin, FiCalendar, FiShoppingBag, FiSliders } from "react-icons/fi";

type Market = {
  label: string;
  currency: string;
  subtitle: string;
};

const markets: Market[] = [
  { label: "Nigeria", currency: "₦", subtitle: "Payouts in Nigerian naira" },
  { label: "Ghana", currency: "GH₵", subtitle: "Payouts in Ghanaian cedi" },
  { label: "Kenya", currency: "KSh", subtitle: "Payouts in Kenyan shilling" },
  { label: "South Africa", currency: "R", subtitle: "Payouts in South African rand" },
  { label: "United States", currency: "$", subtitle: "Payouts in US dollar" },
  { label: "United Kingdom", currency: "£", subtitle: "Payouts in British pound" },
  { label: "Eurozone", currency: "€", subtitle: "Payouts in euro" },
  { label: "United Arab Emirates", currency: "AED", subtitle: "Payouts in UAE dirham" },
];

const featureCards = [
  {
    title: "Event Management",
    icon: <FiCalendar className="h-5 w-5" />,
    items: [
      "Unlimited physical & virtual events",
      "Recurring schedules and multi-day timelines",
      "Secret locations & venue release controls",
      "Rich gallery uploads and hero media",
      "Built-in virtual access links",
      "Real-time attendee dashboards",
    ],
  },
  {
    title: "Ticketing & Payments",
    icon: <FiShoppingBag className="h-5 w-5" />,
    items: [
      "No fee on free tickets",
      "6% flat fee per paid ticket — no extras",
      "Pass fees to attendees or absorb them",
      "Advanced ticket types & inventory limits",
      "Instant order receipts & QR codes",
      "Automated refund handling",
    ],
  },
  {
    title: "Customisation",
    icon: <FiSliders className="h-5 w-5" />,
    items: [
      "Custom event pages with branded themes",
      "Unlimited checkout questions",
      "Personalised confirmation emails & SMS",
      "Host analytics & payout reporting",
      "Team roles and collaborator access",
    ],
  },
];

const PricingCard = () => {
  const [selectedMarket, setSelectedMarket] = useState<Market>(markets[0]);

  return (
    <section className="bg-white py-16 sm:py-20" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Simple pricing. Sign Up for free.
          </h1>
          <p className="mt-3 text-sm text-gray-500 sm:mt-4 sm:text-lg">
            Host unlimited free events at zero cost. When you collect payments, we keep a simple flat fee.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {markets.map((market) => {
              const isActive = market.label === selectedMarket.label;
              return (
            <button
                  key={market.label}
                  onClick={() => setSelectedMarket(market)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[#f54502] bg-[#fff0e7] text-[#f54502]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#f54502]/60 hover:text-[#f54502]"
                  }`}
                >
                  <FiMapPin className={isActive ? "text-[#f54502]" : "text-gray-400"} />
                  {market.label}
            </button>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-[#ffd9c9] bg-[#fff4ee] px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
              <p className="text-xs font-medium uppercase tracking-wide text-[#f54502] sm:text-sm">
                6% flat fee — no add-ons
              </p>
              <p className="mt-3 text-4xl font-semibold text-gray-900 sm:mt-4 sm:text-5xl">6%</p>
              <p className="mt-2 text-xs text-gray-600 sm:mt-3 sm:text-sm">
                {selectedMarket.subtitle}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[#f54502] sm:mt-1">
                Keep 94% of every paid ticket
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm sm:rounded-[28px] sm:p-8"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0e7] text-[#f54502] sm:mb-5 sm:h-12 sm:w-12">
                {card.icon}
                </div>
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">{card.title}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600 sm:mt-4">
                {card.items.map((item) => (
                  <li key={item} className="leading-relaxed">
                    {item}
                    </li>
                  ))}
                </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingCard;