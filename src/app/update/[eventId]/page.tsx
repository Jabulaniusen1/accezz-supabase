"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { Event } from "../../../types/event";
import Toast from "../../../components/ui/Toast";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EventImageUpload from "./components/EventImageUpload";
import EventBasicDetails from "./components/EventBasicDetails";
import VirtualEventSettings from "./components/VirtualEventSettings";
import PhysicalEventDetails from "./components/PhysicalEventDetails";
import SocialMediaLinks from "./components/SocialMediaLinks";
import TicketTypesSection from "./components/TicketTypeSection";
import { BsArrowLeft } from "react-icons/bs";
import { AnimatePresence, motion } from "framer-motion";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-visible">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Update() {
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<Event | null>(null);
  const { eventId } = useParams<{ eventId: string }>();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{ type: "success" | "error"; message: string }>({ type: "success", message: "" });
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Affiliate settings
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionValue, setCommissionValue] = useState(10);

  const toast = useCallback((type: "success" | "error", message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  }, []);

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const { data: ev, error: evErr } = await supabase
            .from('events')
            .select('*, category:event_categories(id, name)')
            .eq('id', eventId)
            .single();
          if (evErr) throw evErr;

          const { data: hostProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', ev.user_id)
            .maybeSingle();

          const { data: types, error: ttErr } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('event_id', eventId);
          if (ttErr) throw ttErr;

          const startTimeIso: string | null = ev.start_time;
          const startDateObj = startTimeIso ? new Date(startTimeIso) : null;
          const formattedDate = startDateObj && !Number.isNaN(startDateObj.getTime())
            ? startDateObj.toISOString().split('T')[0] : '';
          const formattedTime = startDateObj && !Number.isNaN(startDateObj.getTime())
            ? startDateObj.toISOString().slice(11, 16) : '';
          const endTimeIso: string | null = ev.end_time;

          const eventData: Event = {
            id: ev.id, slug: ev.slug || ev.id, title: ev.title,
            description: ev.description, image: ev.image_url,
            startTime: startTimeIso || '', endTime: endTimeIso || null,
            date: formattedDate, time: formattedTime,
            venue: ev.venue || '', location: ev.location || '',
            address: ev.address || '', city: ev.city || '', country: ev.country || '',
            latitude: typeof ev.latitude === 'number' ? ev.latitude : null,
            longitude: typeof ev.longitude === 'number' ? ev.longitude : null,
            categoryId: ev.category_id ?? undefined,
            categoryName: ev.category?.name ?? undefined,
            categoryCustom: ev.category_custom ?? '',
            locationId: ev.location_id ?? undefined,
            locationVisibility: ev.location_visibility ?? 'public',
            hostName: hostProfile?.full_name || '',
            gallery: [], isVirtual: !!ev.is_virtual,
            virtualEventDetails: ev.virtual_details || (ev.is_virtual ? { platform: undefined, meetingUrl: '', meetingId: '' } : undefined),
            socialMediaLinks: ev.social_links || {},
            ticketType: (types || []).map(t => ({
              id: t.id, name: t.name, price: String(t.price || '0'),
              quantity: String(t.quantity || '0'), sold: String(t.sold || '0'),
              details: t.details || undefined,
            })),
            currency: ev.currency || undefined, userId: ev.user_id,
            createdAt: ev.created_at, updatedAt: ev.updated_at,
          };

          setEvent(eventData);
          setFormData(eventData);
          if (ev.image_url) setImagePreview(ev.image_url);

          // Load existing affiliate settings
          const { data: affSettings } = await supabase
            .from('affiliate_settings')
            .select('enabled, commission_type, commission_value')
            .eq('event_id', eventId)
            .maybeSingle();
          if (affSettings) {
            setAffiliateEnabled(!!affSettings.enabled);
            setCommissionType(affSettings.commission_type || 'percentage');
            setCommissionValue(Number(affSettings.commission_value) || 10);
          }
        } catch (error) {
          console.error("Error fetching event:", error);
          toast("error", "Failed to load event data");
        }
      };
      fetchEvent();
    }
  }, [eventId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!formData) { toast("error", "No event data to update."); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast("error", "Please login to update event."); router.push('/auth/login'); return; }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `events/${session.user.id}/${eventId}/main.${ext}`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(path, imageFile, { upsert: true });
        if (upErr) throw new Error('Failed to upload image. Please try again.');
        const { data: pub } = supabase.storage.from('event-images').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const startTimeIso = formData.startTime || (formData.date ? new Date(`${formData.date}T${formData.time || '00:00'}`).toISOString() : '');
      if (!startTimeIso) throw new Error('Please set the event start date and time.');

      const visibility = formData.locationVisibility ?? 'public';
      const rawLocation = formData.location?.trim() || '';
      const locationValue = visibility === 'undisclosed' ? null : (rawLocation || (formData.isVirtual ? 'Online' : ''));

      if (!formData.isVirtual && visibility !== 'undisclosed' && !rawLocation)
        throw new Error('Please provide the event location before saving.');
      if (formData.isVirtual && visibility === 'undisclosed')
        throw new Error('Virtual events require access details instead of an undisclosed location.');

      const categoryCustomValue = formData.categoryId ? null : (formData.categoryCustom?.trim() || null);
      const venueValue = formData.isVirtual ? 'Virtual Event' : (formData.venue?.trim() || null);
      const finalVenue = visibility === 'undisclosed' ? null : venueValue;
      const addressValue = visibility === 'undisclosed' ? null : formData.address?.trim() || null;
      const cityValue = visibility === 'undisclosed' ? null : formData.city?.trim() || null;
      const countryValue = visibility === 'undisclosed' ? null : formData.country?.trim() || null;
      const latitudeValue = visibility === 'undisclosed' ? null : formData.latitude ?? null;
      const longitudeValue = visibility === 'undisclosed' ? null : formData.longitude ?? null;
      const locationIdValue = visibility === 'undisclosed' ? null : formData.locationId ?? null;

      const { error: evErr } = await supabase.from('events').update({
        title: formData.title, description: formData.description,
        start_time: startTimeIso, end_time: formData.endTime || null,
        venue: finalVenue, location: locationValue, location_visibility: visibility,
        address: addressValue, city: cityValue, country: countryValue,
        latitude: latitudeValue, longitude: longitudeValue, location_id: locationIdValue,
        category_id: formData.categoryId ?? null, category_custom: categoryCustomValue,
        is_virtual: !!formData.isVirtual,
        virtual_details: formData.isVirtual && formData.virtualEventDetails ? formData.virtualEventDetails : null,
        social_links: formData.socialMediaLinks || {},
        image_url: imageUrl || undefined,
      }).eq('id', eventId);
      if (evErr) throw new Error('Failed to update event. Please try again.');

      if (formData.ticketType?.length) {
        const { data: existingTypes } = await supabase.from('ticket_types').select('id, name, sold').eq('event_id', eventId);
        const existingMap = new Map((existingTypes || []).map(t => [t.name, { id: t.id, sold: Number(t.sold || 0) }]));
        const newTicketNames = new Set(formData.ticketType.map(t => t.name));
        const typesToDelete = (existingTypes || []).filter(t => !newTicketNames.has(t.name));
        if (typesToDelete.length > 0)
          await supabase.from('ticket_types').delete().in('id', typesToDelete.map(t => t.id)).eq('sold', 0);

        for (const ticket of formData.ticketType) {
          const existing = existingMap.get(ticket.name);
          const ticketData = { event_id: eventId, name: ticket.name, price: Number(ticket.price || 0), quantity: Number(ticket.quantity || 0), sold: existing ? existing.sold : Number(ticket.sold || 0), details: ticket.details || null };
          if (existing) await supabase.from('ticket_types').update(ticketData).eq('id', existing.id);
          else await supabase.from('ticket_types').insert(ticketData);
        }
      } else {
        await supabase.from('ticket_types').delete().eq('event_id', eventId).eq('sold', 0);
      }

      // Save affiliate settings
      await supabase.from('affiliate_settings').upsert({
        event_id: eventId,
        enabled: affiliateEnabled,
        commission_type: commissionType,
        commission_value: commissionValue,
      }, { onConflict: 'event_id' });

      toast("success", "Event updated successfully!");
      setShouldRedirect(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update event";
      toast("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
          <Toast type={toastProps.type} message={toastProps.message} onClose={() => setShowToast(false)} />
        </div>
      )}

      {/* Success dialog */}
      <AnimatePresence>
        {shouldRedirect && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-1">Event Updated</h3>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">Your changes have been saved successfully.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShouldRedirect(false); setShowToast(false); }}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 py-2.5 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-medium transition"
                >
                  Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky top header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <BsArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              Edit Event{event?.title ? ` — ${event.title}` : ''}
            </h1>
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
        {!event ? (
          <PageSkeleton />
        ) : (
          <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Cover image */}
            <SectionCard title="Cover Image">
              <EventImageUpload
                imagePreview={imagePreview || (typeof event?.image === "string" ? event.image : undefined)}
                handleImageChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith("image/")) { toast("error", "Please upload a valid image file"); return; }
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </SectionCard>

            {/* Basic details */}
            <SectionCard title="Event Details">
              <EventBasicDetails formData={formData} setFormData={setFormData} notify={toast} />
            </SectionCard>

            {/* Location / virtual */}
            <SectionCard title={formData?.isVirtual ? "Virtual Event Settings" : "Location"}>
              <VirtualEventSettings formData={formData} setFormData={setFormData} />
              {!formData?.isVirtual && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <PhysicalEventDetails formData={formData} setFormData={setFormData} notify={toast} />
                </div>
              )}
            </SectionCard>

            {/* Social links */}
            <SectionCard title="Social Links">
              <SocialMediaLinks formData={formData} setFormData={setFormData} />
            </SectionCard>

            {/* Tickets */}
            <SectionCard title="Ticket Types">
              <TicketTypesSection formData={formData} setFormData={setFormData} />
            </SectionCard>

            {/* Affiliate Program */}
            <SectionCard title="Affiliate Program">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Allow affiliates</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Let others earn commissions by promoting this event
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAffiliateEnabled(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 transition-colors ${
                      affiliateEnabled ? 'bg-[#f54502]' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      affiliateEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {affiliateEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Commission type
                      </label>
                      <select
                        value={commissionType}
                        onChange={e => setCommissionType(e.target.value as 'percentage' | 'fixed')}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Commission {commissionType === 'percentage' ? 'rate (%)' : 'amount'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={commissionType === 'percentage' ? 100 : undefined}
                        value={commissionValue}
                        onChange={e => setCommissionValue(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#f54502] focus:border-transparent"
                        placeholder={commissionType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </form>
        )}
      </div>

      {/* Sticky save bar */}
      {event && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              Changes are only saved when you click Save.
            </p>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-event-form"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-lg bg-[#f54502] hover:bg-[#d63a02] text-white text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Update;
