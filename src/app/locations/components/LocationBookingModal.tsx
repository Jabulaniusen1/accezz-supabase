"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { createLocationBooking } from '@/hooks/useLocations';
import { Location } from '@/types/location';
import Calendar from 'react-calendar';
import { format } from 'date-fns';
import { CalendarDays, Clock, ChevronDown } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

type LocationBookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  location: Location;
};

const DEFAULT_EVENT_TYPES = [
  'Wedding',
  'Conference',
  'Concert',
  'Corporate Meeting',
  'Trade Show',
  'Private Party',
  'Other',
];

export const LocationBookingModal: React.FC<LocationBookingModalProps> = ({ isOpen, onClose, location }) => {
  const eventTypeOptions = useMemo(() => {
    const base = location.eventTypes && location.eventTypes.length > 0 ? location.eventTypes : DEFAULT_EVENT_TYPES;
    const unique = Array.from(new Set(base.concat('Other')));
    return unique;
  }, [location.eventTypes]);

  const rawPrice = location.bookingPrice?.trim();
  const priceLabel = rawPrice ? (rawPrice.startsWith('₦') ? rawPrice : `₦${rawPrice}`) : 'Contact for price';

  const timeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      const label = format(new Date(2000, 0, 1, hours, mins), 'h:mm a');
      options.push({ value, label });
    }
    return options;
  }, []);

  const [formState, setFormState] = useState({
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    eventType: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<HTMLDivElement | null>(null);
  const endTimeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      eventType: eventTypeOptions[0] ?? '',
    }));
  }, [eventTypeOptions]);

  const mutation = useMutation({
    mutationFn: createLocationBooking,
    onSuccess: () => {
      setSuccessMessage('Your booking request has been submitted. The venue manager will contact you soon.');
      setError(null);
      setFormState((prev) => ({
        ...prev,
        requesterName: '',
        requesterEmail: '',
        requesterPhone: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        notes: '',
        eventType: eventTypeOptions[0] ?? '',
      }));
      setIsDatePickerOpen(false);
      setIsStartTimeOpen(false);
      setIsEndTimeOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to submit booking request. Please try again.';
      setError(message);
      setSuccessMessage(null);
    },
  });

  const reset = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
    setFormState({
      requesterName: '',
      requesterEmail: '',
      requesterPhone: '',
      eventType: eventTypeOptions[0] ?? '',
      eventDate: '',
      startTime: '',
      endTime: '',
      notes: '',
    });
    setIsDatePickerOpen(false);
    setIsStartTimeOpen(false);
    setIsEndTimeOpen(false);
  }, [eventTypeOptions]);

  const handleClose = useCallback(() => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  }, [mutation.isPending, onClose, reset]);

  const formattedDateLabel = useMemo(() => {
    if (!formState.eventDate) {
      return 'Select date';
    }
    const parts = formState.eventDate.split('-');
    if (parts.length !== 3) {
      return formState.eventDate;
    }
    const [year, month, day] = parts.map((part) => Number(part));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return formState.eventDate;
    }
    return format(new Date(year, month - 1, day), 'EEE, MMM d, yyyy');
  }, [formState.eventDate]);

  const calendarValue = useMemo(() => {
    if (!formState.eventDate) {
      return new Date();
    }
    const parts = formState.eventDate.split('-');
    if (parts.length !== 3) {
      return new Date();
    }
    const [year, month, day] = parts.map((part) => Number(part));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return new Date();
    }
    return new Date(year, month - 1, day);
  }, [formState.eventDate]);

  const getTimeLabel = useCallback(
    (value: string, fallback: string) => {
      const match = timeOptions.find((option) => option.value === value);
      return match?.label ?? fallback;
    },
    [timeOptions]
  );

  const handleDateSelect = useCallback(
    (value: unknown) => {
      if (!value) {
        return;
      }
      const arrayValue = Array.isArray(value) ? value : [value];
      const selected = arrayValue.find((item): item is Date => item instanceof Date);
      if (!(selected instanceof Date)) {
        return;
      }
      setFormState((prev) => ({
        ...prev,
        eventDate: format(selected, 'yyyy-MM-dd'),
      }));
      setIsDatePickerOpen(false);
      setError(null);
    },
    []
  );

  const handleTimeSelect = useCallback(
    (field: 'startTime' | 'endTime', value: string) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (field === 'startTime') {
        setIsStartTimeOpen(false);
      } else {
        setIsEndTimeOpen(false);
      }
      setError(null);
    },
    []
  );

  const validateForm = useCallback(() => {
    if (!formState.eventDate) {
      setError('Please choose the date for your event.');
      return false;
    }
    if (!formState.startTime) {
      setError('Please choose a start time for your event.');
      return false;
    }
    if (!formState.eventType) {
      setError('Please choose the type of event.');
      return false;
    }
    if (!formState.requesterName.trim()) {
      setError('Please provide your full name.');
      return false;
    }
    if (!formState.requesterEmail.trim()) {
      setError('Please provide your email so we can reach you.');
      return false;
    }
    return true;
  }, [formState]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setSuccessMessage(null);
      if (!validateForm()) {
        return;
      }
      mutation.mutate({
        locationId: location.id,
        requesterName: formState.requesterName.trim(),
        requesterEmail: formState.requesterEmail.trim(),
        requesterPhone: formState.requesterPhone.trim() || undefined,
        eventType: formState.eventType,
        eventDate: formState.eventDate,
        startTime: formState.startTime,
        endTime: formState.endTime || undefined,
        notes: formState.notes.trim() || undefined,
      });
    },
    [formState, location.id, mutation, validateForm]
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isDatePickerOpen && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
      if (isStartTimeOpen && startTimeRef.current && !startTimeRef.current.contains(target)) {
        setIsStartTimeOpen(false);
      }
      if (isEndTimeOpen && endTimeRef.current && !endTimeRef.current.contains(target)) {
        setIsEndTimeOpen(false);
      }
    };

    if (isDatePickerOpen || isStartTimeOpen || isEndTimeOpen) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isDatePickerOpen, isStartTimeOpen, isEndTimeOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed overflow-y-auto h-screen top-0 inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 p-4 lg:p-6 shadow-xl border border-gray-100 dark:border-gray-800"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close booking form"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="mb-6 pr-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Book {location.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tell us about your event and the venue manager will confirm availability.
              </p>
              <p className="mt-2 inline-flex items-center rounded-full bg-[#f54502]/10 px-3 py-1 text-xs font-semibold text-[#f54502]">
                {priceLabel}
              </p>
              {location.eventTypes.length > 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This venue works best for: {location.eventTypes.join(', ')}
                </p>
              )}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
                  <input
                    type="text"
                    value={formState.requesterName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, requesterName: event.target.value }))}
                    className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                  <input
                    type="email"
                    value={formState.requesterEmail}
                    onChange={(event) => setFormState((prev) => ({ ...prev, requesterEmail: event.target.value }))}
                    className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Phone (optional)</label>
                  <input
                    type="tel"
                    value={formState.requesterPhone}
                    onChange={(event) => setFormState((prev) => ({ ...prev, requesterPhone: event.target.value }))}
                    className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                    placeholder="+234 801 234 5678"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Event type</label>
                  <select
                    value={formState.eventType}
                    onChange={(event) => setFormState((prev) => ({ ...prev, eventType: event.target.value }))}
                    className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                  >
                    {eventTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex flex-1 flex-col space-y-2" ref={datePickerRef}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Event date</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDatePickerOpen((prev) => !prev);
                        setIsStartTimeOpen(false);
                        setIsEndTimeOpen(false);
                      }}
                      className="flex items-center justify-between rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                    >
                      <span className={formState.eventDate ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                        {formattedDateLabel}
                      </span>
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                    </button>
                    {isDatePickerOpen && (
                      <div className="relative z-30">
                        <div className="absolute mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-2xl">
                          <Calendar
                            value={calendarValue}
                            onChange={handleDateSelect}
                            minDate={new Date()}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-row gap-3">
                    <div className="relative flex flex-1 flex-col space-y-2" ref={startTimeRef}>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Start time</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStartTimeOpen((prev) => !prev);
                          setIsEndTimeOpen(false);
                          setIsDatePickerOpen(false);
                        }}
                        className="flex items-center justify-between rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                      >
                        <span className={formState.startTime ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                          {getTimeLabel(formState.startTime, 'Start')}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="h-4 w-4" />
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </button>
                      {isStartTimeOpen && (
                        <div className="absolute top-full z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
                          {timeOptions.map((option) => (
                            <button
                              key={`start-${option.value}`}
                              type="button"
                              onClick={() => handleTimeSelect('startTime', option.value)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                option.value === formState.startTime
                                  ? 'bg-gray-100 dark:bg-gray-800 text-[#f54502]'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}
                            >
                              <span>{option.label}</span>
                              {option.value === formState.startTime && <Clock className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative flex flex-1 flex-col space-y-2" ref={endTimeRef}>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">End time</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEndTimeOpen((prev) => !prev);
                          setIsStartTimeOpen(false);
                          setIsDatePickerOpen(false);
                        }}
                        className="flex items-center justify-between rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                      >
                        <span className={formState.endTime ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                          {getTimeLabel(formState.endTime, 'End')}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="h-4 w-4" />
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </button>
                      {isEndTimeOpen && (
                        <div className="absolute top-full z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
                          <button
                            type="button"
                            onClick={() => handleTimeSelect('endTime', '')}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                              formState.endTime === ''
                                ? 'bg-gray-100 dark:bg-gray-800 text-[#f54502]'
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            <span>No end time</span>
                          </button>
                          {timeOptions.map((option) => (
                            <button
                              key={`end-${option.value}`}
                              type="button"
                              onClick={() => handleTimeSelect('endTime', option.value)}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                option.value === formState.endTime
                                  ? 'bg-gray-100 dark:bg-gray-800 text-[#f54502]'
                                  : 'text-gray-700 dark:text-gray-200'
                              }`}
                            >
                              <span>{option.label}</span>
                              {option.value === formState.endTime && <Clock className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Additional details (optional)</label>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  className="rounded-[5px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f54502]"
                  placeholder="Tell us more about your event, expected guests, or setup needs."
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-[5px] text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex rounded-[5px] items-center px-5 py-2.5 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white text-sm font-semibold shadow-md disabled:opacity-60"
                >
                  {mutation.isPending ? 'Submitting...' : 'Submit booking request'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationBookingModal;

