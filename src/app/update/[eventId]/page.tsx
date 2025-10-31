"use client";

import { useState, useEffect } from "react";
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

  const toast = (type: "success" | "error", message: string) => {
    setToastProps({ type, message });
    setShowToast(true);
  };

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const { data: ev, error: evErr } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
          if (evErr) throw evErr;

          const { data: types, error: ttErr } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('event_id', eventId);
          if (ttErr) throw ttErr;

          const eventData: Event = {
            id: ev.id,
            slug: ev.slug || ev.id,
            title: ev.title,
            description: ev.description,
            image: ev.image_url,
            date: ev.date,
            time: ev.time || '',
            venue: ev.venue || '',
            location: ev.location || '',
            hostName: '',
            gallery: [],
            isVirtual: !!ev.is_virtual,
            virtualEventDetails: ev.virtual_details || (ev.is_virtual ? {
                platform: undefined,
                requiresPassword: false,
                virtualPassword: ""
            } : undefined),
            socialMediaLinks: ev.social_links || {},
            ticketType: (types || []).map(t => ({
              name: t.name,
              price: String(t.price || '0'),
              quantity: String(t.quantity || '0'),
              sold: String(t.sold || '0'),
              details: t.details || undefined,
            })),
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
  }, [eventId]);

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
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('event-images').getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      // Update event
      const { error: evErr } = await supabase
        .from('events')
        .update({
          title: formData.title,
          description: formData.description,
          date: new Date(formData.date).toISOString(),
          time: formData.time || null,
          venue: formData.venue || null,
          location: formData.location,
          is_virtual: !!formData.isVirtual,
          virtual_details: formData.isVirtual && formData.virtualEventDetails ? formData.virtualEventDetails : null,
          social_links: formData.socialMediaLinks || {},
          image_url: imageUrl || undefined,
        })
        .eq('id', eventId);
      if (evErr) throw evErr;

      // Handle ticket types: delete existing and insert new ones
      const { error: delErr } = await supabase.from('ticket_types').delete().eq('event_id', eventId);
      if (delErr) throw delErr;

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
        if (insErr) throw insErr;
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
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Event Updated Successfully
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          What would you like to do next?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setShouldRedirect(false);
              setShowToast(false);
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
          >
            Continue Editing
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-12 px-4 sm:px-6">
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
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-2xl p-4 sm:p-10 border border-gray-200/50 dark:border-gray-700/50"
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
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                <EventBasicDetails 
                  formData={formData}
                  handleInputChange={(e, field) => {
                    if (!formData) return;
                    setFormData({ ...formData, [field]: e.target.value });
                  }}
                />

                <div className="space-y-10">
                  <VirtualEventSettings
                    formData={formData}
                    setFormData={setFormData}
                  />

                  {!formData?.isVirtual && (
                    <PhysicalEventDetails 
                      formData={formData}
                      handleInputChange={(e, field) => {
                        if (!formData) return;
                        setFormData({ ...formData, [field]: e.target.value });
                      }}
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