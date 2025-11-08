"use client";

import React, { useMemo } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface LocationFiltersProps {
  countries: string[];
  selectedCountry: string | null;
  onCountryChange: (value: string | null) => void;
  cities: string[];
  selectedCity: string | null;
  onCityChange: (value: string | null) => void;
}

export const LocationFilters: React.FC<LocationFiltersProps> = ({
  countries,
  selectedCountry,
  onCountryChange,
  cities,
  selectedCity,
  onCityChange,
}) => {
  const countryOptions = useMemo(
    () => [
      { value: '', label: 'All countries' },
      ...countries.map((country) => ({ value: country, label: country })),
    ],
    [countries]
  );

  const cityOptions = useMemo(() => {
    const base = cities.map((city) => ({ value: city, label: city }));
    return [
      { value: '', label: 'All cities' },
      ...base,
    ];
  }, [cities]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Country</label>
        <SearchableSelect
          options={countryOptions}
          value={selectedCountry ?? ''}
          onChange={(value) => onCountryChange(value === '' ? null : value)}
          placeholder="All countries"
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">City</label>
        <SearchableSelect
          options={cityOptions}
          value={selectedCity ?? ''}
          onChange={(value) => onCityChange(value === '' ? null : value)}
          placeholder={selectedCountry ? 'All cities' : 'Select a country first'}
          disabled={!selectedCountry}
        />
      </div>
    </div>
  );
};

export default LocationFilters;

