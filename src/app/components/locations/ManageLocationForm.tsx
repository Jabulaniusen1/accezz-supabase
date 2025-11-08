"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';
import { Location, LocationImage } from '@/types/location';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface ManageLocationFormProps {
  isOpen: boolean;
  onClose: () => void;
  location?: Location | null;
  onSuccess: () => void;
}

interface FormState {
  name: string;
  description: string;
  country: string;
  city: string;
  address: string;
  capacity: string;
  bookingPrice: string;
  contactEmail: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  eventTypes: string[];
  socialLinks: {
    facebook: string;
    instagram: string;
    tiktok: string;
    x: string;
  };
}

const COUNTRY_CITY_MAP: Record<string, string[]> = {
  Nigeria: ['Abuja', 'Calabar', 'Enugu', 'Ibadan', 'Lagos', 'Port Harcourt', 'Uyo'],
  Ghana: ['Accra', 'Kumasi', 'Tamale', 'Takoradi'],
  'South Africa': ['Cape Town', 'Durban', 'Johannesburg', 'Pretoria'],
  Kenya: ['Nairobi', 'Mombasa', 'Nakuru'],
  'United Kingdom': ['Birmingham', 'London', 'Manchester', 'Liverpool'],
};

const AMENITY_SUGGESTIONS = [
  'Air conditioning',
  'Audio system',
  'Catering area',
  'Changing rooms',
  'Parking',
  'Projector',
  'Security',
  'Stage lighting',
  'Wi-Fi',
  'Wheelchair access',
];

const EVENT_TYPE_SUGGESTIONS = [
  'Wedding',
  'Conference',
  'Concert',
  'Corporate Meeting',
  'Trade Show',
  'Birthday Party',
  'Product Launch',
  'Workshop',
  'Religious Gathering',
  'Award Ceremony',
];

const MAX_IMAGES = 5;
const MIN_IMAGES = 3;
const CUSTOM_VALUE = '__custom';

type GoogleAddressComponent = {
  long_name: string;
  short_name?: string;
  types?: string[];
};

type GooglePlaceResult = {
  formatted_address?: string;
  name?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat?: () => number;
      lng?: () => number;
    };
  };
};

type GoogleMapsAutocompleteInstance = {
  addListener: (eventName: string, handler: () => void) => void;
  getPlace: () => GooglePlaceResult;
};

type GoogleMapsPlacesNamespace = {
  Autocomplete: new (
    input: HTMLInputElement,
    opts?: {
      fields?: string[];
      types?: string[];
    }
  ) => GoogleMapsAutocompleteInstance;
};

type GoogleMapsEventNamespace = {
  clearInstanceListeners?: (instance: unknown) => void;
};

type GoogleMapsNamespace = {
  places?: GoogleMapsPlacesNamespace;
  event?: GoogleMapsEventNamespace;
};

type GoogleNamespace = {
  maps?: GoogleMapsNamespace;
};

declare global {
  interface Window {
    google?: GoogleNamespace;
    __googleMapsScriptLoadingPromise?: Promise<GoogleMapsNamespace | null>;
  }
}

const initialFormState: FormState = {
  name: '',
  description: '',
  country: '',
  city: '',
  address: '',
  capacity: '',
  bookingPrice: '',
  contactEmail: '',
  contactPhone: '',
  latitude: null,
  longitude: null,
  amenities: [],
  eventTypes: [],
  socialLinks: {
    facebook: '',
    instagram: '',
    tiktok: '',
    x: '',
  },
};

