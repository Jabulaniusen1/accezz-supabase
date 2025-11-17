import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({ 
  id: 'accezz-supabase',
  name: 'Accezz Supabase',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

