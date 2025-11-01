import React, { useEffect, useState } from 'react';
import Receipt from './Receipt';
import TicketSelectionStep from './TicketFormSec/TicketSelectionStep';
import OrderInformationStep from './TicketFormSec/OrderInformationStep';
import PaymentStep from './TicketFormSec/PaymentStep';
import { fetchEventBySlug } from '@/utils/eventUtils';
import { createOrder, createFreeTickets } from '@/utils/paymentUtils';

interface Ticket {
  id: string;
  name: string;
  price: string;
  quantity: string;
  sold: string;
  details?: string; // Made optional
  attendees?: { name: string; email: string }[];
}

type TicketTypeFormProps = {
  closeForm: () => void;
  tickets: {
    id: string;
    name: string;
    price: string;
    quantity: string;
    sold: string;
    details?: string;
  }[];
  eventSlug: string;
  setToast: (toast: { type: 'success' | 'error'; message: string } | null) => void;
};

interface Event { id: string; slug: string; }

const TicketTypeForm = ({ closeForm, tickets, eventSlug, setToast }: TicketTypeFormProps) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [events, setEvent] = useState<Event | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [additionalTicketHolders, setAdditionalTicketHolders] = useState<Array<{
    name: string;
    email: string;
  }>>([]);

  const eventId = events?.id;

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventSlug || typeof eventSlug !== 'string') {
        console.error('Invalid eventSlug:', eventSlug);
        return;
      }

      try {
        console.log('Fetching event for slug:', eventSlug);
        const fetchedEvent = await fetchEventBySlug(eventSlug);
        if (fetchedEvent) {
          console.log('Event fetched successfully:', fetchedEvent.id);
          setEvent({ id: fetchedEvent.id || '', slug: fetchedEvent.slug || '' });
        } else {
          console.error('No event found for slug:', eventSlug);
          setToast({ type: 'error', message: 'Event not found' });
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setToast({ type: 'error', message: 'Failed to load event details' });
      } 
    };

    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug]);

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!selectedTicket) {
        setToast({ type: 'error', message: 'Please select a ticket' });
        return;
      }
      setTotalPrice(quantity * Number(selectedTicket.price.replace(/[^\d.-]/g, '')));
      setActiveStep(1);

    } else if (activeStep === 1) {
      if (!fullName || !phoneNumber || !email) {
        setToast({ type: 'error', message: 'All fields are required.' });
        return;
      }

      const allAttendees = [
        { name: fullName, email: email }
      ];

      if (additionalTicketHolders.length > 0) {
        allAttendees.push(...additionalTicketHolders.map(holder => ({
          name: holder.name,
          email: holder.email
        })));
      }

      if (!eventId || !selectedTicket) {
        setToast({ type: 'error', message: 'Missing event or ticket information' });
        return;
      }

      // Handle free tickets
      if (Number(selectedTicket.price.replace(/[^\d.-]/g, '')) === 0) {
        setActiveStep(2);
        return;
      }

      // Create order for paid tickets
      try {
        setIsLoading(true);
        console.log('Creating order with params:', {
          eventId,
          ticketTypeName: selectedTicket.name,
          quantity: allAttendees.length,
          email,
          phone: phoneNumber,
          fullName
        });
        
        const { orderId: createdOrderId } = await createOrder({
          eventId: eventId,
          ticketTypeName: selectedTicket.name,
          quantity: allAttendees.length,
          email: email,
          phone: phoneNumber,
          fullName: fullName,
          attendees: additionalTicketHolders.length > 0 ? additionalTicketHolders : null,
          currency: 'NGN',
        });

        console.log('Order created successfully:', createdOrderId);
        setOrderId(createdOrderId);
        
        // Store order info for payment processing
        try {
          localStorage.setItem('pendingPayment', JSON.stringify({
            orderId: createdOrderId,
            eventId: eventId,
            email,
            amount: totalPrice,
            currency: 'NGN'
          }));
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
          // Non-critical - we have orderId in state
        }

        setToast({
          type: 'success',
          message: 'Order created. Proceed to payment.'
        });
        setActiveStep(2);
      } catch (error: unknown) {
        console.error('Error creating order:', error);
        const errorMessage = (error as Error).message || 'Unknown error occurred';
        console.error('Full error details:', JSON.stringify(error, null, 2));
        setToast({
          type: 'error',
          message: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePurchase = async () => {
    if (!eventId || !selectedTicket) {
      setToast({ type: 'error', message: 'Missing information' });
      return;
    }

    const attendees = additionalTicketHolders.length > 0 ? additionalTicketHolders : null;
    const ticketPrice = Number(selectedTicket.price.replace(/[^\d.-]/g, ''));

    try {
      setIsLoading(true);

      // Handle free tickets
      if (ticketPrice === 0) {
        try {
          const { ticketId } = await createFreeTickets({
            eventId: eventId,
            ticketTypeName: selectedTicket.name,
            quantity: quantity,
            email: email,
            phone: phoneNumber,
            fullName: fullName,
            attendees: attendees,
            currency: 'NGN',
          });

          window.location.href = `/success?ticketId=${ticketId}`;
          return;
        } catch (error: unknown) {
          console.error('Error creating free ticket:', error);
          setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error creating free ticket') });
          return;
        }
      }

      // For paid tickets, we need to handle payment
      // Since we removed REST API, payment provider integration should be handled via:
      // 1. Supabase Edge Functions
      // 2. A separate payment service
      // 3. Client-side payment SDK (e.g., Paystack Inline)
      
      // For now, we'll redirect to a payment page with order ID
      // In production, integrate with your payment provider here
      if (!orderId) {
        setToast({ type: 'error', message: 'Order information not found. Please try again.' });
        return;
      }
      
      // Try to get from localStorage if available (non-critical)
      try {
        const storedPayment = localStorage.getItem('pendingPayment');
        if (storedPayment) {
          // localStorage available, can use it
        }
      } catch {
        // localStorage not available, continue with orderId from state
      }

      // const paymentInfo = JSON.parse(storedPayment);
      
      // TODO: Integrate payment provider (Paystack, Flutterwave, etc.)
      // Redirect to payment page with order ID and buyer email
      window.location.href = `/payment?orderId=${orderId}&amount=${totalPrice}&email=${encodeURIComponent(email)}`;
      
    } catch (error: unknown) {
      console.error('Error processing payment:', error);
      setToast({ type: 'error', message: (error instanceof Error ? error.message : 'Error processing payment') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleTicketSelection = (ticket: typeof tickets[0]) => {
    setSelectedTicket({
      id: ticket.id,
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity,
      sold: ticket.sold,
      details: ticket.details || ''
    });
    setQuantity(1);
    setTotalPrice(Number(ticket.price.replace(/[^\d.-]/g, '')));
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
    setTotalPrice(newQuantity * Number(selectedTicket?.price.replace(/[^\d.-]/g, '') || '0'));
    
    setAdditionalTicketHolders(prev => {
      if (newQuantity <= 1) return [];
      if (newQuantity - 1 > prev.length) {
        return [...prev, ...Array(newQuantity - 1 - prev.length).fill({ name: '', email: '', phone: '' })];
      }
      return prev.slice(0, newQuantity - 1);
    });
  };

  const handleAdditionalTicketHolderChange = (index: number, field: string, value: string) => {
    setAdditionalTicketHolders(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { name: '', email: '', };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const closeReceipt = () => {
    setIsPurchased(false);
    closeForm();
  };

  const steps = ['Select Ticket', 'Order Info', 'Payment'];

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 dark:text-white">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        <div className="p-4 sm:p-6">
          <button
            onClick={closeForm}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {isPurchased ? (
            <Receipt closeReceipt={closeReceipt} />
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-10 text-center text-gray-900 dark:text-white">
                Purchase Ticket
              </h2>

              {/* Custom Stepper */}
              <div className="flex justify-center mb-8">
                <div className="flex items-center space-x-4 justify-between">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-center gap-1">
                      <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 text-sm ${
                        index <= activeStep 
                          ? 'bg-[#f54502] border-[#f54502] text-white' 
                          : 'border-gray-300 text-gray-500'
                      }`}>
                        {index < activeStep ? (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <span className={`lg:ml-2 text-xs sm:text-sm font-medium ${
                        index <= activeStep ? 'text-[#f54502]' : 'text-gray-500'
                      }`}>
                        {step}
                      </span>
                      {index < steps.length - 1 && (
                        <div className={`hidden sm:block w-12 h-0.5 mx-2 ${
                          index < activeStep ? 'bg-blue-600' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {activeStep === 0 && (
                  <TicketSelectionStep
                    tickets={tickets}
                    selectedTicket={selectedTicket}
                    handleTicketSelection={handleTicketSelection}
                    quantity={quantity}
                    handleQuantityChange={handleQuantityChange}
                    totalPrice={totalPrice}
                  />
                )}

                {activeStep === 1 && (
                  <OrderInformationStep
                    fullName={fullName}
                    setFullName={setFullName}
                    email={email}
                    setEmail={setEmail}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    quantity={quantity}
                    additionalTicketHolders={additionalTicketHolders}
                    handleAdditionalTicketHolderChange={handleAdditionalTicketHolderChange}
                  />
                )}

                {activeStep === 2 && (
                  <PaymentStep
                    selectedTicket={selectedTicket}
                    quantity={quantity}
                    totalPrice={totalPrice}
                    handlePurchase={handlePurchase}
                    isLoading={isLoading}
                  />
                )}

                <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    className={`px-4 py-2  rounded-xl hover:scale-105 shadow-lg hover:shadow-xl transition-colors ${
                      activeStep === 0
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'border-[#f54502] text-[#f54502] hover:bg-[#f54502]/10 dark:hover:bg-[#f54502]/20'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeStep === 2 || isLoading}
                    className={`px-4 py-2 rounded-xl hover:scale-105 shadow-lg hover:shadow-xl transition-colors flex items-center justify-center gap-2 ${
                      activeStep === 2 || isLoading
                        ? ' hidden cursor-not-allowed'
                        : 'bg-[#f54502] text-white hover:bg-[#f54502]/90'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : activeStep === 2 ? (
                      ' '
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketTypeForm;