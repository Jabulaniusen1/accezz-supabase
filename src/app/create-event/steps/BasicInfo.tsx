'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaCloudUploadAlt, FaExclamationTriangle, FaIdCard, FaInfoCircle, FaLink, FaTrash, FaTags, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { type Event } from '@/types/event';
import { RiEarthLine } from 'react-icons/ri';
import { ToastProps } from '@/types/event';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { SiGooglemeet } from 'react-icons/si';
import { BiLogoZoom } from 'react-icons/bi';
import { BsMicrosoftTeams } from 'react-icons/bs';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { supabase } from '@/utils/supabaseClient';

type EventCategory = {
  id: string;
  name: string;
};

type PlatformLocation = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type LocationMode = 'platform' | 'custom';

const COUNTRY_OPTIONS = [
  'Nigeria',
  'Ghana',
  'South Africa',
  'Kenya',
  'United States',
  'United Kingdom',
  'Canada',
  'United Arab Emirates',
  'Germany'
];

const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toTimeInputValue = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
};

const combineDateAndTime = (date: string, time: string): string => {
  if (!date) return '';
  const safeTime = time || '00:00';
  const combined = new Date(`${date}T${safeTime}`);
  if (Number.isNaN(combined.getTime())) return '';
  return combined.toISOString();
};

const buildLocationLabel = (city?: string | null, country?: string | null): string =>
  [city, country].filter(Boolean).join(', ');

const normalizeCoordinate = (value?: number | string | null): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// Google Maps API types
type GoogleMapsPlacesNamespace = {
  Autocomplete: new (
    inputField: HTMLInputElement,
    options?: { fields?: string[]; types?: string[] }
  ) => GooglePlacesAutocomplete;
};

