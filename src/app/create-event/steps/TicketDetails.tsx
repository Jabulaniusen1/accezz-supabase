'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserPlus, FaTrash, FaChevronDown, FaChevronUp, FaPlus, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { MdDescription } from 'react-icons/md';
import { Event, ToastProps } from '@/types/event';

interface TicketDetailsProps {
  formData: Event;
  updateFormData: (data: Partial<Event>) => void;
  onNext: () => void;
  onBack: () => void;
  setToast: (toast: ToastProps | null) => void;
}

export default function TicketDetails({ 
  formData, 
  updateFormData, 
  onNext, 
  onBack, 
  setToast 
}: TicketDetailsProps) {
  const [expandedTicket, setExpandedTicket] = useState<number | null>(0); // Auto-expand first ticket
  const [newFeatureText, setNewFeatureText] = useState('');

  const handleDetailsChange = (ticketIndex: number, details: string) => {
    const updatedTickets = [...formData.ticketType];
    updatedTickets[ticketIndex] = {
      ...updatedTickets[ticketIndex],
      details: details
    };
    updateFormData({ ticketType: updatedTickets });
  };

  const handleAddFeature = (ticketIndex: number) => {
    if (!newFeatureText.trim()) return;
    
    const currentFeatures = formData.ticketType[ticketIndex].details || '';
    const updatedFeatures = currentFeatures 
      ? `${currentFeatures}\n${newFeatureText}`
      : newFeatureText;
    
    handleDetailsChange(ticketIndex, updatedFeatures);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (ticketIndex: number, featureIndex: number) => {
    const features = formData.ticketType[ticketIndex].details?.split('\n') || [];
    const updatedFeatures = features.filter((_, i) => i !== featureIndex).join('\n');
    handleDetailsChange(ticketIndex, updatedFeatures);
  };

  const handleAddAttendee = (ticketIndex: number) => {
    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];
    const currentAttendees = ticket.attendees || [];
    
    const maxAttendees = parseInt(ticket.quantity);
    if (currentAttendees.length >= maxAttendees) {
      setToast({ 
        type: 'error', 
        message: `Maximum ${maxAttendees} attendees allowed for this ticket`,
        onClose: () => setToast(null)
      });
      return;
    }

    updatedTickets[ticketIndex] = {
      ...ticket,
      attendees: [...currentAttendees, { name: '', email: '' }]
    };
    updateFormData({ ticketType: updatedTickets });
  };

  const handleRemoveAttendee = (ticketIndex: number, attendeeIndex: number) => {
    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];
    const filteredAttendees = ticket.attendees?.filter((_, i) => i !== attendeeIndex) || [];
    
    updatedTickets[ticketIndex] = {
      ...ticket,
      attendees: filteredAttendees
    };
    updateFormData({ ticketType: updatedTickets });
  };

  const handleAttendeeChange = (
    ticketIndex: number,
    attendeeIndex: number,
    field: 'name' | 'email',
    value: string
  ) => {
    const updatedTickets = [...formData.ticketType];
    const ticket = updatedTickets[ticketIndex];
    const updatedAttendees = [...(ticket.attendees || [])];
    
    updatedAttendees[attendeeIndex] = {
      ...updatedAttendees[attendeeIndex],
      [field]: value
    };
  
    updatedTickets[ticketIndex] = {
      ...ticket,
      attendees: updatedAttendees
    };
    updateFormData({ ticketType: updatedTickets });
  };

  const validateDetails = () => {
    for (const ticket of formData.ticketType) {
      if (ticket.attendees?.some(attendee => {
        if (!attendee.name || !attendee.email) {
          setToast({ 
            type: 'error', 
            message: 'Please complete all attendee information',
            onClose: () => setToast(null)
          });
          return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(attendee.email)) {
          setToast({ 
            type: 'error', 
            message: 'Please enter valid email addresses',
            onClose: () => setToast(null)
          });
          return true;
        }
        return false;
      })) {
        return false;
      }
    }
    return true;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center mb-6 sm:mb-8">
        <motion.h2 
          className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <MdDescription className="mr-2 sm:mr-3 text-[#f54502]" size={20} />
          <span className="bg-gradient-to-r from-[#f54502] to-[#d63a02] bg-clip-text text-transparent">
            Enhance Your Tickets
          </span>
        </motion.h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Add special features and pre-register attendees for each ticket type
        </p>
      </div>

      <div className="space-y-6">
        {formData.ticketType.map((ticket, ticketIndex) => (
          <motion.div
            key={ticketIndex}
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white dark:bg-gray-800 rounded-[5px] p-4 sm:p-6 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300"
            whileHover={{ y: -3 }}
          >
            <div className="absolute -top-3 -left-3 bg-[#f54502] text-white px-2 sm:px-3 py-1 rounded-[5px] text-xs font-bold shadow-md">
              {ticket.name || `Ticket ${ticketIndex + 1}`}
            </div>
            
            <button
              onClick={() => setExpandedTicket(expandedTicket === ticketIndex ? null : ticketIndex)}
              className={`w-full flex items-center justify-between text-left ${expandedTicket === ticketIndex ? 'pb-4' : ''}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[5px] flex items-center justify-center text-xs sm:text-sm ${expandedTicket === ticketIndex ? 'bg-[#f54502]/10 dark:bg-[#f54502]/20 text-[#f54502] dark:text-[#f54502]' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {ticketIndex + 1}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {ticket.name || `Ticket Type ${ticketIndex + 1}`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ticket.details?.split('\n').filter(Boolean).length || 0} features • {ticket.attendees?.length || 0} attendees
                  </p>
                </div>
              </div>
              {expandedTicket === ticketIndex ? (
                <FaChevronUp className="text-gray-500 dark:text-gray-400" />
              ) : (
                <FaChevronDown className="text-gray-500 dark:text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {expandedTicket === ticketIndex && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-6">
                    {/* Features Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">
                          Ticket Features
                        </h3>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {(ticket.details?.split('\n').filter(Boolean) || []).map((feature, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-start space-x-3 group"
                          >
                            <div className="flex-1 flex items-center space-x-2">
                              <span className="text-[#f54502] mt-1.5">•</span>
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const features = ticket.details?.split('\n') || [];
                                  features[index] = e.target.value;
                                  handleDetailsChange(ticketIndex, features.join('\n'));
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Feature description"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(ticketIndex, index)}
                              className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FaTrash size={14} />
                            </button>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newFeatureText}
                          onChange={(e) => setNewFeatureText(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-[5px] border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                          placeholder="Add a new feature..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddFeature(ticketIndex)}
                        />
                        <button
                          onClick={() => handleAddFeature(ticketIndex)}
                          disabled={!newFeatureText.trim()}
                          className={`px-3 sm:px-4 py-2 rounded-[5px] flex items-center text-sm sm:text-base ${newFeatureText.trim() 
                            ? 'bg-[#f54502] text-white hover:bg-[#d63a02]' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                        >
                          <FaPlus />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Examples: VIP access, Free drinks, Backstage pass, Early entry
                      </p>
                    </div>

                    {/* Attendees Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-white">
                            Pre-registered Attendees
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {ticket.attendees?.length || 0} of {ticket.quantity} spots filled
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddAttendee(ticketIndex)}
                          disabled={(ticket.attendees?.length || 0) >= parseInt(ticket.quantity)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-[5px] text-xs sm:text-sm ${(ticket.attendees?.length || 0) >= parseInt(ticket.quantity) 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-[#f54502] text-white hover:bg-[#d63a02]'}`}
                        >
                          <FaUserPlus size={12} />
                          <span>Add Attendee</span>
                        </button>
                      </div>

                      {ticket.attendees?.length ? (
                        <div className="space-y-4">
                          {ticket.attendees.map((attendee, attendeeIndex) => (
                            <motion.div
                              key={attendeeIndex}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center group"
                            >
                              <div className="md:col-span-5">
                                <input
                                  type="text"
                                  value={attendee.name}
                                  onChange={(e) => handleAttendeeChange(ticketIndex, attendeeIndex, 'name', e.target.value)}
                                  className="w-full px-3 py-2 rounded-[5px] border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                                  placeholder="Full Name"
                                  required
                                />
                              </div>
                              <div className="md:col-span-5">
                                <input
                                  type="email"
                                  value={attendee.email}
                                  onChange={(e) => handleAttendeeChange(ticketIndex, attendeeIndex, 'email', e.target.value)}
                                  className="w-full px-3 py-2 rounded-[5px] border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-[#f54502] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                                  placeholder="Email Address"
                                  required
                                />
                              </div>
                              <div className="md:col-span-2 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttendee(ticketIndex, attendeeIndex)}
                                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <FaTrash size={14} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                          <p className="text-gray-500 dark:text-gray-400">
                            No attendees added yet. Add guests who will use this ticket.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-10">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBack}
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                     rounded-[5px] border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600
                     transition-all duration-200 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
          >
            <FaArrowLeft className="mr-2" />
            Back to Ticket Setup
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 5px 20px rgba(245, 69, 2, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => validateDetails() && onNext()}
            className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 bg-gradient-to-r from-[#f54502] to-[#d63a02] text-white
                     rounded-[5px] hover:from-[#f54502]/90 hover:to-[#d63a02]/90
                     transition-all duration-300 shadow-lg hover:shadow-xl
                     flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
          >
            Continue to Final Details
            <FaArrowRight className="ml-2" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}