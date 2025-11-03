'use client';
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FaInstagram, 
  FaFacebookF
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Event, ToastProps } from '@/types/event';
import { supabase } from '@/utils/supabaseClient';
import {useRouter} from "next/navigation";

interface FinalDetailsProps {
  formData: Event;
  updateFormData: (data: Partial<Event>) => void;
  onBack: () => void;
  setToast: (toast: ToastProps | null) => void;
}

export default function FinalDetails({
  formData,
  updateFormData,
  onBack,
  setToast,
}: FinalDetailsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setToast({ type: "error", message: "Please login to create an event", onClose: () => setToast(null) });
        router.push('/auth/login');
        return;
      }

      if (!formData.image) {
        setToast({ 
          type: "error", 
          message: "Main event image is required",
          onClose: () => setToast(null)
        });
        setIsLoading(false);
        return;
      }
  
      // Upload main image
      let imageUrl: string | null = null;
      if (formData.image && typeof formData.image !== 'string') {
      // Defer main upload until after event is created to scope by user/event id
      // Temporary placeholder; will upload after insert
      imageUrl = null;
      } else if (typeof formData.image === 'string') {
        imageUrl = formData.image;
      }

      // Create event first (without image)
      const { data: created, error: evErr } = await supabase.from('events')
        .insert({
          user_id: session.user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: new Date(formData.date).toISOString(),
          time: formatTime(formData.time),
          venue: formData.venue.trim(),
          location: formData.location.trim(),
          is_virtual: !!formData.isVirtual,
          social_links: {
            twitter: formData.socialMediaLinks?.twitter?.trim() || "",
            facebook: formData.socialMediaLinks?.facebook?.trim() || "",
            instagram: formData.socialMediaLinks?.instagram?.trim() || "",
          },
          virtual_details: formData.isVirtual ? formData.virtualEventDetails : null,
          image_url: null,
        })
        .select('*')
        .single();
      if (evErr) throw evErr;

      const eventCreated = true;

      try {
        // Now upload main image under user/event scoped path and update event
        if (formData.image && typeof formData.image !== 'string') {
          const main = formData.image as File;
          const ext2 = main.name.split('.').pop();
          const mainPath = `events/${session.user.id}/${created.id}/main.${ext2}`;
          const { error: upErr2 } = await supabase.storage.from('event-images').upload(mainPath, main, { upsert: false });
          if (upErr2) {
            console.error('Main image upload failed:', upErr2);
            throw new Error('Failed to upload main image. Please try again.');
          }
          const { data: pub2 } = supabase.storage.from('event-images').getPublicUrl(mainPath);
          imageUrl = pub2.publicUrl;
          const { error: updErr } = await supabase.from('events').update({ image_url: imageUrl }).eq('id', created.id);
          if (updErr) {
            console.error('Failed to update event with main image:', updErr);
            throw new Error('Failed to save main image. Please try again.');
          }
        } else if (typeof formData.image === 'string') {
          imageUrl = formData.image;
          const { error: updErr } = await supabase.from('events').update({ image_url: imageUrl }).eq('id', created.id);
          if (updErr) {
            console.error('Failed to update event with existing image:', updErr);
            throw new Error('Failed to save image. Please try again.');
          }
        }


        // Insert ticket types
        const tickets = formData.ticketType.map((t) => ({
          event_id: created.id,
          name: t.name.trim(),
          price: Number(t.price),
          quantity: Number(t.quantity),
          details: t.details?.trim() || null,
        }));
        if (tickets.length) {
          const { error: tErr } = await supabase.from('ticket_types').insert(tickets);
          if (tErr) {
            console.error('Failed to insert ticket types:', tErr);
            throw new Error('Failed to create tickets. Please try again.');
          }
        }

        setToast({ type: "success", message: "Event created successfully!", onClose: () => setToast(null) });
        router.push('/dashboard');
      } catch (error) {
        // Cleanup: Delete the partially created event
        console.error('Error during event creation, cleaning up:', error);
        if (eventCreated && created?.id) {
          await supabase.from('events').delete().eq('id', created.id);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error creating event:", error);
      const message = error instanceof Error ? error.message : "Failed to create event";
      setToast({ type: "error", message, onClose: () => setToast(null) });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function for time formatting
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Final Details
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Add the finishing touches to your event
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Social Media - Improved */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Social Media Links
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add your social media links to help promote your event
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaInstagram className="text-[#f54502]" />
              </div>
              <input
                type="url"
                value={formData.socialMediaLinks?.instagram || ""}
                onChange={(e) =>
                  updateFormData({
                    socialMediaLinks: {
                      ...formData.socialMediaLinks,
                      instagram: e.target.value,
                    },
                  })
                }
                className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaFacebookF className="text-[#f54502]" />
              </div>
              <input
                type="url"
                value={formData.socialMediaLinks?.facebook || ""}
                onChange={(e) =>
                  updateFormData({
                    socialMediaLinks: {
                      ...formData.socialMediaLinks,
                      facebook: e.target.value,
                    },
                  })
                }
                className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaXTwitter className="text-[#f54502]" />
              </div>
              <input
                type="url"
                value={formData.socialMediaLinks?.twitter || ""}
                onChange={(e) =>
                  updateFormData({
                    socialMediaLinks: {
                      ...formData.socialMediaLinks,
                      twitter: e.target.value,
                    },
                  })
                }
                className="w-full pl-8 sm:pl-10 pr-4 py-2 sm:py-3 rounded-[5px] border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                placeholder="https://twitter.com/yourpage"
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-[5px] border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 text-sm sm:text-base w-full sm:w-auto"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-[5px] hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transform transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden text-sm sm:text-base w-full sm:w-auto ${
              isLoading ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.02]"
            }`}
          >
            <span className="relative z-10">
              {isLoading ? "Creating Event..." : "Create Event"}
            </span>
            {isLoading && (
              <span className="absolute inset-0 bg-gradient-to-r from-[#f54502]/80 to-[#d63a02]/80 opacity-70"></span>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}