"use client";

import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Trash2 } from 'lucide-react';
import { useDeleteLocation, useMyLocations } from '@/hooks/useLocations';
import ManageLocationForm from './locations/ManageLocationForm';
import { Location } from '@/types/location';
import Loader from '@/components/ui/loader/Loader';
import Toast from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

export const LocationManager: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useMyLocations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const deleteLocationMutation = useDeleteLocation();

  const locations = useMemo(() => data ?? [], [data]);

  const openCreateModal = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const requestDelete = useCallback((location: Location) => {
    setToast(null);
    setLocationToDelete(location);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (!deleteLocationMutation.isPending) {
      setLocationToDelete(null);
    }
  }, [deleteLocationMutation.isPending]);

  const confirmDelete = useCallback(() => {
    if (!locationToDelete) {
      return;
    }

    setPendingDeleteId(locationToDelete.id);

    deleteLocationMutation.mutate(locationToDelete.id, {
      onSuccess: () => {
        setPendingDeleteId(null);
        setLocationToDelete(null);
        setToast({ type: 'success', message: 'Location deleted successfully.' });
        refetch();
      },
      onError: (mutationError) => {
        setPendingDeleteId(null);
        const message = mutationError instanceof Error ? mutationError.message : 'Failed to delete location.';
        setToast({ type: 'error', message });
      },
    });
  }, [deleteLocationMutation, locationToDelete, refetch]);

  return (
    <div className="grid gap-4">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage event centers. Keep details updated so guests can discover and book seamlessly.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white text-sm font-semibold shadow-lg hover:shadow-xl transition"
        >
          + Add new location
        </button>
      </div>

      {(isLoading || isFetching) && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-red-600">
          <h2 className="text-lg font-semibold mb-2">Unable to load your locations</h2>
          <p className="text-sm">{error instanceof Error ? error.message : 'Please refresh the page or try again later.'}</p>
        </div>
      )}

      {!isLoading && !isError && locations.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f54502]/10 text-[#f54502]">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">No locations yet</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Add your first event center to start receiving booking requests from visitors.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center px-4 py-2 rounded-full border border-[#f54502] text-[#f54502] text-sm font-semibold hover:bg-[#f54502]/10"
          >
            Add a location
          </button>
        </div>
      )}

      {!isLoading && !isError && locations.length > 0 && (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {locations.map((location) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={location.gallery[0]?.imageUrl || location.defaultImageUrl || '/accezz logo c.png'}
                  alt={location.name}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute top-4 left-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow">
                  <MapPin className="mr-1 h-3.5 w-3.5" />
                  {location.city}, {location.country}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{location.name}</h3>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">Gallery: {location.galleryCount}</p>
                  </div>
                  <button
                    onClick={() => openEditModal(location)}
                    className="text-xs font-semibold text-[#f54502] hover:text-[#d63a02]"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Upcoming events: {location.upcomingEvents.length}</span>
                  <span>Capacity: {location.capacity ? location.capacity.toLocaleString() : '—'}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {(location.eventTypes || []).slice(0, 3).map((eventType) => (
                    <span key={eventType} className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-200">
                      {eventType}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-[#f54502]">
                  {location.bookingPrice?.trim()
                    ? location.bookingPrice.trim().startsWith('₦')
                      ? location.bookingPrice.trim()
                      : `₦${location.bookingPrice.trim()}`
                    : 'Contact for price'}
                </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/locations/${location.slug || location.id}`}
                      className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => requestDelete(location)}
                      disabled={pendingDeleteId === location.id || deleteLocationMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {pendingDeleteId === location.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ManageLocationForm
        isOpen={isModalOpen}
        onClose={closeModal}
        location={editingLocation}
        onSuccess={() => {
          refetch();
        }}
      />

      <ConfirmationModal
        isOpen={!!locationToDelete}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={locationToDelete ? `Delete ${locationToDelete.name}?` : 'Delete location'}
        message="Are you sure you want to delete this location? This will remove all associated media and bookings."
        confirmText={pendingDeleteId === locationToDelete?.id ? 'Deleting…' : 'Delete'}
        confirmButtonClass="bg-red-500 hover:bg-red-600 disabled:opacity-60"
        confirmDisabled={deleteLocationMutation.isPending}
      />
    </div>
  );
};

export default LocationManager;

