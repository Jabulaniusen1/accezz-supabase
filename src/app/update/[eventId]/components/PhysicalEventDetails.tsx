import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaGlobe, FaMapMarkerAlt } from "react-icons/fa";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { supabase } from "@/utils/supabaseClient";
import { Event } from "../../../../types/event";
import { useCountryCityOptions } from "@/hooks/useCountryCityOptions";

type PlatformLocation = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type LocationMode = "platform" | "custom";

const buildLocationLabel = (city?: string | null, country?: string | null): string =>
  [city, country].filter(Boolean).join(", ");

const normalizeCoordinate = (value?: number | string | null): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// Google Maps API types
type MapsPlacesLibrary = {
  Autocomplete: new (
    inputField: HTMLInputElement,
    options?: { fields?: string[]; types?: string[] }
  ) => GooglePlacesAutocomplete;
};

type MapsLibrary = {
  places?: MapsPlacesLibrary;
};

type GooglePlacesAutocomplete = {
  getPlace: () => GooglePlace | undefined;
  addListener: (event: string, callback: () => void) => GoogleMapsEventListener;
};

type GooglePlace = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

type GoogleAddressComponent = {
  long_name: string;
  types: string[];
};

type GoogleMapsEventListener = {
  remove: () => void;
};

interface PhysicalEventDetailsProps {
  formData: Event | null;
  setFormData: React.Dispatch<React.SetStateAction<Event | null>>;
  notify: (type: "error" | "success", message: string) => void;
}

