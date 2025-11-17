import { Inngest } from 'inngest';

// Create Inngest client
// In production, INNGEST_EVENT_KEY is required for Inngest Cloud
// For local development, you can run: npx inngest-cli dev
const eventKey = process.env.INNGEST_EVENT_KEY;

if (process.env.NODE_ENV === 'production' && !eventKey) {
  console.warn('[Inngest] WARNING: INNGEST_EVENT_KEY is not set in production. Events will not be sent to Inngest Cloud.');
}

export const inngest = new Inngest({ 
  id: 'accezz-supabase',
  name: 'Accezz Supabase',
  eventKey: eventKey,
});

