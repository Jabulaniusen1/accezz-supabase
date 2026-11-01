import React from 'react';

/**
 * Line illustrations for event categories (64×64, stroke = currentColor), so
 * they take the text colour: grey at rest, brand orange when active.
 */
type IllustrationProps = React.SVGProps<SVGSVGElement>;

const Illustration = ({ children, ...props }: IllustrationProps) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

/** All events: a ticket */
export const AllEventsIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M10 18h44a2 2 0 0 1 2 2v8a4 4 0 0 0 0 8v8a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-8a4 4 0 0 0 0-8v-8a2 2 0 0 1 2-2z" />
    <path d="M40 22v20" strokeDasharray="2 4" />
    <path d="M16 28h15M16 35h10" />
    <path d="M48 29.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" strokeWidth={1.5} />
  </Illustration>
);

/** Community: two people side by side */
export const CommunityIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <circle cx="24" cy="17" r="7" />
    <circle cx="45" cy="21" r="6" />
    <path d="M10 54V42a14 14 0 0 1 28 0v12" />
    <path d="M38 35.5A11 11 0 0 1 56 44v10" />
    <path d="M17 54v-7M31 54v-7M50 54v-6" />
  </Illustration>
);

/** Art & Culture: carved mask with a crown of rays */
export const ArtCultureIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M20 23a12 12 0 0 1 24 0" />
    <path d="M19.8 18.6l-5.7-2.1M22.8 13.8l-4.2-4.2M27.6 10.8l-2.1-5.7M32 10V4M36.4 10.8l2.1-5.7M41.2 13.8l4.2-4.2M44.2 18.6l5.7-2.1" />
    <path d="M32 58c-8 0-12-12-12-22v-9a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v9c0 10-4 22-12 22z" />
    <path d="M24 33q3-3 6 0-3 2-6 0zM34 33q3-3 6 0-3 2-6 0z" />
    <path d="M32 35v7" />
    <path d="M23.5 40h3M24 43.5h3M37.5 40h3M37 43.5h3" />
    <path d="M29 49q3 2 6 0" />
  </Illustration>
);

/** Sports & Wellness: football */
export const SportsWellnessIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <circle cx="32" cy="32" r="22" />
    <path d="M32 24l7.6 5.5-2.9 9h-9.4l-2.9-9z" />
    <path d="M32 24v-7M39.6 29.5l6.7-2.1M36.7 38.5l4.1 5.6M27.3 38.5l-4.1 5.6M24.4 29.5l-6.7-2.1" />
    <path d="M22.7 12.1L32 17l9.3-4.9" />
    <path d="M48.1 17l-1.8 10.4 7.5 7.3" />
    <path d="M51.2 42.7l-10.4 1.4-4.6 9.5" />
    <path d="M27.8 53.6l-4.6-9.5-10.4-1.4" />
    <path d="M10.2 34.7l7.5-7.3-1.8-10.4" />
  </Illustration>
);

/** Career & Business: easel board with a rising chart */
export const CareerBusinessIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <rect x="8" y="10" width="48" height="4" rx="2" />
    <path d="M12 14v26M52 14v26" />
    <rect x="8" y="40" width="48" height="4" rx="2" />
    <path d="M18 34l7-7 6 4 9-10" />
    <path d="M35 21h5v5" />
    <path d="M32 44v4M24 56l6-8M40 56l-6-8" />
  </Illustration>
);

/** Spirituality & Religion: oil lamp */
export const SpiritualityIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M32 12c5 6 6 11 0 16-6-5-5-10 0-16z" />
    <path d="M32 21v4" />
    <path d="M20 14l3 3M44 14l-3 3M32 4v3" />
    <path d="M14 32h36c0 9-8 16-18 16s-18-7-18-16z" />
    <path d="M26 48l-2 6h16l-2-6" />
  </Illustration>
);

/** Food & Drink: burger */
export const FoodDrinkIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M14 30c0-10 8-16 18-16s18 6 18 16z" />
    <path d="M26 21l1.5 1M34 19l1.5 1M40 23.5l1.5 1M21 25l1.5.5" />
    <path d="M13 35.5q2.7-3 5.4 0t5.4 0 5.4 0 5.4 0 5.4 0 5.4 0 5.4 0" />
    <rect x="13" y="39" width="38" height="6" rx="3" />
    <path d="M14 48h36v1a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5z" />
  </Illustration>
);

/** Education & Workshops: graduation cap */
export const EducationIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M6 25l26-12 26 12-26 12z" />
    <path d="M16 30v11c0 4 7 8 16 8s16-4 16-8V30" />
    <path d="M54 27v12" />
    <circle cx="54" cy="42" r="2.5" />
  </Illustration>
);

/** Family & Lifestyle: home with a heart */
export const FamilyLifestyleIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M8 30L32 11l24 19" />
    <path d="M15 25v28h34V25" />
    <path d="M42 19v-7h5v11" />
    <path d="M32 46c-6-4-9-7-9-11a4.5 4.5 0 0 1 9-1.5 4.5 4.5 0 0 1 9 1.5c0 4-3 7-9 11z" />
  </Illustration>
);

/** Music & Entertainment: beamed notes */
export const MusicIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <path d="M26 46V17l24-5v29" />
    <path d="M26 24l24-5" />
    <ellipse cx="21" cy="46" rx="5" ry="4" />
    <ellipse cx="45" cy="41" rx="5" ry="4" />
  </Illustration>
);

/** Technology & Innovation: laptop with code */
export const TechnologyIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <rect x="12" y="14" width="40" height="27" rx="3" />
    <path d="M6 45h52l-4 6H10z" />
    <path d="M26 23l-5 4.5 5 4.5M38 23l5 4.5-5 4.5M34 21l-4 13" />
  </Illustration>
);

/** Any other category: calendar */
export const OtherCategoryIllustration = (props: IllustrationProps) => (
  <Illustration {...props}>
    <rect x="10" y="16" width="44" height="38" rx="4" />
    <path d="M10 26h44M22 11v9M42 11v9" />
    <path d="M20 35h3M30.5 35h3M41 35h3M20 44h3M30.5 44h3" strokeWidth={3} />
  </Illustration>
);

const CATEGORY_ILLUSTRATIONS: Record<string, (props: IllustrationProps) => React.ReactElement> = {
  all: AllEventsIllustration,
  community: CommunityIllustration,
  'art-culture': ArtCultureIllustration,
  'sports-wellness': SportsWellnessIllustration,
  'career-business': CareerBusinessIllustration,
  'spirituality-religion': SpiritualityIllustration,
  'food-drink': FoodDrinkIllustration,
  'education-workshops': EducationIllustration,
  'family-lifestyle': FamilyLifestyleIllustration,
  'music-entertainment': MusicIllustration,
  'technology-innovation': TechnologyIllustration,
};

/** The illustration for a category slug, or a calendar for unknown ones. */
export function CategoryIllustration({ slug, ...props }: IllustrationProps & { slug: string }) {
  const Component = CATEGORY_ILLUSTRATIONS[slug] ?? OtherCategoryIllustration;
  return <Component {...props} />;
}