export default function PhysicalEventDetails({ 
  formData, 
  setFormData,
  notify,
}: PhysicalEventDetailsProps) {
  const [locationMode, setLocationMode] = useState<LocationMode>(
    formData?.locationId ? "platform" : "custom"
  );
  const [platformLocations, setPlatformLocations] = useState<PlatformLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedPlatformLocation, setSelectedPlatformLocation] = useState<string>(
    formData?.locationId ?? ""
  );
  const locationVisibility: "public" | "undisclosed" | "secret" =
    formData?.locationVisibility ?? "public";
  const isUndisclosed = locationVisibility === "undisclosed";
  const isSecret = locationVisibility === "secret";
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GooglePlacesAutocomplete | null>(null);
  const formDataRef = useRef(formData);
  const googleApiKeyRef = useRef<string | undefined>(
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ??
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAP_API_KEY
  );
  const {
    countries: countryOptions,
    getCitiesForCountry,
    isLoading: locationDataLoading,
    error: locationDataError,
  } = useCountryCityOptions();
  const cityOptions = useMemo(() => {
    if (!formData?.country) return [];
    return getCitiesForCountry(formData.country).map((city) => ({ value: city, label: city }));
  }, [formData?.country, getCitiesForCountry]);
  const hasCityOptions = cityOptions.length > 0;

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    setLocationMode(formData?.locationId ? "platform" : "custom");
    setSelectedPlatformLocation(formData?.locationId ?? "");
  }, [formData?.locationId]);

  useEffect(() => {
    if (isUndisclosed) {
      setLocationMode("custom");
      setSelectedPlatformLocation("");
    }
  }, [isUndisclosed]);

  const updateForm = useCallback(
    (changes: Partial<Event>) => {
      setFormData((prev) => (prev ? { ...prev, ...changes } : prev));
    },
    [setFormData]
  );

  useEffect(() => {
    if (!formData?.country || !formData.city) return;
    const cities = getCitiesForCountry(formData.country);
    if (!cities.length) return;
    if (!cities.includes(formData.city)) {
      updateForm({
        city: "",
        location: buildLocationLabel("", formData.country),
      });
    }
  }, [formData?.country, formData?.city, getCitiesForCountry, updateForm]);

  useEffect(() => {
    let isMounted = true;
    const fetchLocations = async () => {
      setLocationsLoading(true);
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name, address, city, country, latitude, longitude")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (error) throw error;
        if (isMounted && data) {
          setPlatformLocations(data);
        }
      } catch (error) {
        console.error("Failed to load platform venues:", error);
        notify("error", "Unable to load platform venues. You can still enter your own location.");
      } finally {
        if (isMounted) setLocationsLoading(false);
      }
    };
    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, [notify]);

  const platformLocationOptions = useMemo(
    () =>
      platformLocations.map((location) => ({
        value: location.id,
        label: [location.name, location.city, location.country].filter(Boolean).join(", "),
      })),
    [platformLocations]
  );

  const selectedPlatformLocationDetails = useMemo(
    () => platformLocations.find((loc) => loc.id === selectedPlatformLocation),
    [platformLocations, selectedPlatformLocation]
  );

  type ExtendedWindow = typeof window & {
    google?: {
      maps?: MapsLibrary;
    };
    __accezzMapsScriptPromise?: Promise<MapsLibrary | null>;
  };

  const getExtendedWindow = useCallback((): ExtendedWindow | null => {
    if (typeof window === "undefined") {
      return null;
    }

    return window as ExtendedWindow;
  }, []);

  const loadGooglePlacesScript = useCallback((): Promise<MapsLibrary | null> => {
    const extendedWindow = getExtendedWindow();
    if (!extendedWindow) {
      return Promise.resolve(null);
    }

    if (extendedWindow.google?.maps?.places) {
      return Promise.resolve(extendedWindow.google.maps ?? null);
    }

    if (extendedWindow.__accezzMapsScriptPromise) {
      return extendedWindow.__accezzMapsScriptPromise;
    }

    const apiKey = googleApiKeyRef.current;
    if (!apiKey) {
      console.warn(
        "Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAP_API_KEY in your environment."
      );
      return Promise.resolve(null);
    }

    const scriptPromise: Promise<MapsLibrary | null> = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(extendedWindow.google?.maps ?? null);
      script.onerror = (event) => {
        extendedWindow.__accezzMapsScriptPromise = undefined;
        console.error("Failed to load Google Maps script", event);
        reject(event);
      };
      document.head.appendChild(script);
    });

    extendedWindow.__accezzMapsScriptPromise = scriptPromise;

    return scriptPromise.catch(() => null);
  }, [getExtendedWindow]);

  useEffect(() => {
    if (locationMode !== "custom") return;

    let isMounted = true;
    let listener: GoogleMapsEventListener | undefined;

    (async () => {
      setGoogleMapsError(null);
      const maps = await loadGooglePlacesScript();
      if (!isMounted) return;
      if (!maps || !addressInputRef.current) {
        if (!maps && googleApiKeyRef.current) {
          setGoogleMapsError(
            "Google Maps autocomplete is unavailable. Please enter the address manually."
          );
        }
        return;
      }
      autocompleteRef.current = new maps.places!.Autocomplete(addressInputRef.current, {
        fields: ["geometry", "formatted_address", "address_components", "name"],
        types: ["geocode"],
      });
      listener = autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace?.();
        if (!place) return;
        const components = place.address_components || [];
        const cityComponent = components.find((component: GoogleAddressComponent) =>
          component.types.includes("locality") ||
          component.types.includes("administrative_area_level_2") ||
          component.types.includes("administrative_area_level_1")
        );
        const countryComponent = components.find((component: GoogleAddressComponent) =>
          component.types.includes("country")
        );
        const nextCity = cityComponent?.long_name || "";
        const nextCountry = countryComponent?.long_name || "";
        const lat = place.geometry?.location?.lat ? place.geometry.location.lat() : null;
        const lng = place.geometry?.location?.lng ? place.geometry.location.lng() : null;

        updateForm({
          address: place.formatted_address || "",
          location: place.formatted_address || buildLocationLabel(nextCity, nextCountry),
          city: nextCity || formDataRef.current?.city || "",
          country: nextCountry || formDataRef.current?.country || "",
          latitude: lat ?? null,
          longitude: lng ?? null,
          locationId: undefined,
        });
      });
    })();

    return () => {
      isMounted = false;
      if (listener) listener.remove();
      autocompleteRef.current = null;
    };
  }, [loadGooglePlacesScript, locationMode, updateForm]);

  const handleLocationModeChange = useCallback(
    (mode: LocationMode) => {
      setLocationMode(mode);
      if (mode === "custom") {
        setSelectedPlatformLocation("");
        updateForm({ locationId: undefined });
      }
    },
    [updateForm]
  );

  const handlePlatformLocationSelect = useCallback(
    (value: string) => {
      setSelectedPlatformLocation(value);
      const selected = platformLocations.find((location) => location.id === value);
      if (!selected) return;

      const parsedLatitude = normalizeCoordinate(selected.latitude);
      const parsedLongitude = normalizeCoordinate(selected.longitude);
      const label = [selected.name, selected.city, selected.country]
        .filter(Boolean)
        .join(", ");

      updateForm({
        locationId: selected.id,
        venue: selected.name || formData?.venue || "",
        address: selected.address || "",
        city: selected.city || "",
        country: selected.country || "",
        location: label || selected.name || "",
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      });
    },
    [formData?.venue, platformLocations, updateForm]
  );

  const handleCountryChange = useCallback(
    (value: string) => {
      const availableCities = getCitiesForCountry(value);
      const normalizedCity =
        formData?.city && availableCities.includes(formData.city) ? formData.city : "";
      updateForm({
        country: value,
        city: normalizedCity,
        location: buildLocationLabel(normalizedCity, value),
        locationId: locationMode === "platform" ? formData?.locationId : undefined,
      });
    },
    [formData?.city, formData?.locationId, getCitiesForCountry, locationMode, updateForm]
  );

  const handleCityChange = useCallback(
    (value: string) => {
      updateForm({
        city: value,
        location: buildLocationLabel(value, formData?.country),
        locationId: locationMode === "platform" ? formData?.locationId : undefined,
      });
    },
    [formData?.country, formData?.locationId, locationMode, updateForm]
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      updateForm({
        address: value,
        location: value || buildLocationLabel(formData?.city, formData?.country),
        locationId: undefined,
      });
    },
    [formData?.city, formData?.country, updateForm]
  );

  const handleVisibilitySelect = useCallback(
    (value: "public" | "undisclosed" | "secret") => {
      if (!formData) return;
      updateForm({
        locationVisibility: value,
        locationId: value === "undisclosed" ? undefined : formData.locationId,
      });
      if (value === "undisclosed") {
        setLocationMode("custom");
        setSelectedPlatformLocation("");
      }
    },
    [formData, updateForm]
  );

  if (!formData || formData.isVirtual) {
    return null;
  }

  return (
    <motion.div
      className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-4 sm:p-6 rounded-[5px] shadow-xl border border-[#f54502]/20 dark:border-[#f54502]/30"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h3 className="text-lg sm:text-xl font-semibold text-[#f54502] dark:text-[#f54502] mb-4 sm:mb-6 flex items-center">
        <FaMapMarkerAlt className="mr-2 text-sm sm:text-base" />
        Physical Event Location
      </h3>

      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Location visibility
          </p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "public", label: "Show publicly" },
              { value: "undisclosed", label: "Undisclosed for now" },
              { value: "secret", label: "Share after purchase" },
            ] as const).map((option) => {
              const isActive = locationVisibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleVisibilitySelect(option.value)}
                  className={`px-3 py-2 rounded-[5px] border text-xs sm:text-sm transition ${
                    isActive
                      ? "bg-[#f54502] text-white border-[#f54502] shadow-sm"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-[#f54502] dark:hover:border-[#f54502]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {isUndisclosed && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Attendees will see “Location to be announced.” Come back later to share the final venue.
            </p>
          )}
          {isSecret && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The venue stays hidden on your event page. Ticket buyers receive the details via email and their receipt.
            </p>
          )}
        </div>

        {!isUndisclosed ? (
          <>
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Venue Name{!isUndisclosed ? " *" : ""}
          </label>
          <input
            type="text"
            value={formData.venue || ""}
            onChange={(e) => updateForm({ venue: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
            placeholder="e.g., Madison Square Garden"
                required={!isUndisclosed}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How would you like to set your venue?
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleLocationModeChange("platform")}
              className={`px-4 py-2 rounded-[5px] border transition text-sm sm:text-base ${
                locationMode === "platform"
                  ? "bg-[#f54502] text-white border-[#f54502]"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-[#f54502] dark:hover:border-[#f54502]"
              }`}
            >
              Use platform venues
            </button>
            <button
              type="button"
              onClick={() => handleLocationModeChange("custom")}
              className={`px-4 py-2 rounded-[5px] border transition text-sm sm:text-base ${
                locationMode === "custom"
                  ? "bg-[#f54502] text-white border-[#f54502]"
                  : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-[#f54502] dark:hover:border-[#f54502]"
              }`}
            >
              Add my own location
            </button>
          </div>
        </div>

        {locationMode === "platform" ? (
          <div className="space-y-3 sm:space-y-4">
            <SearchableSelect
              options={platformLocationOptions}
              value={selectedPlatformLocation}
              onChange={handlePlatformLocationSelect}
              placeholder={
                locationsLoading
                  ? "Loading venues..."
                  : platformLocationOptions.length
                    ? "Select a venue from Accezz"
                    : "No venues available yet"
              }
              disabled={locationsLoading || platformLocationOptions.length === 0}
            />
            {selectedPlatformLocationDetails && (
              <div className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedPlatformLocationDetails.name}
                </p>
                {selectedPlatformLocationDetails.address && (
                  <p className="flex items-center gap-2 text-xs sm:text-sm">
                    <FaMapMarkerAlt className="text-[#f54502]" />
                    {selectedPlatformLocationDetails.address}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {buildLocationLabel(
                    selectedPlatformLocationDetails.city,
                    selectedPlatformLocationDetails.country
                  )}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Don&apos;t see your venue? Switch to &quot;Add my own location&quot; to enter a new address.
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaGlobe className="text-[#f54502]" />
                  Country{!isUndisclosed ? " *" : ""}
                </label>
                <SearchableSelect
                  options={countryOptions}
                  value={formData.country || ""}
                  onChange={handleCountryChange}
                  placeholder={locationDataLoading ? "Loading countries..." : "Select country"}
                  disabled={locationDataLoading || countryOptions.length === 0}
                />
                {locationDataError && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                    {locationDataError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City{!isUndisclosed ? " *" : ""}
                </label>
                {hasCityOptions ? (
                  <SearchableSelect
                    options={cityOptions}
                    value={formData.city || ""}
                    onChange={handleCityChange}
                    placeholder={
                      formData?.country ? "Select city" : "Select a country first"
                    }
                    disabled={!formData?.country}
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      value={formData.city || ""}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-[#f54502] focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                      placeholder={
                        formData?.country ? "Enter city manually" : "Select a country first"
                      }
                      disabled={!formData?.country}
                      required={!isUndisclosed}
                    />
                    {formData?.country && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        City list unavailable for this country. Enter the city manually.
                      </p>
                    )}
                  </>
                )}
        </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address{!isUndisclosed ? " *" : ""}
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f54502]" />
                <input
                  ref={addressInputRef}
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                  placeholder="Start typing to find your address"
                  required={!isUndisclosed}
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                We use Google Maps to help validate your address. You can still enter it manually if autocomplete is unavailable.
              </p>
              {googleMapsError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">{googleMapsError}</p>
              )}
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="rounded-[5px] border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 p-4 text-sm text-gray-600 dark:text-gray-300">
            You can publish and sell tickets while you finalize the venue. Update the precise location anytime from this page.
          </div>
        )}
      </div>
    </motion.div>
  );
}