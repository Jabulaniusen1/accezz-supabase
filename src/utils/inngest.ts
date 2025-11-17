import { Inngest } from 'inngest';

// Create Inngest client
// In production, INNGEST_EVENT_KEY is required for Inngest Cloud
// For local development, you can run: npx inngest-cli dev
const eventKey = process.env.INNGEST_EVENT_KEY;

if (process.env.NODE_ENV === 'production' && !eventKey) {
  console.warn('[Inngest] WARNING: INNGEST_EVENT_KEY is not set in production. Events will not be sent to Inngest Cloud.');
}

// In production, explicitly set the base URL to prevent Inngest from using preview/deployment URLs
// Set INNGEST_BASE_URL to your production domain (e.g., https://accezz.com)
const baseUrl = process.env.INNGEST_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;

export const inngest = new Inngest({ 
  id: 'accezz-supabase',
  name: 'Accezz Supabase',
  eventKey: eventKey,
  // Explicitly set the base URL in production to avoid preview/deployment URLs
  ...(baseUrl && process.env.NODE_ENV === 'production' ? { baseURL: baseUrl } : {}),
});

