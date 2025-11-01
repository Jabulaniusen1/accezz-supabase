// components/EventForm.tsx
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';
import { Event, Ticket } from '@/types/event';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

interface EventFormProps {
  eventId?: string;
  onClose: () => void;
  onSuccess?: (event: Event) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function EventForm({ eventId, onClose, onSuccess }: EventFormProps) {
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    description: '',
    date: '',
    location: '',
    ticketType: [{ name: '', price: '', quantity: '', sold: '0' }],
    isVirtual: false
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const notyf = useMemo(() => new Notyf({ duration: 3000 }), []);

  // Load event data if editing
  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        if (error) throw error;
        setFormData({
          id: data.id,
          title: data.title,
          description: data.description,
          date: data.date,
          location: data.location,
          isVirtual: data.is_virtual,
        });
        if (data.image_url) setImagePreview(data.image_url as string);
      } catch (error) {
        notyf.error('Failed to load event data');
        console.error('Error loading event:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [eventId, notyf]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notyf.error('Please upload a valid image file');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notyf.error('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, [notyf]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleTicketChange = useCallback((index: number, field: keyof Ticket, value: string) => {
    setFormData(prev => {
      const updatedTickets = [...(prev.ticketType || [])];
      updatedTickets[index] = { ...updatedTickets[index], [field]: value };
      return { ...prev, ticketType: updatedTickets };
    });
  }, []);

  const addTicketType = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      ticketType: [...(prev.ticketType || []), { name: '', price: '', quantity: '', sold: '0' }]
    }));
  }, []);

  const removeTicketType = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      ticketType: (prev.ticketType || []).filter((_, i) => i !== index)
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.title?.trim()) {
      notyf.error('Event title is required');
      return false;
    }
    if (!formData.description?.trim()) {
      notyf.error('Description is required');
      return false;
    }
    if (!formData.date) {
      notyf.error('Date is required');
      return false;
    }
    if (new Date(formData.date) < new Date()) {
      notyf.error('Event date must be in the future');
      return false;
    }
    if (!formData.location?.trim()) {
      notyf.error('Location is required');
      return false;
    }
    if (!formData.ticketType?.some(t => t.name && t.price && t.quantity)) {
      notyf.error('At least one valid ticket type is required');
      return false;
    }
    return true;
  }, [formData, notyf]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      let imageUrl: string | undefined;

      if (eventId) {
        // For updates, upload image first if provided
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const filePath = `events/${eventId}/main.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, imageFile, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: pub } = supabase.storage.from('event-images').getPublicUrl(filePath);
          imageUrl = pub.publicUrl;
        }
        
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description,
            date: formData.date,
            location: formData.location,
            is_virtual: !!formData.isVirtual,
            image_url: imageUrl ?? undefined,
          })
          .eq('id', eventId);
        if (error) throw error;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        
        // Pre-validate: Prepare all data before any database operations
        const tickets = (formData.ticketType || []).filter(t => t.name && t.price && t.quantity);
        const ticketRows = tickets.map(t => ({
          name: t.name,
          price: Number(t.price),
          quantity: Number(t.quantity),
          details: t.details || null,
        }));
        
        // Create event first (without image)
        const { data: ins, error } = await supabase
          .from('events')
          .insert({
            user_id: session.user.id,
            title: formData.title,
            description: formData.description,
            date: formData.date,
            location: formData.location,
            is_virtual: !!formData.isVirtual,
            image_url: null,
          })
          .select('*')
          .single();
        if (error) throw error;

        const eventCreated = true;
        
        try {
          // Upload image if provided (after we have event ID)
          if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const filePath = `events/${session.user.id}/${ins.id}/main.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, imageFile, { upsert: false });
            if (uploadError) {
              console.error('Image upload failed:', uploadError);
              throw new Error('Failed to upload image. Please try again.');
            }
            const { data: pub } = supabase.storage.from('event-images').getPublicUrl(filePath);
            imageUrl = pub.publicUrl;
            
            // Update event with image URL
            const { error: updErr } = await supabase.from('events').update({ image_url: imageUrl }).eq('id', ins.id);
            if (updErr) {
              console.error('Failed to update event with image URL:', updErr);
              throw new Error('Failed to save image. Please try again.');
            }
          }

          // Insert ticket types
          if (ticketRows.length) {
            const finalRows = ticketRows.map(t => ({
              event_id: ins.id,
              ...t,
            }));
            const { error: tErr } = await supabase.from('ticket_types').insert(finalRows);
            if (tErr) {
              console.error('Failed to insert ticket types:', tErr);
              throw new Error('Failed to create ticket types. Please try again.');
            }
          }
        } catch (error) {
          // Cleanup: Delete the partially created event
          console.error('Error during event creation, cleaning up:', error);
          if (eventCreated && ins?.id) {
            await supabase.from('events').delete().eq('id', ins.id);
          }
          throw error;
        }
      }

      notyf.success(`Event ${eventId ? 'updated' : 'created'} successfully`);
      onSuccess?.({
        id: eventId || '',
        title: formData.title || '',
        description: formData.description || '',
        date: formData.date || '',
        location: formData.location || '',
        ticketType: formData.ticketType || [],
        image: imageUrl || null,
        gallery: [],
        hostName: '',
        time: '',
        venue: '',
        isVirtual: !!formData.isVirtual,
      });
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      const message = error instanceof Error ? error.message : 'Failed to save event';
      notyf.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [formData, imageFile, eventId, validateForm, notyf, onSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {eventId ? 'Edit Event' : 'Create Event'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label>Event Title*</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label>Date*</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>

            <div>
              <label>Description*</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label>Location*</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label>Event Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border rounded"
              />
              {imagePreview && (
                <div className="mt-2 relative w-40 h-40">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded"
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Ticket Types*</h3>
              {formData.ticketType?.map((ticket, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={ticket.name}
                    onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                    className="p-2 border rounded"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Price"
                    value={ticket.price}
                    onChange={(e) => handleTicketChange(index, 'price', e.target.value)}
                    className="p-2 border rounded"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={ticket.quantity}
                    onChange={(e) => handleTicketChange(index, 'quantity', e.target.value)}
                    className="p-2 border rounded"
                    min="1"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTicketType}
                className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              >
                + Add Ticket Type
              </button>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : eventId ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}