// components/EventForm.tsx
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import axios from 'axios';
import { BASE_URL } from '../../../config';
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
  const router = useRouter();
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
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');
        
        const { data } = await axios.get(`${BASE_URL}api/v1/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setFormData(data.event);
        if (data.event.image) {
          setImagePreview(data.event.image as string);
        }
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

    const token = localStorage.getItem('token');
    if (!token) {
      notyf.error('Authentication required');
      router.push('/auth/login');
      return;
    }

    try {
      setIsLoading(true);
      const formPayload = new FormData();

      // Append basic fields
      formPayload.append('title', formData.title || '');
      formPayload.append('description', formData.description || '');
      formPayload.append('date', formData.date || '');
      formPayload.append('location', formData.location || '');
      formPayload.append('isVirtual', String(formData.isVirtual || false));
      
      // Append ticket types
      if (formData.ticketType) {
        formPayload.append('ticketType', JSON.stringify(formData.ticketType));
      }

      // Append image if new one was selected
      if (imageFile) {
        formPayload.append('image', imageFile);
      }

      let response;
      if (eventId) {
        response = await axios.put(`${BASE_URL}api/v1/events/${eventId}`, formPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        response = await axios.post(`${BASE_URL}api/v1/events/create-event`, formPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      notyf.success(`Event ${eventId ? 'updated' : 'created'} successfully`);
      onSuccess?.(response.data.event);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      notyf.error('Failed to save event');
    } finally {
      setIsLoading(false);
    }
  }, [formData, imageFile, eventId, validateForm, notyf, router, onSuccess, onClose]);

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