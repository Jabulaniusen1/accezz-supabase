"use client";

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '@/hooks/useLocations';
import { LocationFilters } from './components/LocationFilters';
import LocationCard from './components/LocationCard';
import Loader from '@/components/ui/loader/Loader';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const DEFAULT_COUNTRY = 'Nigeria';
const DEFAULT_CITY = 'Uyo';

export default function LocationsPage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(DEFAULT_COUNTRY);
  const [selectedCity, setSelectedCity] = useState<string | null>(DEFAULT_CITY);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['locations-page'],
    queryFn: () => fetchLocations(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isLoading || !data || data.length === 0) {
      return;
    }

    const hasDefaultLocation = data.some(
      (location) => location.country === DEFAULT_COUNTRY && location.city === DEFAULT_CITY
    );

    if (!hasDefaultLocation && selectedCountry === DEFAULT_COUNTRY && selectedCity === DEFAULT_CITY) {
      setSelectedCountry(data[0].country);
      setSelectedCity(data[0].city);
    }
  }, [data, isLoading, selectedCity, selectedCountry]);

  const countries = useMemo(() => {
    const unique = new Set<string>();
    (data || []).forEach((location) => unique.add(location.country));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const cities = useMemo(() => {
    if (!data || !selectedCountry) {
      return [];
    }
    const unique = new Set<string>();
    data.forEach((location) => {
      if (location.country === selectedCountry) {
        unique.add(location.city);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [data, selectedCountry]);

  const filteredLocations = useMemo(() => {
    if (!data) return [];
    return data.filter((location) => {
      const countryMatch = !selectedCountry || location.country === selectedCountry;
      const cityMatch = !selectedCity || location.city === selectedCity;
      return countryMatch && cityMatch;
    });
  }, [data, selectedCountry, selectedCity]);

  const hasResults = filteredLocations.length > 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="max-w-3xl space-y-3">
          <span className="inline-flex items-center rounded-full bg-[#f54502]/10 text-[#f54502] px-3 py-1 text-xs font-semibold">
            Discover event-ready venues
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Find the perfect event centre, wherever you are
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Filter by country or city to explore curated venues. Tap into a venue to see full details, pricing, and request a booking.
          </p>
        </header>

        <div className="mt-8 sm:mt-10">
          <LocationFilters
            countries={countries}
            selectedCountry={selectedCountry}
            onCountryChange={(value) => {
              setSelectedCountry(value);
              if (!data) {
                setSelectedCity(null);
                return;
              }

              if (!value) {
                setSelectedCity(null);
                return;
              }

              const availableCities = new Set<string>();
              data.forEach((location) => {
                if (location.country === value) {
                  availableCities.add(location.city);
                }
              });

              if (!availableCities.size) {
                setSelectedCity(null);
                return;
              }

              if (selectedCity && !availableCities.has(selectedCity)) {
                setSelectedCity(null);
              }
            }}
            cities={cities}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
          />
        </div>

        <div className="mt-10 sm:mt-12">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-8 text-red-600">
              <h2 className="text-lg font-semibold mb-2">Failed to load locations</h2>
              <p className="text-sm">{error instanceof Error ? error.message : 'Please refresh the page to try again.'}</p>
            </div>
          )}

          {!isLoading && !isError && !hasResults && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-12 text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No locations match this filter</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try selecting a different country or city to see more venues.
              </p>
              <button
                onClick={() => {
                  setSelectedCountry(null);
                  setSelectedCity(null);
                }}
                className="mt-6 inline-flex items-center px-4 py-2 rounded-full border border-[#f54502] text-[#f54502] text-sm font-semibold hover:bg-[#f54502]/10"
              >
                Reset filters
              </button>
            </div>
          )}

          {!isLoading && !isError && hasResults && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredLocations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          )}
        </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

