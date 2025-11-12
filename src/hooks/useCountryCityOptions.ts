import { useCallback, useEffect, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

type CountriesApiResponse = {
  data?: Array<{
    country: string;
    cities: string[];
  }>;
};

const cache: {
  countries: SelectOption[];
  cityMap: Record<string, string[]>;
  error: string | null;
  fetched: boolean;
} = {
  countries: [],
  cityMap: {},
  error: null,
  fetched: false,
};

export const useCountryCityOptions = () => {
  const [countries, setCountries] = useState<SelectOption[]>(cache.countries);
  const [cityMap, setCityMap] = useState<Record<string, string[]>>(cache.cityMap);
  const [isLoading, setIsLoading] = useState(!cache.fetched);
  const [error, setError] = useState<string | null>(cache.error);

  useEffect(() => {
    if (cache.fetched) {
      setCountries(cache.countries);
      setCityMap(cache.cityMap);
      setError(cache.error);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchCountries = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries');
        if (!response.ok) {
          throw new Error(`Failed to load countries: ${response.status}`);
        }
        const json = (await response.json()) as CountriesApiResponse;
        const dataset = json.data ?? [];

        const normalizedCountries: SelectOption[] = [];
        const normalizedCityMap: Record<string, string[]> = {};

        dataset.forEach(({ country, cities }) => {
          if (!country) return;
          normalizedCountries.push({ value: country, label: country });
          normalizedCityMap[country] = Array.isArray(cities)
            ? cities
                .map((city) => city?.trim())
                .filter((city): city is string => Boolean(city))
            : [];
        });
        normalizedCountries.sort((a, b) => a.label.localeCompare(b.label));
        Object.keys(normalizedCityMap).forEach((country) => {
          normalizedCityMap[country] = [...normalizedCityMap[country]].sort((a, b) =>
            a.localeCompare(b)
          );
        });

        cache.countries = normalizedCountries;
        cache.cityMap = normalizedCityMap;
        cache.error = null;
        cache.fetched = true;

        if (isMounted) {
          setCountries(normalizedCountries);
          setCityMap(normalizedCityMap);
          setError(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load countries';
        cache.error = message;
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCountries();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCitiesForCountry = useCallback(
    (country: string) => {
      if (!country) return [];
      return cityMap[country] ?? cache.cityMap[country] ?? [];
    },
    [cityMap]
  );

  return {
    countries,
    getCitiesForCountry,
    isLoading,
    error,
  };
};

