import { serve } from 'inngest/next';
import { inngest } from '@/utils/inngest';
import { sendAbandonedCartEmail } from '@/inngest/functions';

// Create an API route that serves all Inngest functions
// This endpoint is used by Inngest to sync and execute functions
// In production, make sure this route is accessible at: https://yourdomain.com/api/inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendAbandonedCartEmail,
  ],
  // In production with Inngest Cloud, the signing key is required
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

