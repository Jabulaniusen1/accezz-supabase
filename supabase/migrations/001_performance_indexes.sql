-- Performance optimization indexes for ticket production
-- These indexes dramatically improve query performance for ticket creation and retrieval

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id ON public.orders(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON public.orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);

-- Ticket indexes
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type_id ON public.tickets(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON public.tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_validation_status ON public.tickets(validation_status);

-- Ticket type indexes
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON public.ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_name ON public.ticket_types(event_id, name);

-- Event gallery indexes
CREATE INDEX IF NOT EXISTS idx_event_gallery_event_id ON public.event_gallery(event_id);

-- Ticket scans indexes
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by_user_id);

-- Event views indexes
CREATE INDEX IF NOT EXISTS idx_event_views_event_id ON public.event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_created_at ON public.event_views(created_at DESC);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_ref ON public.payment_transactions(provider_ref);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