type GoogleMapsNamespace = {
  places?: GoogleMapsPlacesNamespace;
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

interface BasicInfoProps {
  formData: Event;
  updateFormData: (data: Partial<Event>) => void;
  onNext: () => void;
  setToast: (toast: ToastProps | null) => void;
}

const BasicInfo = ({ formData, updateFormData, onNext, setToast }: BasicInfoProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const googleApiKeyRef = useRef<string | undefined>(
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    process.env.GOOGLE_MAP_API_KEY
  );
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [platformLocations, setPlatformLocations] = useState<PlatformLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>(formData.locationId ? 'platform' : 'custom');
  const [selectedPlatformLocation, setSelectedPlatformLocation] = useState<string>(formData.locationId ?? '');
  const [categorySelectValue, setCategorySelectValue] = useState<string>(() => formData.categoryId ?? (formData.categoryCustom ? '__custom__' : ''));
  const [customCategoryInput, setCustomCategoryInput] = useState<string>(formData.categoryCustom ?? '');
  const [showEndTime, setShowEndTime] = useState<boolean>(Boolean(formData.endTime));
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<GooglePlacesAutocomplete | null>(null);
  const formDataRef = useRef(formData);

  useEffect(() => {
    if (formData.image instanceof File) {
      const previewUrl = URL.createObjectURL(formData.image);
      setImagePreview(previewUrl);
  
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }
  }, [formData.image]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const loadGooglePlacesScript = useCallback((): Promise<GoogleMapsNamespace | null> => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    if (window.google?.maps?.places) {
      return Promise.resolve(window.google.maps as GoogleMapsNamespace | null);
    }

    if (window.__googleMapsScriptLoadingPromise) {
      return window.__googleMapsScriptLoadingPromise as Promise<GoogleMapsNamespace | null>;
    }

    const apiKey = googleApiKeyRef.current;
    if (!apiKey) {
      console.warn(
        'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAP_API_KEY in your environment.'
      );
      return Promise.resolve(null);
    }

    const scriptPromise: Promise<GoogleMapsNamespace | null> = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        resolve((window.google?.maps ?? null) as GoogleMapsNamespace | null);
      };
      script.onerror = (event) => {
        window.__googleMapsScriptLoadingPromise = undefined;
        console.error('Failed to load Google Maps script', event);
        reject(event);
      };
      document.head.appendChild(script);
    });

    (window as any).__googleMapsScriptLoadingPromise = scriptPromise;

    return scriptPromise.catch(() => null) as Promise<GoogleMapsNamespace | null>;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from('event_categories')
          .select('id, name')
          .order('name', { ascending: true });
        if (error) throw error;
        if (isMounted && data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        setToast({
          type: 'error',
          message: 'Unable to load event categories right now.',
          onClose: () => setToast(null)
        });
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, [setToast]);

  useEffect(() => {
    if (locationMode !== 'platform') return;
    let isMounted = true;
    const fetchLocations = async () => {
      setLocationsLoading(true);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, address, city, country, latitude, longitude')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        if (isMounted && data) {
          setPlatformLocations(data);
        }
      } catch (error) {
        console.error('Failed to load platform venues:', error);
        setToast({
          type: 'error',
          message: 'Unable to load platform venues. You can still enter your own location.',
          onClose: () => setToast(null)
        });
      } finally {
        if (isMounted) setLocationsLoading(false);
      }
    };
    fetchLocations();
    return () => {
      isMounted = false;
    };
  }, [locationMode, setToast]);

  useEffect(() => {
    setCategorySelectValue(formData.categoryId ?? (formData.categoryCustom ? '__custom__' : ''));
    setCustomCategoryInput(formData.categoryCustom ?? '');
  }, [formData.categoryId, formData.categoryCustom]);

  useEffect(() => {
    if (formData.locationId) {
      setLocationMode('platform');
      setSelectedPlatformLocation(formData.locationId);
    }
  }, [formData.locationId]);

  useEffect(() => {
    setShowEndTime(Boolean(formData.endTime));
  }, [formData.endTime]);

  useEffect(() => {
    if (locationMode !== 'custom') return;
    let isMounted = true;
    let listener: GoogleMapsEventListener | undefined;

    (async () => {
      setGoogleMapsError(null);
      const maps = await loadGooglePlacesScript();
      if (!isMounted) return;
      if (!maps || !addressInputRef.current) {
        if (!maps && googleApiKeyRef.current) {
          setGoogleMapsError('Google Maps autocomplete is unavailable. Please enter the address manually.');
        }
        return;
      }
      autocompleteRef.current = new maps.places!.Autocomplete(addressInputRef.current, {
        fields: ['geometry', 'formatted_address', 'address_components', 'name'],
        types: ['geocode']
      });
      listener = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace?.();
        if (!place) return;
        const components = place.address_components || [];
        const cityComponent = components.find((component: GoogleAddressComponent) =>
          component.types.includes('locality') ||
          component.types.includes('administrative_area_level_2') ||
          component.types.includes('administrative_area_level_1')
        );
        const countryComponent = components.find((component: GoogleAddressComponent) => component.types.includes('country'));
        const nextCity = cityComponent?.long_name || '';
        const nextCountry = countryComponent?.long_name || '';
        const lat = place.geometry?.location?.lat ? place.geometry.location.lat() : null;
        const lng = place.geometry?.location?.lng ? place.geometry.location.lng() : null;
        updateFormData({
          address: place.formatted_address || '',
          location: place.formatted_address || buildLocationLabel(nextCity, nextCountry),
          city: nextCity || formDataRef.current.city,
          country: nextCountry || formDataRef.current.country,
          latitude: lat ?? null,
          longitude: lng ?? null,
          locationId: undefined
        });
      });
    })();

    return () => {
      isMounted = false;
      if (listener) listener.remove();
      autocompleteRef.current = null;
    };
  }, [locationMode, loadGooglePlacesScript, updateFormData]);

  const startDateValue = useMemo(
    () => formData.date || toDateInputValue(formData.startTime),
    [formData.date, formData.startTime]
  );

  const startTimeValue = useMemo(
    () => formData.time || toTimeInputValue(formData.startTime),
    [formData.time, formData.startTime]
  );

  const endDateValue = useMemo(
    () => (formData.endTime ? toDateInputValue(formData.endTime) : startDateValue),
    [formData.endTime, startDateValue]
  );

  const endTimeValue = useMemo(
    () => (formData.endTime ? toTimeInputValue(formData.endTime) : ''),
    [formData.endTime]
  );

  const categoryOptions = useMemo(
    () => [
      ...categories.map((category) => ({
        value: category.id,
        label: category.name
      })),
      { value: '__custom__', label: 'Other (add my own)' }
    ],
    [categories]
  );

  const countryOptions = useMemo(
    () => COUNTRY_OPTIONS.map((country) => ({ value: country, label: country })),
    []
  );

  const platformLocationOptions = useMemo(
    () =>
      platformLocations.map((location) => ({
        value: location.id,
        label: [location.name, location.city, location.country].filter(Boolean).join(', ')
      })),
    [platformLocations]
  );

  const selectedPlatformLocationDetails = useMemo(
    () => platformLocations.find((loc) => loc.id === selectedPlatformLocation),
    [platformLocations, selectedPlatformLocation]
  );

  const handleImageChange = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setToast({
        type: 'error',
        message: 'Invalid image format. Please upload JPG, PNG, or WEBP files only.',
        onClose: () => setToast(null)
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
  
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    updateFormData({ image: file });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageChange(file);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setToast({
        type: 'error',
        message: 'Please enter an event title',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.description.trim()) {
      setToast({
        type: 'error',
        message: 'Please enter an event description',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.image) {
      setToast({
        type: 'error',
        message: 'Please upload an event image',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.startTime) {
      setToast({
        type: 'error',
        message: 'Please set the event start date and time',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (new Date(formData.startTime).getTime() <= Date.now()) {
      setToast({
        type: 'error',
        message: 'Event start time must be in the future',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (!formData.categoryId && !customCategoryInput.trim()) {
      setToast({
        type: 'error',
        message: 'Please choose a category or add your own',
        onClose: () => setToast(null)
      });
      return false;
    }
    if (showEndTime) {
      if (!formData.endTime) {
        setToast({
          type: 'error',
          message: 'Please set the event end time or disable the option',
          onClose: () => setToast(null)
        });
        return false;
      }
      if (new Date(formData.endTime).getTime() <= new Date(formData.startTime).getTime()) {
        setToast({
          type: 'error',
          message: 'Event end time must be after the start time',
          onClose: () => setToast(null)
        });
        return false;
      }
    }

    if (formData.isVirtual) {
      if (!formData.virtualEventDetails?.platform) {
        setToast({
          type: 'error',
          message: 'Please select a virtual event platform',
          onClose: () => setToast(null)
        });
        return false;
      }
      if (['google-meet', 'custom', 'meets'].includes(formData.virtualEventDetails.platform) &&
          !formData.virtualEventDetails.meetingUrl) {
        setToast({
          type: 'error',
          message: 'Please provide the meeting link for your virtual event',
          onClose: () => setToast(null)
        });
        return false;
      }
      if (formData.virtualEventDetails.platform === 'zoom' && !formData.virtualEventDetails.meetingId) {
        setToast({
          type: 'error',
          message: 'Please provide your Zoom meeting ID',
          onClose: () => setToast(null)
        });
        return false;
      }
    } else {
      if (!(formData.venue ?? '').trim()) {
        setToast({
          type: 'error',
          message: 'Please enter the venue name',
          onClose: () => setToast(null)
        });
        return false;
      }
      if (locationMode === 'platform') {
        if (!selectedPlatformLocation) {
          setToast({
            type: 'error',
            message: 'Select a venue from the platform list or switch to custom location',
            onClose: () => setToast(null)
          });
          return false;
        }
      } else {
        if (!formData.country?.trim()) {
          setToast({
            type: 'error',
            message: 'Please select your event country',
            onClose: () => setToast(null)
          });
          return false;
        }
        if (!formData.city?.trim()) {
          setToast({
            type: 'error',
            message: 'Please enter your event city',
            onClose: () => setToast(null)
          });
          return false;
        }
        if (!formData.address?.trim()) {
          setToast({
            type: 'error',
            message: 'Please provide the event address',
            onClose: () => setToast(null)
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategorySelectValue(value);
      if (value === '__custom__') {
        updateFormData({
          categoryId: undefined,
          categoryName: undefined,
          categoryCustom: customCategoryInput.trim()
        });
        return;
      }
      const selected = categories.find((category) => category.id === value);
      updateFormData({
        categoryId: value,
        categoryName: selected?.name,
        categoryCustom: ''
      });
    },
    [categories, customCategoryInput, updateFormData]
  );

  const handleCustomCategoryChange = useCallback(
    (value: string) => {
      setCustomCategoryInput(value);
      if (categorySelectValue === '__custom__') {
        updateFormData({
          categoryId: undefined,
          categoryName: undefined,
          categoryCustom: value
        });
      }
    },
    [categorySelectValue, updateFormData]
  );

  const handleStartDateChange = useCallback(
    (value: string) => {
      if (!value) {
        updateFormData({
          date: '',
          startTime: ''
        });
        if (showEndTime) {
          setShowEndTime(false);
          updateFormData({ endTime: null });
        }
        return;
      }
      const baseTime = startTimeValue || '09:00';
      const newStartIso = combineDateAndTime(value, baseTime);
      if (!newStartIso) {
        setToast({
          type: 'error',
          message: 'Invalid start date selected',
          onClose: () => setToast(null)
        });
        return;
      }

      const updates: Partial<Event> = {
        date: value,
        startTime: newStartIso
      };

      if (showEndTime) {
        if (formData.endTime) {
          const currentEnd = new Date(formData.endTime).getTime();
          const newStart = new Date(newStartIso).getTime();
          if (!Number.isNaN(currentEnd) && currentEnd <= newStart) {
            const adjustedEnd = new Date(newStart);
            adjustedEnd.setHours(adjustedEnd.getHours() + 1);
            updates.endTime = adjustedEnd.toISOString();
          }
        } else {
          const newStart = new Date(newStartIso);
          newStart.setHours(newStart.getHours() + 1);
          updates.endTime = newStart.toISOString();
        }
      }

      updateFormData(updates);
    },
    [formData.endTime, setToast, showEndTime, startTimeValue, updateFormData]
  );

  const handleStartTimeChange = useCallback(
    (value: string) => {
      if (!startDateValue) {
        setToast({
          type: 'error',
          message: 'Select a date before choosing a time',
          onClose: () => setToast(null)
        });
        return;
      }
      const newStartIso = combineDateAndTime(startDateValue, value);
      if (!newStartIso) {
        setToast({
          type: 'error',
          message: 'Invalid start time selected',
          onClose: () => setToast(null)
        });
        return;
      }

      const updates: Partial<Event> = {
        time: value,
        startTime: newStartIso
      };

      if (showEndTime) {
        if (formData.endTime) {
          const currentEnd = new Date(formData.endTime).getTime();
          const newStart = new Date(newStartIso).getTime();
          if (!Number.isNaN(currentEnd) && currentEnd <= newStart) {
            const adjustedEnd = new Date(newStart);
            adjustedEnd.setHours(adjustedEnd.getHours() + 1);
            updates.endTime = adjustedEnd.toISOString();
          }
        } else {
          const newStart = new Date(newStartIso);
          newStart.setHours(newStart.getHours() + 1);
          updates.endTime = newStart.toISOString();
        }
      }

      updateFormData(updates);
    },
    [formData.endTime, setToast, showEndTime, startDateValue, updateFormData]
  );

  const handleToggleEndTime = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        if (!formData.startTime) {
          setToast({
            type: 'error',
            message: 'Set the event start time before adding an end time',
            onClose: () => setToast(null)
          });
          return;
        }
        const start = new Date(formData.startTime);
        const defaultEnd = new Date(start.getTime() + 60 * 60 * 1000);
        setShowEndTime(true);
        updateFormData({ endTime: defaultEnd.toISOString() });
      } else {
        setShowEndTime(false);
        updateFormData({ endTime: null });
      }
    },
    [formData.startTime, setToast, updateFormData]
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      if (!value) {
        setShowEndTime(false);
        updateFormData({ endTime: null });
        return;
      }
      const baseTime = endTimeValue || startTimeValue || '09:00';
      const newEndIso = combineDateAndTime(value, baseTime);
      if (!newEndIso) {
        setToast({
          type: 'error',
          message: 'Invalid end date selected',
          onClose: () => setToast(null)
        });
        return;
      }
      if (formData.startTime && new Date(newEndIso).getTime() <= new Date(formData.startTime).getTime()) {
        setToast({
          type: 'error',
          message: 'End time must be after the start time',
          onClose: () => setToast(null)
        });
        return;
      }
      setShowEndTime(true);
      updateFormData({ endTime: newEndIso });
    },
    [endTimeValue, formData.startTime, setToast, startTimeValue, updateFormData]
  );

  const handleEndTimeChange = useCallback(
    (value: string) => {
      const baseDate = endDateValue || startDateValue;
      if (!baseDate) {
        setToast({
          type: 'error',
          message: 'Select an end date before choosing a time',
          onClose: () => setToast(null)
        });
        return;
      }
      const newEndIso = combineDateAndTime(baseDate, value);
      if (!newEndIso) {
        setToast({
          type: 'error',
          message: 'Invalid end time selected',
          onClose: () => setToast(null)
        });
        return;
      }
      if (formData.startTime && new Date(newEndIso).getTime() <= new Date(formData.startTime).getTime()) {
        setToast({
          type: 'error',
          message: 'End time must be after the start time',
          onClose: () => setToast(null)
        });
        return;
      }
      setShowEndTime(true);
      updateFormData({ endTime: newEndIso });
    },
    [endDateValue, formData.startTime, setToast, startDateValue, updateFormData]
  );

  const handleLocationModeChange = useCallback(
    (mode: LocationMode) => {
      setLocationMode(mode);
      if (mode === 'custom') {
        setSelectedPlatformLocation('');
        updateFormData({
          locationId: undefined
        });
      }
    },
    [updateFormData]
  );

  const handlePlatformLocationSelect = useCallback(
    (value: string) => {
      setSelectedPlatformLocation(value);
      const selected = platformLocations.find((location) => location.id === value);
      if (!selected) return;
      const parsedLatitude = normalizeCoordinate(selected.latitude);
      const parsedLongitude = normalizeCoordinate(selected.longitude);
      const label = [selected.name, selected.city, selected.country].filter(Boolean).join(', ');
      updateFormData({
        locationId: selected.id,
        venue: selected.name || formData.venue,
        address: selected.address || '',
        city: selected.city || '',
        country: selected.country || '',
        location: label || selected.name || '',
        latitude: parsedLatitude,
        longitude: parsedLongitude
      });
    },
    [formData.venue, platformLocations, updateFormData]
  );

  const handleCountryChange = useCallback(
    (value: string) => {
      updateFormData({
        country: value,
        location: buildLocationLabel(formData.city, value),
        locationId: locationMode === 'platform' ? formData.locationId : undefined
      });
    },
    [formData.city, formData.locationId, locationMode, updateFormData]
  );

  const handleCityChange = useCallback(
    (value: string) => {
      updateFormData({
        city: value,
        location: buildLocationLabel(value, formData.country),
        locationId: locationMode === 'platform' ? formData.locationId : undefined
      });
    },
    [formData.country, formData.locationId, locationMode, updateFormData]
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      updateFormData({
        address: value,
        location: value || buildLocationLabel(formData.city, formData.country),
        locationId: undefined
      });
    },
    [formData.city, formData.country, updateFormData]
  );

  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Event Basic Information
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Start by setting up the foundation of your event
        </p>
      </div>

      {/* Image Upload - Simplified */}
      <div className="space-y-3 sm:space-y-4">
        <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
          Event Image *
        </label>
        <div
          className={`relative border-2 border-dashed rounded-[5px] p-4 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-[#f54502] bg-[#f54502]/10 dark:bg-[#f54502]/20"
              : "border-gray-300 dark:border-gray-600 hover:border-[#f54502] dark:hover:border-[#f54502]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Validate image type
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                  setToast({
                    type: 'error',
                    message: 'Invalid image format. Please upload JPG, PNG, or WEBP files only.',
                    onClose: () => setToast(null)
                  });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  return;
                }
                handleImageChange(file);
              }
            }}
          />

          {imagePreview ? (
            <div className="relative h-40 sm:h-48 w-full rounded-[5px] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={imagePreview}
                alt="Event preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={() => {
                  setToast({
                    type: 'error',
                    message: 'Failed to load image. Please upload a valid image file.',
                    onClose: () => setToast(null)
                  });
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                  updateFormData({ image: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setImagePreview(null);
                  updateFormData({ image: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 sm:p-2 bg-[#f54502] text-white rounded-[5px] hover:bg-[#d63a02] transition-colors duration-200"
              >
                <FaTrash size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-3 py-4 sm:py-6">
              <FaCloudUploadAlt className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  JPG, PNG, or WEBP
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid gap-4 sm:gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              placeholder="e.g., Tech Conference 2025"
              required
            />
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              Host
            </label>
            <div className="w-full px-4 py-3 rounded-[5px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 flex items-start space-x-3">
              <div className="mt-1 text-[#f54502]">
                <FaIdCard />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  {formData.hostName || 'Your profile name will be used'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We automatically use the name on your account so attendees know who is hosting.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={4}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            placeholder="Tell attendees what your event is about..."
            required
          />
        </div>

        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <FaTags className="text-[#f54502]" />
            Category *
          </label>
          <SearchableSelect
            options={categoryOptions}
            value={categorySelectValue}
            onChange={handleCategoryChange}
            placeholder={categoriesLoading ? 'Loading categories...' : 'Select a category'}
            disabled={categoriesLoading}
            className="text-sm"
          />
          {categorySelectValue === '__custom__' && (
            <div className="mt-3">
              <input
                type="text"
                value={customCategoryInput}
                onChange={(e) => handleCustomCategoryChange(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="Enter your category"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We&apos;ll attach this category to your event only.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <DateTimePicker
                type="date"
                value={startDateValue}
                onChange={handleStartDateChange}
                minDate={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time *
              </label>
              <DateTimePicker
                type="time"
                value={startTimeValue}
                onChange={handleStartTimeChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-[5px] border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add event end time</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Optional but helpful so attendees know when your event wraps.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showEndTime}
                onChange={(e) => handleToggleEndTime(e.target.checked)}
                className="sr-only"
              />
              <span className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ease-in-out bg-gray-300 dark:bg-gray-600">
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    showEndTime ? 'translate-x-5 bg-[#f54502]' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>
          </div>

          {showEndTime && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
            >
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <DateTimePicker
                  type="date"
                  value={endDateValue}
                  onChange={handleEndDateChange}
                  minDate={startDateValue || new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <DateTimePicker
                  type="time"
                  value={endTimeValue}
                  onChange={handleEndTimeChange}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Virtual Event Toggle - Improved */}
        <div className="pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isVirtual}
              onChange={(e) => {
                const isVirtual = e.target.checked;
                updateFormData({ 
                  isVirtual,
                  // Automatically set location and venue when toggling virtual event
                  location: isVirtual ? 'Online' : formData.location,
                  venue: isVirtual ? 'Virtual Event' : formData.venue,
                  // Clear virtual details when toggling off
                  virtualEventDetails: isVirtual ? formData.virtualEventDetails : undefined
                });
              }}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#f54502]/30 dark:peer-focus:ring-[#f54502]/50 rounded-[5px] peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-[5px] after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#f54502]"></div>
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Virtual Event
            </span>
          </label>
        </div>

        {!formData.isVirtual ? (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Venue Name *
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => updateFormData({ venue: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="e.g., Convention Center"
                required
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How would you like to set your venue?
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleLocationModeChange('platform')}
                  className={`px-4 py-2 rounded-[5px] border transition text-sm sm:text-base ${
                    locationMode === 'platform'
                      ? 'bg-[#f54502] text-white border-[#f54502]'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-[#f54502] dark:hover:border-[#f54502]'
                  }`}
                >
                  Use platform venues
                </button>
                <button
                  type="button"
                  onClick={() => handleLocationModeChange('custom')}
                  className={`px-4 py-2 rounded-[5px] border transition text-sm sm:text-base ${
                    locationMode === 'custom'
                      ? 'bg-[#f54502] text-white border-[#f54502]'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-[#f54502] dark:hover:border-[#f54502]'
                  }`}
                >
                  Add my own location
                </button>
              </div>
            </div>

            {locationMode === 'platform' ? (
              <div className="space-y-3 sm:space-y-4">
                <SearchableSelect
                  options={platformLocationOptions}
                  value={selectedPlatformLocation}
                  onChange={handlePlatformLocationSelect}
                  placeholder={
                    locationsLoading
                      ? 'Loading venues...'
                      : platformLocationOptions.length
                      ? 'Select a venue from Accezz'
                      : 'No venues available yet'
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
                    <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <FaGlobe className="text-[#f54502]" />
                      Country *
                    </label>
                    <SearchableSelect
                      options={countryOptions}
                      value={formData.country || ''}
                      onChange={handleCountryChange}
                      placeholder="Select country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                      placeholder="e.g., Lagos"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address *
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f54502]" />
                    <input
                      ref={addressInputRef}
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                      placeholder="Start typing to find your address"
                      required
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
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="bg-[#f54502]/10 dark:bg-[#f54502]/20 rounded-[5px] p-4 sm:p-6 border border-[#f54502]/20 dark:border-[#f54502]/30"
          >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#f54502] dark:text-[#f54502] flex items-center">
                    <RiEarthLine className="mr-2" /> Virtual Event Setup
                  </h3>
                  <span className="px-2 sm:px-3 py-1 bg-[#f54502]/20 dark:bg-[#f54502]/30 text-[#f54502] dark:text-[#f54502] text-xs font-medium rounded-[5px]">
                    Online Event
                  </span>
                </div>

                {/* Platform Selection */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {(['google-meet', 'zoom', 'meets', 'custom'] as const).map((platform) => (
                  <motion.button
                    key={platform}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const previousDetails = formData.virtualEventDetails || {};
                      updateFormData({
                        virtualEventDetails: {
                          ...previousDetails,
                          platform,
                          meetingUrl:
                            platform === 'zoom'
                              ? previousDetails.meetingUrl || ''
                              : platform === 'custom' || platform === 'google-meet' || platform === 'meets'
                                ? previousDetails.meetingUrl || ''
                                : '',
                          meetingId: platform === 'zoom' ? previousDetails.meetingId || '' : ''
                        },
                        venue: 'Online',
                        location:
                          platform === 'google-meet'
                            ? 'Google Meet'
                            : platform === 'zoom'
                              ? 'Zoom Meeting'
                              : platform === 'meets'
                                ? 'Meets'
                                : 'Virtual Event'
                      });
                    }}
                    className={`p-3 sm:p-4 rounded-[5px] border-2 transition-all duration-200 flex flex-col items-center dark:text-white text-gray-900
                      ${formData.virtualEventDetails?.platform === platform
                      ? 'border-[#f54502] bg-[#f54502]/10 dark:bg-[#f54502]/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-[#f54502]/5 dark:hover:bg-[#f54502]/10 hover:border-[#f54502] dark:hover:border-[#f54502]'
                      }`}
                  >
                      {platform === 'google-meet' && <SiGooglemeet className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'zoom' && <BiLogoZoom className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'meets' && <BsMicrosoftTeams className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      {platform === 'custom' && <FaLink className="text-[#f54502] text-xl sm:text-2xl mb-2" />}
                      <span className="capitalize font-medium text-xs sm:text-sm text-center">
                        {platform === 'google-meet'
                          ? 'Google Meet'
                          : platform === 'meets'
                            ? 'Meets'
                            : platform === 'custom'
                              ? 'Custom Setup'
                              : platform}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Google Meet  */}
                {formData.virtualEventDetails?.platform === 'google-meet' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                    <div className="flex items-start">
                      <FaInfoCircle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                    <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                      Please paste your Google Meet link below. Make sure the link is accessible to attendees.
                    </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FaLink className="mr-2 text-sm" /> Google Meet Link *
                    </label>
                    <input
                    type="url"
                    value={formData.virtualEventDetails?.meetingUrl || ''}
                    onChange={(e) => updateFormData({
                      virtualEventDetails: {
                      ...formData.virtualEventDetails,
                      meetingUrl: e.target.value
                      }
                    })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                        focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    required
                    />
                  </div>
                  </div>
                )}

                {/* Meets Section */}
                {formData.virtualEventDetails?.platform === 'meets' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                      <div className="flex items-start">
                        <FaInfoCircle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                        <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                          Share the Meets session link attendees should use after purchasing their tickets.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaLink className="mr-2 text-sm" /> Meets Link *
                      </label>
                      <input
                        type="url"
                        value={formData.virtualEventDetails?.meetingUrl || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingUrl: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="https://meets.your-platform.com/example"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Zoom Section */}
                {formData.virtualEventDetails?.platform === 'zoom' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaIdCard className="mr-2 text-sm" /> Zoom Meeting ID *
                      </label>
                      <input
                        type="text"
                        value={formData.virtualEventDetails?.meetingId || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingId: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="123 456 7890"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Custom Platform Section */}
                {formData.virtualEventDetails?.platform === 'custom' && (
                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                      <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <FaLink className="mr-2 text-sm" /> Meeting URL *
                      </label>
                      <input
                        type="url"
                        value={formData.virtualEventDetails?.meetingUrl || ''}
                        onChange={(e) => updateFormData({
                          virtualEventDetails: {
                            ...formData.virtualEventDetails,
                            meetingUrl: e.target.value
                          }
                        })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600
                                focus:ring-2 focus:ring-[#f54502] focus:border-transparent
                                bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                        placeholder="https://your-platform.com/meeting-id"
                        required
                      />
                    </div>
                    <div className="bg-[#f54502]/10 dark:bg-[#f54502]/20 p-3 sm:p-4 rounded-[5px] border border-[#f54502]/20 dark:border-[#f54502]/30">
                      <div className="flex items-start">
                        <FaExclamationTriangle className="text-[#f54502] mt-1 mr-2 flex-shrink-0 text-sm sm:text-base" />
                        <p className="text-xs sm:text-sm text-[#f54502] dark:text-[#f54502]">
                          For custom platforms, you&apos;re responsible for creating the meeting and managing access.
                          Ensure the URL is correct and accessible to attendees.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

          </motion.div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end mt-6 sm:mt-8">
        <button
          onClick={() => validateForm() && onNext()}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-[5px] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto text-sm sm:text-base"
        >
          Continue to Ticket Setup
        </button>
      </div>
    </motion.div>
  );
};

export default BasicInfo;