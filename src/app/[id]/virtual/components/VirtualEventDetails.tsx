'use client';

import React, { useEffect, useState } from 'react';
import { FaCalendarAlt, FaClock, FaInfoCircle, FaLink, FaVideo } from '@/icon-adapters/react-icons/fa';
import { type Event } from '@/types/event';
import { formatEventDate, formatEventTime } from '@/utils/formatDateTime';
import { supabase } from '@/utils/supabaseClient';
import { fetchVirtualAccess, type VirtualAccessDetails } from '@/utils/virtualAccess';

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
  // Meeting details are only readable by the organizer and ticket holders (RLS)
  const [access, setAccess] = useState<VirtualAccessDetails | null>(null);

  const eventId = event?.id;
  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetchVirtualAccess(supabase, eventId).then((details) => {
        if (!cancelled) setAccess(details);
      });
    });
    return () => { cancelled = true; };
  }, [eventId]);

  const platformLabel = getVirtualPlatformLabel(event);
  // Organizer-entered: only allow web links (no javascript: etc.)
  const meetingUrl = access?.meetingUrl && /^https?:\/\//i.test(access.meetingUrl) ? access.meetingUrl : undefined;
  const meetingId = access?.meetingId;
  const formattedDate = formatEventDate(event?.date || '');
  const formattedTime = formatEventTime(event?.time || '');

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-brand/15 bg-white/95 p-6 shadow-lg dark:border-brand/30 dark:bg-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-brand">
            <FaInfoCircle className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">How to join</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Virtual access information</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10">
            <FaVideo className="mt-1 text-brand" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Hosted on {platformLabel}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Join from anywhere — we’ll send the access link to your email as soon as your booking is confirmed.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200/60 p-4 dark:border-gray-700/60">
              <FaCalendarAlt className="mt-1 text-brand" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200/60 p-4 dark:border-gray-700/60">
              <FaClock className="mt-1 text-brand" />
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{formattedTime}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {meetingUrl ? (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <FaLink /> Join the event
              </a>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Joining details will be shared with you immediately after you secure your ticket.
              </p>
            )}

            {meetingId && (
              <div className="flex items-start gap-3 rounded-xl border border-gray-200/70 p-4 text-sm dark:border-gray-700/70">
                <FaLink className="mt-1 text-brand" />
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