export const ManageLocationForm: React.FC<ManageLocationFormProps> = ({ isOpen, onClose, location, onSuccess }) => {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [existingImages, setExistingImages] = useState<LocationImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(new Set());
  const [newImages, setNewImages] = useState<File[]>([]);
  const [countrySelectValue, setCountrySelectValue] = useState<string>('');
  const [customCountry, setCustomCountry] = useState('');
  const [citySelectValue, setCitySelectValue] = useState<string>('');
  const [customCity, setCustomCity] = useState('');
  const [amenityInput, setAmenityInput] = useState('');
  const [eventTypeInput, setEventTypeInput] = useState('');
  const [step, setStep] = useState<'details' | 'media'>('details');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteInstanceRef = useRef<GoogleMapsAutocompleteInstance | null>(null);
  const googleApiKeyRef = useRef<string | undefined>(
    process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY ?? process.env.GOOGLE_MAP_API_KEY
  );
  const lastResolvedAddressRef = useRef<string>('');

  const isEditing = Boolean(location);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialiseFromLocation = (loc: Location | null | undefined) => {
      if (loc) {
        setFormState({
          name: loc.name,
          description: loc.description ?? '',
          country: loc.country,
          city: loc.city,
          address: loc.address ?? '',
          capacity: loc.capacity ? String(loc.capacity) : '',
          bookingPrice: loc.bookingPrice ?? '',
          contactEmail: loc.contactEmail ?? '',
          contactPhone: loc.contactPhone ?? '',
          latitude: loc.latitude ?? null,
          longitude: loc.longitude ?? null,
          amenities: loc.amenities ?? [],
          eventTypes: loc.eventTypes ?? [],
          socialLinks: {
            facebook: loc.socialLinks.facebook ?? '',
            instagram: loc.socialLinks.instagram ?? '',
            tiktok: loc.socialLinks.tiktok ?? '',
            x: loc.socialLinks.x ?? '',
          },
        });
        setExistingImages(loc.gallery);
        lastResolvedAddressRef.current = loc.address ?? '';

        if (COUNTRY_CITY_MAP[loc.country]) {
          setCountrySelectValue(loc.country);
          setCustomCountry('');
        } else {
          setCountrySelectValue(CUSTOM_VALUE);
          setCustomCountry(loc.country);
        }

        if (COUNTRY_CITY_MAP[loc.country]?.includes(loc.city)) {
          setCitySelectValue(loc.city);
          setCustomCity('');
        } else {
          setCitySelectValue(CUSTOM_VALUE);
          setCustomCity(loc.city);
        }
      } else {
        setFormState({ ...initialFormState, socialLinks: { ...initialFormState.socialLinks } });
        setExistingImages([]);
        setCountrySelectValue('');
        setCustomCountry('');
        setCitySelectValue('');
        setCustomCity('');
        lastResolvedAddressRef.current = '';
      }

      setNewImages([]);
      setRemovedImageIds(new Set());
      setAmenityInput('');
      setEventTypeInput('');
      setError(null);
      setIsSubmitting(false);
      setStep('details');
    };

    initialiseFromLocation(location ?? null);
  }, [isOpen, location]);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user?.id ?? null);
    };
    loadSession();
  }, []);

  const loadGoogleMapsScript = useCallback((): Promise<GoogleMapsNamespace | null> => {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    if (window.google?.maps?.places) {
      return Promise.resolve(window.google.maps ?? null);
    }

    if (window.__googleMapsScriptLoadingPromise) {
      return window.__googleMapsScriptLoadingPromise;
    }

    const apiKey = googleApiKeyRef.current;

    if (!apiKey) {
      console.warn('Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAP_API_KEY in your environment.');
      return Promise.resolve(null);
    }

    const scriptPromise: Promise<GoogleMapsNamespace | null> = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        resolve(window.google?.maps ?? null);
      };
      script.onerror = (event) => {
        window.__googleMapsScriptLoadingPromise = undefined;
        console.error('Failed to load Google Maps script', event);
        reject(event);
      };
      document.head.appendChild(script);
    });

    window.__googleMapsScriptLoadingPromise = scriptPromise;

    return scriptPromise;
  }, []);

  const deriveLocationFromComponents = useCallback((components: GoogleAddressComponent[] | undefined) => {
    if (!components || !Array.isArray(components)) {
      return { country: undefined, city: undefined } as {
        country?: string;
        city?: string;
      };
    }

    const findComponent = (types: string[]) =>
      components.find((component) => types.some((type) => component.types?.includes?.(type)))?.long_name;

    const country = findComponent(['country']);
    const city =
      findComponent(['locality']) ??
      findComponent(['postal_town']) ??
      findComponent(['administrative_area_level_2']) ??
      findComponent(['administrative_area_level_1']);

    return { country, city };
  }, []);

  const applyPlaceData = useCallback(
    (data: {
      formattedAddress?: string;
      latitude?: number | null;
      longitude?: number | null;
      country?: string;
      city?: string;
    }) => {
      setFormState((prev) => ({
        ...prev,
        address: data.formattedAddress ?? prev.address,
        latitude: data.latitude !== undefined ? data.latitude : prev.latitude,
        longitude: data.longitude !== undefined ? data.longitude : prev.longitude,
        country: data.country ?? prev.country,
        city: data.city ?? prev.city,
      }));

      if (data.country) {
        if (COUNTRY_CITY_MAP[data.country]) {
          setCountrySelectValue(data.country);
          setCustomCountry('');
        } else {
          setCountrySelectValue(CUSTOM_VALUE);
          setCustomCountry(data.country);
        }
      }

      if (data.city) {
        const isCityInList = data.country ? COUNTRY_CITY_MAP[data.country]?.includes(data.city) : false;
        if (isCityInList) {
          setCitySelectValue(data.city);
          setCustomCity('');
        } else {
          setCitySelectValue(CUSTOM_VALUE);
          setCustomCity(data.city);
        }
      }

      if (data.formattedAddress) {
        lastResolvedAddressRef.current = data.formattedAddress;
      }

      setError(null);
    },
    [setFormState, setCountrySelectValue, setCustomCountry, setCitySelectValue, setCustomCity, setError]
  );

  const handlePlaceSelection = useCallback(
    (place: GooglePlaceResult) => {
      if (!place) {
        return;
      }

      const geometry = place.geometry;
      const geoLocation = geometry?.location;
      const latitude = typeof geoLocation?.lat === 'function' ? geoLocation.lat() : null;
      const longitude = typeof geoLocation?.lng === 'function' ? geoLocation.lng() : null;
      const formattedAddress = place.formatted_address ?? place.name ?? '';
      const { country, city } = deriveLocationFromComponents(place.address_components);

      applyPlaceData({
        formattedAddress: formattedAddress || undefined,
        latitude,
        longitude,
        country: country ?? undefined,
        city: city ?? undefined,
      });
    },
    [applyPlaceData, deriveLocationFromComponents]
  );

  const geocodeAddress = useCallback(
    async (address: string) => {
      const apiKey = googleApiKeyRef.current;

      if (!apiKey) {
        console.warn('Unable to geocode address because Google Maps API key is missing.');
        return false;
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );
        const payload = await response.json();

        if (payload.status === 'OK' && Array.isArray(payload.results) && payload.results.length > 0) {
          const [primary] = payload.results;
          const { country, city } = deriveLocationFromComponents(primary.address_components);
          const latValue = typeof primary.geometry?.location?.lat === 'number' ? primary.geometry.location.lat : null;
          const lngValue = typeof primary.geometry?.location?.lng === 'number' ? primary.geometry.location.lng : null;

          applyPlaceData({
            formattedAddress: primary.formatted_address ?? address,
            latitude: latValue,
            longitude: lngValue,
            country: country ?? undefined,
            city: city ?? undefined,
          });
          return true;
        }

        console.warn('No geocoding results found for address:', address, payload.status, payload.error_message);
        return false;
      } catch (err) {
        console.error('Failed to geocode address', err);
        return false;
      }
    },
    [applyPlaceData, deriveLocationFromComponents]
  );

  const handleAddressInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      lastResolvedAddressRef.current = '';
      setFormState((prev) => ({
        ...prev,
        address: value,
        latitude: null,
        longitude: null,
      }));
    },
    [setFormState]
  );

  const handleAddressBlur = useCallback(() => {
    const trimmed = formState.address.trim();
    if (!trimmed) {
      return;
    }

    if (lastResolvedAddressRef.current && trimmed === lastResolvedAddressRef.current) {
      return;
    }

    void geocodeAddress(trimmed);
  }, [formState.address, geocodeAddress]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;
    let autocomplete: GoogleMapsAutocompleteInstance | null = null;

    loadGoogleMapsScript()
      .then((maps) => {
        if (!isActive || !maps || !addressInputRef.current) {
          return null;
        }

        autocomplete = maps.places?.Autocomplete
          ? new maps.places.Autocomplete(addressInputRef.current, {
          fields: ['formatted_address', 'geometry', 'address_components', 'name'],
          types: ['geocode'],
          })
          : null;

        if (autocomplete) {
          autocomplete.addListener('place_changed', () => {
            handlePlaceSelection(autocomplete!.getPlace());
          });

          autocompleteInstanceRef.current = autocomplete;
        }
        return null;
      })
      .catch((error) => {
        console.error('Unable to initialise Google Places Autocomplete', error);
      });

    return () => {
      isActive = false;
      if (autocomplete) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocomplete);
        } catch (cleanupError) {
          console.error('Failed to clean up Google Places listeners', cleanupError);
        }
      }
      autocompleteInstanceRef.current = null;
    };
  }, [isOpen, loadGoogleMapsScript, handlePlaceSelection]);

  const totalImagesCount = useMemo(() => {
    return existingImages.filter((image) => !removedImageIds.has(image.id)).length + newImages.length;
  }, [existingImages, newImages, removedImageIds]);

  const countryOptions = useMemo(() => {
    const options = Object.keys(COUNTRY_CITY_MAP).map((country) => ({ value: country, label: country }));
    if (formState.country && !COUNTRY_CITY_MAP[formState.country]) {
      options.push({ value: formState.country, label: formState.country });
    }
    options.push({ value: CUSTOM_VALUE, label: 'Other (type country)' });
    return options;
  }, [formState.country]);

  const availableCities = useMemo(() => {
    if (formState.country && COUNTRY_CITY_MAP[formState.country]) {
      return COUNTRY_CITY_MAP[formState.country];
    }
    return [];
  }, [formState.country]);

  const cityOptions = useMemo(() => {
    const baseOptions = availableCities.map((city) => ({ value: city, label: city }));
    if (formState.city && formState.city !== '' && !availableCities.includes(formState.city)) {
      baseOptions.push({ value: formState.city, label: formState.city });
    }
    baseOptions.push({ value: CUSTOM_VALUE, label: 'Other (type city)' });
    return baseOptions;
  }, [availableCities, formState.city]);

  const filteredAmenitySuggestions = useMemo(() => {
    if (!amenityInput.trim()) {
      return AMENITY_SUGGESTIONS.filter((suggestion) => !formState.amenities.includes(suggestion));
    }
    const lower = amenityInput.trim().toLowerCase();
    return AMENITY_SUGGESTIONS.filter(
      (suggestion) => suggestion.toLowerCase().includes(lower) && !formState.amenities.includes(suggestion)
    );
  }, [amenityInput, formState.amenities]);

  const filteredEventTypeSuggestions = useMemo(() => {
    if (!eventTypeInput.trim()) {
      return EVENT_TYPE_SUGGESTIONS.filter((suggestion) => !formState.eventTypes.includes(suggestion));
    }
    const lower = eventTypeInput.trim().toLowerCase();
    return EVENT_TYPE_SUGGESTIONS.filter(
      (suggestion) => suggestion.toLowerCase().includes(lower) && !formState.eventTypes.includes(suggestion)
    );
  }, [eventTypeInput, formState.eventTypes]);

  const handleFilesSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const totalAfterUpload = totalImagesCount + files.length;
    if (totalAfterUpload > MAX_IMAGES) {
      setError(`You can upload at most ${MAX_IMAGES} images. Remove some images before adding new ones.`);
      return;
    }

    setNewImages((prev) => [...prev, ...files]);
  }, [totalImagesCount]);

  const handleRemoveExistingImage = useCallback((imageId: string) => {
    setRemovedImageIds((prev) => new Set(prev).add(imageId));
  }, []);

  const handleRestoreExistingImage = useCallback((imageId: string) => {
    setRemovedImageIds((prev) => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  }, []);

  const handleRemoveNewImage = useCallback((index: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleCountrySelect = useCallback((value: string) => {
    setCountrySelectValue(value);
    setCustomCountry('');
    setCustomCity('');
    setCitySelectValue('');

    if (!value) {
      setFormState((prev) => ({ ...prev, country: '', city: '' }));
      return;
    }

    if (value === CUSTOM_VALUE) {
      setFormState((prev) => ({ ...prev, country: '', city: '' }));
      return;
    }

    const defaultCity = COUNTRY_CITY_MAP[value]?.[0] ?? '';
    setFormState((prev) => ({ ...prev, country: value, city: defaultCity }));
    if (defaultCity) {
      setCitySelectValue(defaultCity);
    }
  }, []);

  const handleCitySelect = useCallback((value: string) => {
    setCitySelectValue(value);
    setCustomCity('');

    if (!value) {
      setFormState((prev) => ({ ...prev, city: '' }));
      return;
    }

    if (value === CUSTOM_VALUE) {
      setFormState((prev) => ({ ...prev, city: '' }));
      return;
    }

    setFormState((prev) => ({ ...prev, city: value }));
  }, []);

  const addAmenity = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFormState((prev) => {
      if (prev.amenities.includes(trimmed)) {
        return prev;
      }
      return { ...prev, amenities: [...prev.amenities, trimmed] };
    });
    setAmenityInput('');
  }, []);

  const removeAmenity = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((amenity) => amenity !== value),
    }));
  }, []);

  const addEventType = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setFormState((prev) => {
      if (prev.eventTypes.includes(trimmed)) {
        return prev;
      }
      return { ...prev, eventTypes: [...prev.eventTypes, trimmed] };
    });
    setEventTypeInput('');
  }, []);

  const removeEventType = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      eventTypes: prev.eventTypes.filter((type) => type !== value),
    }));
  }, []);

  const validateDetails = useCallback(() => {
    if (!formState.name.trim()) {
      setError('Location name is required.');
      return false;
    }
    if (!formState.country.trim()) {
      setError('Country is required.');
      return false;
    }
    if (!formState.city.trim()) {
      setError('City is required.');
      return false;
    }
    return true;
  }, [formState.city, formState.country, formState.name]);

  const validateMedia = useCallback(() => {
    if (totalImagesCount < MIN_IMAGES) {
      setError(`Please provide at least ${MIN_IMAGES} images for this location.`);
      return false;
    }
    return true;
  }, [totalImagesCount]);

  const uploadImageFile = useCallback(async (locationId: string, ownerId: string, file: File, position: number) => {
    const extension = file.name.split('.').pop() || 'jpg';
    const filePath = `locations/${ownerId}/${locationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage.from('locations-images').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('locations-images').getPublicUrl(filePath);
    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      throw new Error('Unable to generate public URL for location image');
    }

    const { error: galleryError } = await supabase
      .from('location_gallery')
      .insert({ location_id: locationId, image_url: publicUrl, position });

    if (galleryError) throw galleryError;
  }, []);

  const ensureDefaultImage = useCallback(async (locationId: string) => {
    const { data: galleryData, error: galleryError } = await supabase
      .from('location_gallery')
      .select('image_url')
      .eq('location_id', locationId)
      .order('position')
      .limit(1)
      .maybeSingle();

    if (galleryError) throw galleryError;

    if (galleryData?.image_url) {
      await supabase
        .from('locations')
        .update({ default_image_url: galleryData.image_url })
        .eq('id', locationId);
    }
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (step === 'details') {
      if (!validateDetails()) {
        return;
      }

      if (formState.address.trim() && (formState.latitude === null || formState.longitude === null)) {
        const resolved = await geocodeAddress(formState.address.trim());
        if (!resolved) {
          setError('Please select a valid address suggestion so we can pinpoint the venue on the map.');
          return;
        }
      }

      setStep('media');
      return;
    }

    if (!validateDetails() || !validateMedia()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const amenities = Array.from(new Set(formState.amenities.map((item) => item.trim()).filter(Boolean)));
      const eventTypes = Array.from(new Set(formState.eventTypes.map((item) => item.trim()).filter(Boolean)));
      const trimmedFacebook = formState.socialLinks.facebook.trim();
      const trimmedInstagram = formState.socialLinks.instagram.trim();
      const trimmedTiktok = formState.socialLinks.tiktok.trim();
      const trimmedX = formState.socialLinks.x.trim();
      const capacity = formState.capacity ? Number(formState.capacity) : null;
      const bookingPrice = formState.bookingPrice.trim();

      if (capacity !== null && Number.isNaN(capacity)) {
        throw new Error('Capacity must be a valid number.');
      }

      if (!userId) {
        throw new Error('Unable to determine current user. Please re-authenticate.');
      }

      if (isEditing && location) {
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            name: formState.name.trim(),
            description: formState.description.trim() || null,
            country: formState.country.trim(),
            city: formState.city.trim(),
            address: formState.address.trim() || null,
            capacity,
            booking_price: bookingPrice || null,
            contact_email: formState.contactEmail.trim() || null,
            contact_phone: formState.contactPhone.trim() || null,
            latitude: formState.latitude ?? null,
            longitude: formState.longitude ?? null,
            amenities: amenities.length ? amenities : null,
            event_types: eventTypes,
            facebook_url: trimmedFacebook || null,
            instagram_url: trimmedInstagram || null,
            tiktok_url: trimmedTiktok || null,
            x_url: trimmedX || null,
          })
          .eq('id', location.id);

        if (updateError) throw updateError;

        if (removedImageIds.size) {
          const idsToRemove = Array.from(removedImageIds);
          const { error: deleteError } = await supabase
            .from('location_gallery')
            .delete()
            .in('id', idsToRemove);
          if (deleteError) throw deleteError;
        }

        const remainingImages = existingImages.filter((image) => !removedImageIds.has(image.id));

        for (let index = 0; index < remainingImages.length; index += 1) {
          const image = remainingImages[index];
          const { error: posError } = await supabase
            .from('location_gallery')
            .update({ position: index })
            .eq('id', image.id);
          if (posError) throw posError;
        }

        for (let index = 0; index < newImages.length; index += 1) {
          const file = newImages[index];
          await uploadImageFile(location.id, userId, file, remainingImages.length + index);
        }

        await ensureDefaultImage(location.id);
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('You must be logged in to create a location.');
        }

        const { data: insertedLocation, error: insertError } = await supabase
          .from('locations')
          .insert({
            user_id: session.user.id,
            name: formState.name.trim(),
            description: formState.description.trim() || null,
            country: formState.country.trim(),
            city: formState.city.trim(),
            address: formState.address.trim() || null,
            capacity,
            booking_price: bookingPrice || null,
            contact_email: formState.contactEmail.trim() || null,
            contact_phone: formState.contactPhone.trim() || null,
            latitude: formState.latitude ?? null,
            longitude: formState.longitude ?? null,
            amenities: amenities.length ? amenities : null,
            event_types: eventTypes,
            facebook_url: trimmedFacebook || null,
            instagram_url: trimmedInstagram || null,
            tiktok_url: trimmedTiktok || null,
            x_url: trimmedX || null,
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        for (let index = 0; index < newImages.length; index += 1) {
          const file = newImages[index];
          await uploadImageFile(insertedLocation.id, session.user.id, file, index);
        }

        await ensureDefaultImage(insertedLocation.id);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while saving this location.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    ensureDefaultImage,
    existingImages,
    formState.address,
    formState.amenities,
    formState.capacity,
    formState.bookingPrice,
    formState.city,
    formState.contactEmail,
    formState.contactPhone,
    formState.latitude,
    formState.longitude,
    formState.country,
    formState.description,
    formState.eventTypes,
    formState.name,
    formState.socialLinks,
    geocodeAddress,
    isEditing,
    location,
    newImages,
    onClose,
    onSuccess,
    removedImageIds,
    step,
    uploadImageFile,
    validateDetails,
    validateMedia,
    userId,
  ]);

  const renderExistingImages = () => {
    if (!existingImages.length) {
      return null;
    }

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Current images</p>
        <div className="grid grid-cols-2 gap-3">
          {existingImages.map((image) => {
            const isRemoved = removedImageIds.has(image.id);
            return (
              <div
                key={image.id}
                className={`relative overflow-hidden rounded-xl border ${
                  isRemoved ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="relative h-32 w-full">
                  <Image
                    src={image.imageUrl}
                    alt="Location"
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 25vw, 50vw"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => (isRemoved ? handleRestoreExistingImage(image.id) : handleRemoveExistingImage(image.id))}
                    className={`absolute inset-x-2 bottom-2 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      isRemoved
                        ? 'bg-white/80 text-gray-800 hover:bg-white'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {isRemoved ? 'Undo remove' : 'Remove image'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderNewImages = () => {
    if (!newImages.length) {
      return null;
    }

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">New images to upload</p>
        <div className="grid grid-cols-2 gap-3">
          {newImages.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">{file.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              <button
                type="button"
                onClick={() => handleRemoveNewImage(index)}
                className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Location name</label>
            <input
              type="text"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="Wildflower Event Center"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Country</label>
            <SearchableSelect
              options={countryOptions}
              value={countrySelectValue}
              onChange={handleCountrySelect}
              placeholder="Select country"
            />
            {countrySelectValue === CUSTOM_VALUE && (
              <input
                type="text"
                value={customCountry}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomCountry(value);
                  setFormState((prev) => ({ ...prev, country: value }));
                }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="Type country"
              />
            )}
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">City</label>
            <SearchableSelect
              options={cityOptions}
              value={citySelectValue}
              onChange={handleCitySelect}
              placeholder={formState.country ? 'All cities' : 'Select a country first'}
              disabled={!formState.country}
            />
            {citySelectValue === CUSTOM_VALUE && (
              <input
                type="text"
                value={customCity}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomCity(value);
                  setFormState((prev) => ({ ...prev, city: value }));
                }}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="Type city"
              />
            )}
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Address</label>
            <input
              ref={addressInputRef}
              type="text"
              value={formState.address}
              onChange={handleAddressInputChange}
              onBlur={handleAddressBlur}
              autoComplete="off"
              spellCheck={false}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="123 Venue Avenue"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Capacity (optional)</label>
            <input
              type="number"
              value={formState.capacity}
              onChange={(event) => setFormState((prev) => ({ ...prev, capacity: event.target.value }))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="500"
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Booking price</label>
            <input
              type="text"
              value={formState.bookingPrice}
              onChange={(event) => setFormState((prev) => ({ ...prev, bookingPrice: event.target.value }))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="e.g. ₦250,000 or Contact for price"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Leave blank to show “Contact for price”.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
            <textarea
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              rows={6}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="Describe the venue, available setups, and what makes it special."
            />
          </div>

        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Event types hosted here</label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose the kinds of events your venue supports. This helps visitors book the right space.
          </p>
          <div className="flex flex-wrap gap-2">
            {formState.eventTypes.map((eventType) => (
              <span
                key={eventType}
                className="inline-flex items-center space-x-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-200"
              >
                <span>{eventType}</span>
                <button
                  type="button"
                  onClick={() => removeEventType(eventType)}
                  className="text-indigo-500 hover:text-indigo-700"
                  aria-label={`Remove ${eventType}`}
                >
                  ×
                </button>
              </span>
            ))}
            {formState.eventTypes.length === 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                No event types added yet. Start typing to add one.
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={eventTypeInput}
              onChange={(event) => setEventTypeInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Tab') {
                  event.preventDefault();
                  addEventType(eventTypeInput);
                }
              }}
              placeholder="Type an event type and press Enter"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
            />
            {filteredEventTypeSuggestions.length > 0 && eventTypeInput.trim() && (
              <div className="absolute z-40 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                {filteredEventTypeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addEventType(suggestion)}
                    className="flex w-full justify-between px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span>{suggestion}</span>
                    <span className="text-xs text-gray-400">Tap to add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {formState.amenities.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center space-x-2 rounded-full bg-[#f54502]/10 px-3 py-1 text-xs font-semibold text-[#f54502]"
              >
                <span>{amenity}</span>
                <button
                  type="button"
                  onClick={() => removeAmenity(amenity)}
                  className="text-[#f54502] hover:text-[#d63a02]"
                  aria-label={`Remove ${amenity}`}
                >
                  ×
                </button>
              </span>
            ))}
            {formState.amenities.length === 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                No amenities added yet. Start typing to add one.
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={amenityInput}
              onChange={(event) => setAmenityInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Tab') {
                  event.preventDefault();
                  addAmenity(amenityInput);
                }
              }}
              placeholder="Type an amenity and press Enter"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
            />
            {filteredAmenitySuggestions.length > 0 && amenityInput.trim() && (
              <div className="absolute z-40 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                {filteredAmenitySuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addAmenity(suggestion)}
                    className="flex w-full justify-between px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span>{suggestion}</span>
                    <span className="text-xs text-gray-400">Tap to add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMediaStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Contact email</label>
            <input
              type="email"
              value={formState.contactEmail}
              onChange={(event) => setFormState((prev) => ({ ...prev, contactEmail: event.target.value }))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="bookings@yourvenue.com"
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Contact phone</label>
            <input
              type="tel"
              value={formState.contactPhone}
              onChange={(event) => setFormState((prev) => ({ ...prev, contactPhone: event.target.value }))}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
              placeholder="+234 801 234 5678"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Social media links</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Facebook</span>
              <input
                type="url"
                value={formState.socialLinks.facebook}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, facebook: event.target.value },
                  }))
                }
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="https://facebook.com/yourvenue"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Instagram</span>
              <input
                type="url"
                value={formState.socialLinks.instagram}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, instagram: event.target.value },
                  }))
                }
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="https://instagram.com/yourvenue"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">TikTok</span>
              <input
                type="url"
                value={formState.socialLinks.tiktok}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, tiktok: event.target.value },
                  }))
                }
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="https://tiktok.com/@yourvenue"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">X (Twitter)</span>
              <input
                type="url"
                value={formState.socialLinks.x}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    socialLinks: { ...prev.socialLinks, x: event.target.value },
                  }))
                }
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                placeholder="https://twitter.com/yourvenue"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Upload images ({MIN_IMAGES}-{MAX_IMAGES})
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-4 text-sm"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload bright, horizontal photos showcasing the venue. Accepted formats: JPG, PNG. Max {MAX_IMAGES} images in total.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Currently selected: {totalImagesCount}</p>
        </div>

        {renderExistingImages()}
        {renderNewImages()}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isEditing ? 'Edit location' : 'Create new location'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Provide full details and at least three high-quality images of your event center.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white/70 dark:bg-gray-800/80 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex items-center justify-center gap-4 pb-4">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    step === 'details'
                      ? 'bg-[#f54502] text-white shadow'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ${step === 'details' ? 'text-white' : 'text-black'}`}>
                    1
                  </span>
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateDetails()) {
                      setStep('media');
                    }
                  }}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    step === 'media'
                      ? 'bg-[#f54502] text-white shadow'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 ${step === 'media' ? 'text-white' : 'text-black'}`}>
                    2
                  </span>
                  Media & contact
                </button>
              </div>
            </div>

            <form className="max-h-[70vh] overflow-y-auto px-6 pb-6 space-y-6" onSubmit={handleSubmit}>
              {step === 'details' ? renderDetailsStep() : renderMediaStep()}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'media') {
                      setStep('details');
                    } else {
                      onClose();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={isSubmitting}
                >
                  {step === 'media' ? 'Back' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-6 py-2.5 rounded-full bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white text-sm font-semibold shadow disabled:opacity-70"
                >
                  {step === 'details'
                    ? 'Next: Media & contact'
                    : isSubmitting
                    ? 'Saving...'
                    : isEditing
                    ? 'Save changes'
                    : 'Create location'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ManageLocationForm;
