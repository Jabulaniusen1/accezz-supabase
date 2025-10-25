'use client';
import React, { useState, useMemo } from 'react';
import { FaCheck, FaCrown, FaRegUser, FaFire, FaFilePdf, FaListAlt, FaShareAlt, FaStar, FaTag } from 'react-icons/fa';
import { MdEventAvailable, MdOutlineDashboard, MdCampaign } from 'react-icons/md';
import { RiAtLine} from 'react-icons/ri';
import { formatPrice } from '@/utils/formatPrice';

interface Feature {
  text: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

interface Plan {
  name: string;
  icon: React.ReactNode;
  price: number;
  period?: string;
  features: Feature[];
  buttonText: string;
  popular: boolean;
  badge?: string;
}

const PricingCard = () => {
  const [isYearly, setIsYearly] = useState(true);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  // Constants for social proof
  const PREMIUM_USERS = 2000;
  const FREE_USERS = 1562;
  const TOTAL_USERS = 5000;

  // Memoize plans to prevent unnecessary recalculations
  const plans = useMemo<Plan[]>(() => [
    {
      name: "Basic",
      icon: <FaRegUser className="w-5 h-5" />,
      price: 0,
      features: [
        { text: "Create up to 3 events", icon: <MdEventAvailable /> },
        { text: "Basic event template", icon: <MdOutlineDashboard /> },
        { text: "Basic analytics", icon: <FaCheck /> },
        { text: "Mobile ticket scanning", icon: <FaCheck /> },
      ],
      buttonText: "Get Started",
      popular: false
    },
    {
      name: "Premium",
      icon: <FaCrown className="w-5 h-5" />,
      price: isYearly ? 50.99 : 5.99,
      period: isYearly ? "/year" : "/month",
      features: [
        // CORE (AVAILABLE)
        { 
          text: "Unlimited events", 
          icon: <MdEventAvailable />, 
          highlight: true 
        },
        { 
          text: "Direct attendee messaging", 
          icon: <RiAtLine />, 
          highlight: true,
          tooltip: "Email ticket buyers individually"
        },
        { 
          text: "Event update broadcasts", 
          icon: <MdCampaign />,
          tooltip: "Send mass updates to all attendees"
        },

        // NEW ATTRACTIVE ADD-ONS (LOW DEV EFFORT)
        { 
          text: "Early-bird pricing tools", 
          icon: <FaTag />,
          highlight: true,
          tooltip: "Set timed discount tiers automatically"
        },
        { 
          text: "VIP ticket upgrades", 
          icon: <FaStar />,
          tooltip: "Offer premium add-ons post-purchase"
        },
        { 
          text: "Social media integrations", 
          icon: <FaShareAlt />,
          tooltip: "Auto-post events to Facebook/Instagram"
        },
        { 
          text: "Waitlist management", 
          icon: <FaListAlt />,
          highlight: true,
          tooltip: "Capture leads when events sell out"
        },
        { 
          text: "PDF ticket attachments", 
          icon: <FaFilePdf />,
          tooltip: "Add maps/schedules to ticket emails"
        }
      ],
      buttonText: "Upgrade Now - Limited Spots",
      popular: true,
      badge: "MOST FLEXIBLE"
    }
  ], [isYearly]);

  // Memoize savings calculation
  const savings = useMemo(() => 
    isYearly ? Math.round((5.99 * 12 - 50.99) / (5.99 * 12) * 100) : 0,
    [isYearly]
  );

  return (
    <section className="py-12 bg-gradient-to-br from-[#f54502]/5 to-[#f54502]/10 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4" id='pricing'>
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20 dark:text-[#f54502] mb-3 text-sm">
            <FaFire className="mr-1" />
            <span>Over {FREE_USERS}+ free users upgraded</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Pricing That <span className="text-[#f54502] dark:text-[#f54502]">Grows With You</span>
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Join {PREMIUM_USERS}+ successful organizers
          </p>

          <div className="flex items-center justify-center gap-3 mb-3">
            <span className={`text-sm ${!isYearly ? 'text-[#f54502] font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-16 h-8 bg-[#f54502] rounded-full flex items-center p-1"
              aria-label={`Switch to ${isYearly ? 'monthly' : 'yearly'} billing`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${isYearly ? 'translate-x-8' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm ${isYearly ? 'text-[#f54502] font-medium' : 'text-gray-500'}`}>
              Yearly <span className="text-green-600">({savings}% off)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl overflow-hidden transition-all
                         ${plan.popular ? 'border-2 border-[#f54502] bg-white dark:bg-gray-800' : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}
                         ${hoveredPlan === plan.name ? 'shadow-lg' : 'shadow-md'}`}
              onMouseEnter={() => setHoveredPlan(plan.name)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {plan.popular && plan.badge && (
                <div className="absolute top-3 right-3 rotate-12">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-white">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${plan.popular ? 'bg-[#f54502]/10 text-[#f54502] dark:bg-[#f54502]/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className={`text-3xl font-bold ${plan.popular ? 'text-[#f54502] dark:text-[#f54502]' : 'text-gray-900 dark:text-white'}`}>
                      {plan.price === 0 ? 'Free' : formatPrice(plan.price, '$')}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 dark:text-gray-400 mb-1 text-sm">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {plan.price > 0 && isYearly && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Equivalent to {formatPrice(4.25, '$')}/month
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li 
                      key={i}
                      className={`flex items-start gap-2 p-2 rounded ${feature.highlight ? 'bg-[#f54502]/5 dark:bg-[#f54502]/10' : ''}`}
                    >
                      <span className={`mt-0.5 ${feature.highlight ? 'text-[#f54502] dark:text-[#f54502]' : 'text-gray-500 dark:text-gray-400'}`}>
                        {feature.icon}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors
                             ${plan.popular ? 'bg-gradient-to-r from-[#f54502] to-[#d63a02] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white'}`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Added footnote as requested */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center">
            <FaCheck className="text-green-500 mr-1" /> Trusted by {TOTAL_USERS.toLocaleString()}+ event organizers
          </span>
          <span className="flex items-center">
            <FaCheck className="text-green-500 mr-1" /> 99.9% uptime guarantee
          </span>
          <span className="flex items-center">
            <FaCheck className="text-green-500 mr-1" /> 30-day money-back guarantee
          </span>
        </div>
      </div>
    </section>
  );
};

export default PricingCard;