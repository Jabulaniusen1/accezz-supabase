'use client';
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { 
  FaInstagram, 
  FaFacebookF, 
  FaTwitter, 
  FaImages, 
  FaTrash, 
  FaPlus
} from "react-icons/fa";
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
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previews = formData.gallery.map(file => URL.createObjectURL(file));
    setGalleryPreviews(previews);

    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [formData.gallery]);

  const handleGalleryUpload = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    if (formData.gallery.length + files.length > 5) {
      setToast({ 
        type: "error", 
        message: "Maximum 5 gallery images allowed",
        onClose: () => setToast(null)
      });
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) {
        setToast({ 
          type: "error", 
          message: "Please upload only image files",
          onClose: () => setToast(null)
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setToast({ 
          type: "error", 
          message: `${file.name} is too large (max 5MB)`,
          onClose: () => setToast(null)
        });
        return;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    updateFormData({ gallery: [...formData.gallery, ...newFiles] });
  };

  const removeGalleryImage = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    const updatedGallery = formData.gallery.filter((_, i) => i !== index);
    const updatedPreviews = galleryPreviews.filter((_, i) => i !== index);
    updateFormData({ gallery: updatedGallery });
    setGalleryPreviews(updatedPreviews);
  };

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

      // Now upload main image under user/event scoped path and update event
      if (formData.image && typeof formData.image !== 'string') {
        const main = formData.image as File;
        const ext2 = main.name.split('.').pop();
        const mainPath = `events/${session.user.id}/${created.id}/main.${ext2}`;
        const { error: upErr2 } = await supabase.storage.from('event-images').upload(mainPath, main, { upsert: false });
        if (upErr2) throw upErr2;
        const { data: pub2 } = supabase.storage.from('event-images').getPublicUrl(mainPath);
        imageUrl = pub2.publicUrl;
        const { error: updErr } = await supabase.from('events').update({ image_url: imageUrl }).eq('id', created.id);
        if (updErr) throw updErr;
      } else if (typeof formData.image === 'string') {
        imageUrl = formData.image;
        const { error: updErr } = await supabase.from('events').update({ image_url: imageUrl }).eq('id', created.id);
        if (updErr) throw updErr;
      }

      // Upload gallery and insert records
      if (formData.gallery.length) {
        const galleryRows: { event_id: string; image_url: string; position: number }[] = [];
        for (let i = 0; i < formData.gallery.length; i++) {
          const file = formData.gallery[i];
          const ext = file.name.split('.').pop();
          const path = `events/${session.user.id}/${created.id}/gallery/${Date.now()}-${i}.${ext}`;
          const { error: gErr } = await supabase.storage.from('event-gallery').upload(path, file, { upsert: false });
          if (gErr) throw gErr;
          const { data: pub } = supabase.storage.from('event-gallery').getPublicUrl(path);
          galleryRows.push({ event_id: created.id, image_url: pub.publicUrl, position: i });
        }
        if (galleryRows.length) {
          const { error: insGalErr } = await supabase.from('event_gallery').insert(galleryRows);
          if (insGalErr) throw insGalErr;
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
        if (tErr) throw tErr;
      }

      setToast({ type: "success", message: "Event created successfully!", onClose: () => setToast(null) });
      router.push('/dashboard');
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Final Details
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add the finishing touches to your event
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Gallery Section - Improved */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                Event Gallery
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add up to 5 images ({(formData.gallery.length || 0)}/5 added)
              </p>
            </div>
            {formData.gallery.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                <FaPlus size={12} />
                <span>Add Images</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={(e) => handleGalleryUpload(e.target.files)}
          />

          {galleryPreviews.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {galleryPreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group"
                >
                  <Image
                    src={preview}
                    alt={`Gallery image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <FaImages className="text-gray-400 text-2xl mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No images added yet</p>
            </div>
          )}
        </div>

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
                <FaInstagram className="text-pink-500" />
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
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://instagram.com/yourpage"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaFacebookF className="text-blue-600" />
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
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FaTwitter className="text-blue-400" />
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
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            className="px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white rounded-lg hover:from-[#f54502]/90 hover:to-[#d63a02]/90 transform transition-all duration-200 shadow-lg hover:shadow-xl relative overflow-hidden ${
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