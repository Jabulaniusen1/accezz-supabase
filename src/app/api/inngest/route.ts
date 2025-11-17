import { serve } from 'inngest/next';
import { inngest } from '@/utils/inngest';
import { sendAbandonedCartEmail } from '@/inngest/functions';

// This endpoint serves two purposes:
// 1. GET: Inngest Cloud syncs functions from here (discovers available functions)
// 2. POST: Inngest Cloud invokes functions here (executes functions when events trigger)
// 
// IMPORTANT FOR PRODUCTION:
// 1. In your Inngest Cloud dashboard, manually set the sync URL to your production domain:
//    https://accezzlive.com/api/inngest (NOT a preview/deployment URL)
// 2. Ensure INNGEST_SIGNING_KEY is set in your production environment variables
// 3. Set INNGEST_BASE_URL or NEXT_PUBLIC_BASE_URL to your production domain
//
// To fix "Unattached Syncs" errors:
// - Go to Inngest Dashboard → Your App → Settings
// - Find the sync URL configuration
// - Delete any preview/deployment URLs
// - Add ONLY your production URL: https://accezzlive.com/api/inngest
const handler = serve({
  client: inngest,
  functions: [
    sendAbandonedCartEmail,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export const { GET, POST, PUT } = handler;

