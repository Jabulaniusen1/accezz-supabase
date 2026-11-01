"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { useAllEvents } from "@/hooks/useEvents";
import { supabase } from "@/utils/supabaseClient";
import { formatEventDate } from "@/utils/formatDateTime";
import { formatPrice } from "@/utils/formatPrice";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { CategoryIllustration } from "@/components/icons/CategoryIllustrations";
import {
  Calendar,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
} from '@/icon-adapters/lucide-react';

type CategoryRecord = {
  id: string;
  name: string;
  slug: string | null;
};

const normaliseCategoryKey = (slug?: string | null, name?: string | null) => {
  if (slug && slug.trim()) return slug.toLowerCase();
  if (!name) return "other";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

const FALLBACK_CATEGORIES: CategoryRecord[] = [
  { id: "community", name: "Community", slug: "community" },
  { id: "art", name: "Art & Culture", slug: "art-culture" },
  { id: "sports", name: "Sports & Wellness", slug: "sports-wellness" },
  { id: "career", name: "Career & Business", slug: "career-business" },
  { id: "spirituality", name: "Spirituality & Religion", slug: "spirituality-religion" },
  { id: "food", name: "Food & Drink", slug: "food-drink" },
  { id: "education", name: "Education & Workshops", slug: "education-workshops" },
  { id: "family", name: "Family & Lifestyle", slug: "family-lifestyle" },
  { id: "music", name: "Music & Entertainment", slug: "music-entertainment" },
  { id: "technology", name: "Technology & Innovation", slug: "technology-innovation" },
];

const PAGE_SIZE = 8;

const ENDED_BUFFER_MS = 24 * 60 * 60 * 1000; // 24 hours after start

const isEventEnded = (event: { endTime?: string | null; startTime?: string; date?: string }): boolean => {
  const now = Date.now();
  if (event.endTime) return new Date(event.endTime).getTime() < now;
  const start = event.startTime || event.date;
  if (!start) return false;
  return new Date(start).getTime() + ENDED_BUFFER_MS < now;
};

const EventsExplorerPage = () => {
  const { data: events = [], isLoading } = useAllEvents(true);
  const [categories, setCategories] = useState<CategoryRecord[]>([{ id: "all", name: "All Events", slug: "all" }]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<"all" | "virtual" | "in-person">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from("event_categories")
          .select("id, name, slug")
          .order("name", { ascending: true });

        if (error) throw error;

        if (data && data.length) {
          const mapped = data
            .map((category) => ({
              id: category.id,
              name: category.name,
              slug: normaliseCategoryKey(category.slug, category.name),
            }))
            .filter((category) => category.slug !== "all");

          setCategories([
            { id: "all", name: "All Events", slug: "all" },
            ...mapped.sort((a, b) => a.name.localeCompare(b.name)),
          ]);
        } else {
          setCategories([
            { id: "all", name: "All Events", slug: "all" },
            ...FALLBACK_CATEGORIES,
          ]);
        }
      } catch (error) {
        console.error("Failed to load categories", error);
        setCategories([
          { id: "all", name: "All Events", slug: "all" },
          ...FALLBACK_CATEGORIES,
        ]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const locationOptions = useMemo(() => {
    const locations = new Set<string>();
    events.forEach((event) => {
      if (event.country) locations.add(event.country);
      else if (event.city) locations.add(event.city);
      else if (event.location) locations.add(event.location);
    });
    return ["all", ...Array.from(locations)];
  }, [events]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, selectedLocation, formatFilter, events.length]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const categoryKey = normaliseCategoryKey(event.categorySlug, event.categoryName ? event.categoryName : event.categoryCustom);
      const eventMatchesCategory =
        selectedCategory === "all" ||
        categoryKey === selectedCategory ||
        normaliseCategoryKey(event.categorySlug, event.categoryName) === selectedCategory ||
        normaliseCategoryKey(undefined, event.categoryCustom) === selectedCategory;

      const haystack = `${event.title} ${event.description ?? ""} ${event.location ?? ""} ${
        event.city ?? ""
      } ${event.country ?? ""}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());

      const matchesLocation =
        selectedLocation === "all" ||
        event.country === selectedLocation ||
        event.city === selectedLocation ||
        event.location === selectedLocation;

      const matchesFormat =
        formatFilter === "all" ||
        (formatFilter === "virtual" && event.isVirtual) ||
        (formatFilter === "in-person" && !event.isVirtual);

      return eventMatchesCategory && matchesSearch && matchesLocation && matchesFormat;
    });
  }, [events, selectedCategory, searchTerm, selectedLocation, formatFilter]);

  // Upcoming events first (nearest first), ended events at the tail (most recent past first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aEnded = isEventEnded(a);
    const bEnded = isEventEnded(b);
    if (aEnded !== bEnded) return aEnded ? 1 : -1;
    const aMs = new Date(a.startTime || a.date || 0).getTime();
    const bMs = new Date(b.startTime || b.date || 0).getTime();
    return aEnded ? bMs - aMs : aMs - bMs;
  });

  const totalMatches = sortedEvents.length;
  const totalPages = Math.ceil(totalMatches / PAGE_SIZE) || 1;
  const paginatedEvents = sortedEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const scrollCategories = (direction: "left" | "right") => {
    const container = categoryScrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const handleViewDetails = (slug?: string | null) => {
    if (!slug) return;
    const link = `${window.location.origin}/${slug}`;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const renderCategoryButton = (category: CategoryRecord) => {
    const key = normaliseCategoryKey(category.slug, category.name);
    const isActive = selectedCategory === key;

    return (
      <button
        key={category.id}
        onClick={() => setSelectedCategory(key)}
        aria-pressed={isActive}
        className={`group flex w-[104px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl px-2 pb-2 pt-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:w-[144px] ${
          isActive ? "text-brand" : "text-gray-400 hover:text-brand"
        }`}
      >
        <CategoryIllustration
          slug={key}
          className="h-14 w-14 transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-[72px] sm:w-[72px]"
        />
        <span
          className={`flex min-h-[2.5rem] items-start text-balance text-center text-sm font-semibold leading-snug ${
            isActive ? "text-brand" : "text-gray-800 group-hover:text-brand"
          }`}
        >
          {category.name}
        </span>
        <span className={`h-0.5 w-8 rounded-full transition-colors ${isActive ? "bg-brand" : "bg-transparent"}`} />
      </button>
    );
  };

  return (
    <Layout>
      <div className="bg-white py-16 sm:py-20">
        <div className="page-container">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Discover Events</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Find your next event</h1>
          </header>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex h-12 flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, host, or city"
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 sm:text-base"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedLocation}
                  onChange={(event) => setSelectedLocation(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-white pl-11 pr-12 text-sm font-medium text-gray-600 shadow-sm focus:border-brand focus:outline-none sm:w-48"
                >
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All locations" : option}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
              </div>

              <div className="relative">
                <select
                  value={formatFilter}
                  onChange={(event) => setFormatFilter(event.target.value as typeof formatFilter)}
                  className="h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-white pl-4 pr-11 text-sm font-medium text-gray-600 shadow-sm focus:border-brand focus:outline-none sm:w-44"
                >
                  <option value="all">All formats</option>
                  <option value="in-person">In person</option>
                  <option value="virtual">Virtual</option>
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">⌄</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Browse by category</h2>
            <div className="hidden gap-3 sm:flex">
              <button
                onClick={() => scrollCategories("left")}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-brand hover:text-brand"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollCategories("right")}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-brand hover:text-brand"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <section className="relative mt-6">
            <div className="-mx-4 sm:mx-0">
              <div
                ref={categoryScrollRef}
                className="scrollbar-hide flex w-full gap-2 overflow-x-auto px-4 py-1 sm:gap-3 sm:px-0 sm:py-2"
              >
                {categoriesLoading
                  ? FALLBACK_CATEGORIES.slice(0, 8).map((category) => (
                      <div key={category.id} className="flex w-[104px] flex-shrink-0 flex-col items-center gap-3 pt-3 sm:w-[144px]">
                        <div className="h-14 w-14 animate-pulse rounded-full bg-gray-100 sm:h-[72px] sm:w-[72px]" />
                        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                      </div>
                    ))
                  : categories.map((category) => renderCategoryButton(category))}
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">All events</h3>
              <p className="text-sm text-gray-500 sm:text-base">
                {isLoading ? "Loading events..." : `${totalMatches} event${totalMatches === 1 ? "" : "s"} found`}
              </p>
            </div>

            {isLoading ? (
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-[380px] rounded-3xl border border-gray-100 bg-white shadow-sm" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="mt-16 rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                <p className="text-2xl">🔍</p>
                <h4 className="mt-4 text-lg font-semibold text-gray-900">No events match your filters yet</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Try widening your search or selecting a different category.
                </p>
              </div>
            ) : (
              <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-2">
                {paginatedEvents.map((event) => {
                  const ended = isEventEnded(event);
                  const parsedPrices =
                    (event.ticketType || [])
                      .map((ticket) => parseFloat(ticket.price ?? ""))
                      .filter((price) => !Number.isNaN(price) && price >= 0) ?? [];
                  const hasValidPrices = parsedPrices.length > 0;
                  const minPrice = hasValidPrices ? Math.min(...parsedPrices) : undefined;
                  const displayPrice =
                    !hasValidPrices || minPrice === undefined
                      ? "Free"
                      : minPrice === 0
                        ? "Free"
                        : formatPrice(minPrice, event.currency || "₦");

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleViewDetails(event.slug)}
                      className={`flex cursor-pointer gap-3 rounded-card border bg-white p-4 transition-all duration-200 sm:flex-row sm:items-center sm:gap-4 sm:p-6 ${
                        ended
                          ? "border-gray-200 opacity-75"
                          : "border-gray-200 hover:border-brand/50 hover:shadow-lg"
                      }`}
                    >
                      <div className="relative overflow-hidden rounded-2xl lg:h-40 lg:w-40 h-32 w-32 sm:flex-shrink-0">
                        <ImageWithFallback
                          src={typeof event.image === "string" ? event.image : null}
                          alt={event.title}
                          width={160}
                          height={160}
                          className={`h-full w-full object-cover${ended ? " grayscale-[25%]" : ""}`}
                        />
                        {ended && (
                          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                            Ended
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                        <div>
                          <h3 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">{event.title}</h3>

                          <div className="mt-3 space-y-2 text-sm text-gray-600 sm:space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-brand">
                                <Calendar className="h-4 w-4" />
                              </span>
                              <span className="truncate">
                                {formatEventDate(event.date || event.startTime || "")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-brand">
                                <MapPin className="h-4 w-4" />
                              </span>
                              <span className="truncate text-gray-700">
                                {event.locationVisibility === "undisclosed"
                                  ? "Location to be announced"
                                  : event.locationVisibility === "secret"
                                    ? "Location shared after purchase"
                                    : event.location || (event.isVirtual ? "Virtual Event" : "Location to be announced")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-brand">
                          {displayPrice}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!isLoading && filteredEvents.length > 0 && totalPages > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  currentPage === 1
                    ? "cursor-not-allowed border-gray-200 text-gray-400"
                    : "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"
                }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                const shouldRender =
                  totalPages <= 5 ||
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1;

                if (!shouldRender) {
                  if (
                    (pageNumber === 2 && currentPage > 3) ||
                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span key={pageNumber} className="hidden px-2 text-gray-400 sm:inline">
                        …
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      currentPage === pageNumber
                        ? "border-brand bg-brand/10 text-brand"
                        : "hidden border-gray-200 text-gray-600 hover:border-brand hover:text-brand sm:inline-block"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  currentPage === totalPages
                    ? "cursor-not-allowed border-gray-200 text-gray-400"
                    : "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EventsExplorerPage;

