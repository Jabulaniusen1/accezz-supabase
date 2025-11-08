"use client";

import { useMemo, useState } from 'react';
import { useLocationBookings, useUpdateLocationBookingStatus } from '@/hooks/useLocations';
import Loader from '@/components/ui/loader/Loader';
import { LocationBookingStatus } from '@/types/location';
import { format } from 'date-fns';

const statusBadges: Record<LocationBookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  declined: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};

const statusLabels: Record<LocationBookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const LocationBookings: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<LocationBookingStatus | 'all'>('pending');
  const { data, isLoading, isError, error, refetch } = useLocationBookings();
  const { mutateAsync, isPending } = useUpdateLocationBookingStatus();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  const bookings = useMemo(() => data ?? [], [data]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  const handleStatusChange = async (id: string, status: LocationBookingStatus) => {
    try {
      await mutateAsync({ id, status });
      setFeedback(`Booking marked as ${statusLabels[status].toLowerCase()}.`);
      setFeedbackType('success');
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update booking status.';
      setFeedback(message);
      setFeedbackType('error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Location bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review booking requests from visitors and confirm availability.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5">
          {(['all', 'pending', 'accepted', 'declined'] as Array<LocationBookingStatus | 'all'>).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-[#f54502] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {status === 'all' ? 'All' : statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedbackType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200'
          }`}
        >
          {feedback}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-red-600">
          <h2 className="text-lg font-semibold mb-2">Unable to load bookings</h2>
          <p className="text-sm">{error instanceof Error ? error.message : 'Please refresh to try again.'}</p>
        </div>
      )}

      {!isLoading && !isError && filteredBookings.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No bookings yet</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Booking requests will appear here once visitors submit interest in your locations.
          </p>
        </div>
      )}

      {!isLoading && !isError && filteredBookings.length > 0 && (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadges[booking.status]}`}>
                    {statusLabels[booking.status]}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(booking.createdAt), 'dd MMM yyyy, HH:mm')}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {booking.location.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {booking.location.city}, {booking.location.country}
                </p>
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <dt className="font-medium">Event date</dt>
                    <dd>{format(new Date(booking.eventDate), 'EEEE, MMM dd yyyy')}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Time</dt>
                    <dd>
                      {booking.startTime || 'N/A'}
                      {booking.endTime ? ` - ${booking.endTime}` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Event type</dt>
                    <dd>{booking.eventType || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Contact</dt>
                    <dd>
                      {booking.requesterName || '—'}
                      {booking.requesterEmail && <span className="block">{booking.requesterEmail}</span>}
                      {booking.requesterPhone && <span className="block">{booking.requesterPhone}</span>}
                    </dd>
                  </div>
                </dl>
                {booking.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    <span className="font-medium text-gray-700 dark:text-gray-200">Notes:</span> {booking.notes}
                  </p>
                )}
              </div>

              {booking.status === 'pending' && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleStatusChange(booking.id, 'declined')}
                    disabled={isPending}
                    className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleStatusChange(booking.id, 'accepted')}
                    disabled={isPending}
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white text-sm font-semibold shadow disabled:opacity-60"
                  >
                    Accept booking
                  </button>
                </div>
              )}

              {booking.status !== 'pending' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated {format(new Date(booking.updatedAt), 'dd MMM yyyy, HH:mm')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationBookings;

