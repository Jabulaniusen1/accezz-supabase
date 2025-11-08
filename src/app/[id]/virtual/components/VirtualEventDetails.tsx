import React from 'react';
import { FaCalendarAlt, FaClock, FaInfoCircle, FaLink, FaVideo } from 'react-icons/fa';
import { type Event } from '@/types/event';
import { formatEventDate, formatEventTime } from '@/utils/formatDateTime';

interface VirtualEventDetailsProps {
  event: Event;
}

export const getVirtualPlatformLabel = (event: Event): string => {
  const platform = event.virtualEventDetails?.platform;
  const meetingUrl = event.virtualEventDetails?.meetingUrl;

  const hostnameFromUrl = () => {
    if (!meetingUrl) return null;
    try {
      const url = new URL(meetingUrl);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  };

  switch (platform) {
    case 'zoom':
      return 'Zoom';
    case 'google-meet':
      return 'Google Meet';
    case 'meets':
      return 'Meets';
    case 'custom':
      return hostnameFromUrl() ?? 'Online';
    default:
      return hostnameFromUrl() ?? 'Online';
  }
};

export default function VirtualEventDetails({ event }: VirtualEventDetailsProps) {
  const virtualDetails = event.virtualEventDetails;
  const platformLabel = getVirtualPlatformLabel(event);
  const meetingUrl = virtualDetails?.meetingUrl;
  const meetingId = virtualDetails?.meetingId;
  const formattedDate = formatEventDate(event.date);
  const formattedTime = formatEventTime(event.time);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#f54502]/15 bg-white/95 p-6 shadow-lg dark:border-[#f54502]/30 dark:bg-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f54502]/15 text-[#f54502]">
            <FaInfoCircle className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How to join</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Virtual access information</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3 rounded-2xl border border-[#f54502]/15 bg-[#f54502]/5 p-4 dark:border-[#f54502]/20 dark:bg-[#f54502]/10">
            <FaVideo className="mt-1 text-[#f54502]" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Hosted on {platformLabel}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Join from anywhere — we’ll send the access link to your email as soon as your booking is confirmed.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200/60 p-4 dark:border-gray-700/60">
              <FaCalendarAlt className="mt-1 text-[#f54502]" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200/60 p-4 dark:border-gray-700/60">
              <FaClock className="mt-1 text-[#f54502]" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formattedTime}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {meetingUrl ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your access link will be shared in the confirmation email once your booking is completed.
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Joining details will be shared with you immediately after you secure your ticket.
              </p>
            )}

            {meetingId && (
              <div className="flex items-start gap-3 rounded-xl border border-gray-200/70 p-4 text-sm dark:border-gray-700/70">
                <FaLink className="mt-1 text-[#f54502]" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Meeting ID</p>
                  <p className="text-gray-600 dark:text-gray-300">{meetingId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
