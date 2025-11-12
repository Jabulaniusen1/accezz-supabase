"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { useAllEvents } from "@/hooks/useEvents";
import { supabase } from "@/utils/supabaseClient";
import { formatEventDate } from "@/utils/formatDateTime";
import { formatPrice } from "@/utils/formatPrice";
import Image from "next/image";
import {
  Infinity,
  Users,
  Palette,
  Dumbbell,
  Briefcase,
  UtensilsCrossed,
  Calendar,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type CategoryRecord = {
  id: string;
  name: string;
  slug: string | null;
};

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  all: <Infinity className="h-6 w-6" />,
  community: <Users className="h-6 w-6" />,
  "art-culture": <Palette className="h-6 w-6" />,
  "sports-wellness": <Dumbbell className="h-6 w-6" />,
  "career-business": <Briefcase className="h-6 w-6" />,
  "spirituality-religion": <Calendar className="h-6 w-6" />,
  "food-drink": <UtensilsCrossed className="h-6 w-6" />,
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
];

const PAGE_SIZE = 8;

const EventsExplorerPage = () => {
  const { data: events = [], isLoading } = useAllEvents();
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

  const totalMatches = filteredEvents.length;
  const totalPages = Math.ceil(totalMatches / PAGE_SIZE) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    const icon = CATEGORY_ICON_MAP[key] ?? <Calendar className="h-6 w-6" />;
    const isActive = selectedCategory === key || (key === "all" && selectedCategory === "all");

    return (
      <button
        key={category.id}
        onClick={() => setSelectedCategory(key)}
        className={`group flex w-full min-w-[140px] max-w-[160px] flex-col items-center gap-3 rounded-[24px] border px-5 py-6 text-sm font-semibold transition-all sm:min-w-[150px] ${
          isActive
            ? "border-[#f54502] bg-[#fff0e7] text-[#f54502] shadow-sm"
            : "border-gray-200 bg-white text-gray-500 hover:border-[#f54502]/50 hover:text-[#f54502]"
        }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
            isActive ? "border-[#f54502] bg-white text-[#f54502]" : "border-gray-200 text-gray-400 group-hover:text-[#f54502]"
          }`}
        >
          {icon}
        </span>
        <span className={`text-center text-sm font-semibold ${isActive ? "text-[#f54502]" : "text-gray-600"}`}>
          {category.name}
        </span>
      </button>
    );
  };

  return (
    <Layout>
      <div className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f54502]">Discover Events</p>
            {/* <h1 className="mt-4 text-3xl font-semibold text-gray-900 sm:text-4xl">Find experiences you’ll love</h1> */}
          </header>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
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
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-12 text-sm font-medium text-gray-600 shadow-sm focus:border-[#f54502] focus:outline-none sm:w-48"
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
                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-11 text-sm font-medium text-gray-600 shadow-sm focus:border-[#f54502] focus:outline-none sm:w-44"
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
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-[#f54502] hover:text-[#f54502]"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollCategories("right")}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-[#f54502] hover:text-[#f54502]"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <section className="relative mt-6">
            <div className="-mx-4 flex items-center gap-3 sm:mx-0">
              <button
                onClick={() => scrollCategories("left")}
                className="hidden rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-[#f54502] hover:text-[#f54502] sm:flex"
                aria-label="Scroll categories left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div
                ref={categoryScrollRef}
                className="scrollbar-hide flex w-full gap-3 overflow-x-auto py-2"
              >
                {categoriesLoading
                  ? FALLBACK_CATEGORIES.slice(0, 6).map((category) => (
                      <div
                        key={category.id}
                        className="h-[130px] w-[150px] rounded-[24px] border border-gray-200 bg-white/60 p-6 shadow-sm"
                      />
                    ))
                  : categories.map((category) => renderCategoryButton(category))}
              </div>
              <button
                onClick={() => scrollCategories("right")}
                className="hidden rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-[#f54502] hover:text-[#f54502] sm:flex"
                aria-label="Scroll categories right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="mt-14">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">Upcoming events</h3>
                <p className="text-sm text-gray-500 sm:text-base">
                  {isLoading ? "Loading events..." : `${totalMatches} event${totalMatches === 1 ? "" : "s"} found`}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {paginatedEvents.map((event) => {
                  const minPrice = Math.min(
                    ...(event.ticketType || [])
                      .map((ticket) => parseFloat(ticket.price ?? "0"))
                      .filter((price) => !Number.isNaN(price)),
                    0
                  );

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleViewDetails(event.slug)}
                      className="flex cursor-pointer flex-col justify-between gap-6 rounded-[28px] border border-gray-200 bg-white px-6 py-6 transition-all duration-200 hover:border-[#f54502]/50 hover:shadow-lg sm:flex-row"
                    >
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="truncate flex-1 text-xl font-semibold text-gray-900">
                              {event.title}
                            </h3>
                            
                          </div>
                          <div className="mt-3 space-y-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[#f54502]">
                                <Calendar className="h-4 w-4" />
                              </span>
                              <span className="truncate">
                                {formatEventDate(event.date || event.startTime || "")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[#f54502]">
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
                        <div className="text-lg font-semibold text-[#f54502]">
                          {minPrice <= 0 ? "Free" : formatPrice(minPrice, event.currency || "₦")}
                        </div>
                      </div>

                      <div className="h-40 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-40 sm:w-40">
                        <Image
                          src={typeof event.image === "string" && event.image ? event.image : "/placeholder.jpg"}
                          alt={event.title}
                          width={160}
                          height={160}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {!isLoading && filteredEvents.length > 0 && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  currentPage === 1
                    ? "cursor-not-allowed border-gray-200 text-gray-400"
                    : "border-gray-200 text-gray-600 hover:border-[#f54502] hover:text-[#f54502]"
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
                      <span key={pageNumber} className="px-2 text-gray-400">
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
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      currentPage === pageNumber
                        ? "border-[#f54502] bg-[#fff0e7] text-[#f54502]"
                        : "border border-gray-200 text-gray-600 hover:border-[#f54502] hover:text-[#f54502]"
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
                    : "border-gray-200 text-gray-600 hover:border-[#f54502] hover:text-[#f54502]"
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

