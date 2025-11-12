"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/utils/supabaseClient";
import { Event } from "../../../types/event";
import Toast from "../../../components/ui/Toast";
import Loader from "@/components/ui/loader/Loader";
import EventHeader from "./components/EventHeader";
import EventImageUpload from "./components/EventImageUpload";
import EventBasicDetails from "./components/EventBasicDetails";
import VirtualEventSettings from "./components/VirtualEventSettings";
import PhysicalEventDetails from "./components/PhysicalEventDetails";
import SocialMediaLinks from "./components/SocialMediaLinks";
import TicketTypesSection from "./components/TicketTypeSection";
import FormActions from "./components/FormActions";

function Update() {
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<Event | null>(null);
  const { eventId } = useParams<{ eventId: string }>();
  const [showToast, setShowToast] = useState(false);
  const [toastProps, setToastProps] = useState<{
    type: "success" | "error";
    message: string;
  }>({
    type: "success",
    message: "",
  });
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

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
            ? startDateObj.toISOString().split('T')[0]
            : '';
          const formattedTime = startDateObj && !Number.isNaN(startDateObj.getTime())
            ? startDateObj.toISOString().slice(11, 16)
            : '';
          const endTimeIso: string | null = ev.end_time;

          const eventData: Event = {
            id: ev.id,
            slug: ev.slug || ev.id,
            title: ev.title,
            description: ev.description,
            image: ev.image_url,
            startTime: startTimeIso || '',
            endTime: endTimeIso || null,
            date: formattedDate,
            time: formattedTime,
            venue: ev.venue || '',
            location: ev.location || '',
            address: ev.address || '',
            city: ev.city || '',
            country: ev.country || '',
            latitude: typeof ev.latitude === 'number' ? ev.latitude : null,
            longitude: typeof ev.longitude === 'number' ? ev.longitude : null,
            categoryId: ev.category_id ?? undefined,
            categoryName: ev.category?.name ?? undefined,
            categoryCustom: ev.category_custom ?? '',
            locationId: ev.location_id ?? undefined,
            locationVisibility: ev.location_visibility ?? 'public',
            hostName: hostProfile?.full_name || '',
            gallery: [],
            isVirtual: !!ev.is_virtual,
            virtualEventDetails: ev.virtual_details || (ev.is_virtual ? {
                platform: undefined,
                meetingUrl: '',
                meetingId: ''
            } : undefined),
            socialMediaLinks: ev.social_links || {},
            ticketType: (types || []).map(t => ({
              name: t.name,
              price: String(t.price || '0'),
              quantity: String(t.quantity || '0'),
              sold: String(t.sold || '0'),
              details: t.details || undefined,
            })),
            currency: ev.currency || undefined,
            userId: ev.user_id,
            createdAt: ev.created_at,
            updatedAt: ev.updated_at,
          };

          setEvent(eventData);
          setFormData(eventData);
          if (ev.image_url) setImagePreview(ev.image_url);
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

    if (!formData) {
      toast("error", "No event data to update.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast("error", "Please login to update event.");
        router.push('/auth/login');
        return;
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `events/${session.user.id}/${eventId}/main.${ext}`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(path, imageFile, { upsert: true });
        if (upErr) {
          console.error('Image upload failed:', upErr);
          throw new Error('Failed to upload image. Please try again.');
        }
        const { data: pub } = supabase.storage.from('event-images').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const startTimeIso =
        formData.startTime ||
        (formData.date ? new Date(`${formData.date}T${formData.time || '00:00'}`).toISOString() : '');

      if (!startTimeIso) {
        throw new Error('Please set the event start date and time.');
      }

      const visibility = formData.locationVisibility ?? 'public';
      const rawLocation = formData.location?.trim() || '';
      const locationValue =
        visibility === 'undisclosed'
          ? null
          : (rawLocation || (formData.isVirtual ? 'Online' : ''));

      if (!formData.isVirtual && visibility !== 'undisclosed' && !rawLocation) {
        throw new Error('Please provide the event location before saving.');
      }

      if (formData.isVirtual && visibility === 'undisclosed') {
        throw new Error('Virtual events require access details instead of an undisclosed location.');
      }

      const categoryCustomValue = formData.categoryId
        ? null
        : (formData.categoryCustom?.trim() || null);
      const venueValue = formData.isVirtual ? 'Virtual Event' : (formData.venue?.trim() || null);
      const finalVenue = visibility === 'undisclosed' ? null : venueValue;
      const addressValue = visibility === 'undisclosed' ? null : formData.address?.trim() || null;
      const cityValue = visibility === 'undisclosed' ? null : formData.city?.trim() || null;
      const countryValue = visibility === 'undisclosed' ? null : formData.country?.trim() || null;
      const latitudeValue = visibility === 'undisclosed' ? null : formData.latitude ?? null;
      const longitudeValue = visibility === 'undisclosed' ? null : formData.longitude ?? null;
      const locationIdValue = visibility === 'undisclosed' ? null : formData.locationId ?? null;

      // Update event
      const { error: evErr } = await supabase
        .from('events')
        .update({
          title: formData.title,
          description: formData.description,
          start_time: startTimeIso,
          end_time: formData.endTime || null,
          venue: finalVenue,
          location: locationValue,
          location_visibility: visibility,
          address: addressValue,
          city: cityValue,
          country: countryValue,
          latitude: latitudeValue,
          longitude: longitudeValue,
          location_id: locationIdValue,
          category_id: formData.categoryId ?? null,
          category_custom: categoryCustomValue,
          is_virtual: !!formData.isVirtual,
          virtual_details: formData.isVirtual && formData.virtualEventDetails ? formData.virtualEventDetails : null,
          social_links: formData.socialMediaLinks || {},
          image_url: imageUrl || undefined,
        })
        .eq('id', eventId);
      if (evErr) {
        console.error('Failed to update event:', evErr);
        throw new Error('Failed to update event. Please try again.');
      }

      // Handle ticket types: delete existing and insert new ones
      const { error: delErr } = await supabase.from('ticket_types').delete().eq('event_id', eventId);
      if (delErr) {
        console.error('Failed to delete existing tickets:', delErr);
        throw new Error('Failed to update tickets. Please try again.');
      }

      if (formData.ticketType?.length) {
        const ticketRows = formData.ticketType.map(t => ({
          event_id: eventId,
          name: t.name,
          price: Number(t.price || 0),
          quantity: Number(t.quantity || 0),
          sold: Number(t.sold || 0),
          details: t.details || null,
        }));
        const { error: insErr } = await supabase.from('ticket_types').insert(ticketRows);
        if (insErr) {
          console.error('Failed to insert new tickets:', insErr);
          throw new Error('Failed to save tickets. Please try again.');
        }
      }

      toast("success", "Event updated successfully!");
      setShouldRedirect(true);
    } catch (error: unknown) {
      console.error("Error updating event:", error);
      const message = error instanceof Error ? error.message : "Failed to update event";
      toast("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const ConfirmationDialog = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-[5px] p-4 sm:p-6 max-w-md w-full shadow-xl"
      >
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">
          Event Updated Successfully
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
          What would you like to do next?
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={() => {
              setShouldRedirect(false);
              setShowToast(false);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-[5px] transition-colors text-sm sm:text-base"
          >
            Continue Editing
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-[#f54502] hover:bg-[#d63a02] text-white rounded-[5px] transition-colors text-sm sm:text-base"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-6 sm:py-12 px-4 sm:px-6">
      <AnimatePresence>
        {showToast && (
          <Toast
            type={toastProps.type}
            message={toastProps.message}
            onClose={() => setShowToast(false)}
          />
        )}
        {shouldRedirect && <ConfirmationDialog />}
      </AnimatePresence>

      <motion.div
        className="w-full sm:max-w-7xl sm:mx-auto mx-full space-y-10 "
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <EventHeader onBack={() => router.push("/dashboard")} />

        

        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-[5px] shadow-2xl p-4 sm:p-6 md:p-10 border border-gray-200/50 dark:border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <EventImageUpload 
          imagePreview={imagePreview || (typeof event?.image === "string" ? event.image : undefined)}
          handleImageChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (!file.type.startsWith("image/")) {
                toast("error", "Please upload a valid image file");
                return;
              }
              if (imagePreview) URL.revokeObjectURL(imagePreview);
              setImageFile(file);
              setImagePreview(URL.createObjectURL(file));
            }
          }}
        />
          {event ? (
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 md:space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                <EventBasicDetails
                  formData={formData}
                  setFormData={setFormData}
                  notify={toast}
                />

                <div className="space-y-6 sm:space-y-8 md:space-y-10">
                  <VirtualEventSettings
                    formData={formData}
                    setFormData={setFormData}
                  />

                  {!formData?.isVirtual && (
                    <PhysicalEventDetails 
                      formData={formData}
                      setFormData={setFormData}
                      notify={toast}
                    />
                  )}
                </div>
              </div>

              <SocialMediaLinks 
                formData={formData}
                setFormData={setFormData}
              />

              <TicketTypesSection
                formData={formData}
                setFormData={setFormData}
              />

              <FormActions 
                isLoading={isLoading}
                onCancel={() => router.push("/dashboard")}
              />
            </form>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Update;