'use client';
import { Suspense, lazy } from "react";
import Hero from "./components/home/Hero";
// import { BASE_URL } from "../../config";
// import axios from "axios";
import ServerDown from "./503/page";
import { useServerStatus } from "@/hooks/useEvents";
import { CardSkeleton } from "@/components/ui/Skeleton";
// import PartnerCarousel from "@/components/ui/PartnerCarousel";
import Footer from "./components/layout/Footer";

// Use lazy loading instead of dynamic for better performance
const EventCalendar = lazy(() => import('@/components/Calendar/EventCalendar'));
// const FeaturedEvent = lazy(() => import("./components/home/FeaturedEvent"));
const LatestEvent = lazy(() => import("./components/home/LatestEvent"));
const AllEvents = lazy(() => import("./components/home/AllEvents"));
// const Trending = lazy(() => import("./components/home/Trending"));
const Tutorial = lazy(() => import("./components/home/Tutorial"));

// Reusable skeleton component
const GridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
    {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
  </div>
);

export default function Home() {
  const isServerDown = useServerStatus();

  if (isServerDown) {
    return <ServerDown />;
  }

  return (
    <main>
      <Suspense fallback={<div>Loading calendar...</div>}>
        <EventCalendar />
      </Suspense>
      <Hero />
      
      {/* Separate Suspense boundaries for better component loading */}
      <Suspense fallback={<CardSkeleton />}>
        <EventCalendar />
      </Suspense>
      
      <Suspense fallback={<div>Loading latest event...</div>}>
        <LatestEvent />
      </Suspense>
      
      <Suspense fallback={<GridSkeleton />}>
        <AllEvents />
      </Suspense>
      
      {/* <Suspense fallback={<div>Loading trending events...</div>}>
        <Trending />
      </Suspense> */}
      
      <Suspense fallback={<div>Loading tutorial...</div>}>
        <Tutorial />
      </Suspense>
      
      <Footer />
    </main>
  );
}
