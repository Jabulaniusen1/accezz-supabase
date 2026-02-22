import { serve } from 'inngest/next';
import { inngest } from '@/utils/inngest';
import { sendAbandonedCartEmail, sendEventReminderEmails } from '@/inngest/functions';

// This endpoint serves two purposes:
// 1. GET: Inngest Cloud syncs functions from here (discovers available functions)
// 2. POST: Inngest Cloud invokes functions here (executes functions when events trigger)
// 
// IMPORTANT: In your Inngest Cloud dashboard, make sure the sync URL is set to:
// https://yourdomain.com/api/inngest
//
// Also ensure INNGEST_SIGNING_KEY is set in your production environment variables
const handler = serve({
  client: inngest,
  functions: [
    sendAbandonedCartEmail,
    sendEventReminderEmails,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export const { GET, POST, PUT } = handler;

