import { serve } from 'inngest/next';
import { inngest } from '@/utils/inngest';
import { sendAbandonedCartEmail } from '@/inngest/functions';

// Create an API route that serves all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    sendAbandonedCartEmail,
  ],
});

