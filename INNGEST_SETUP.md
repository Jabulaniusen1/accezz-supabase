# Inngest Setup & Testing Guide

## Overview

Inngest is **event-driven** (not cron-based). Your app has two Inngest functions:

1. **`sendAbandonedCartEmail`** - Sends abandoned cart email 20 seconds after order creation
   - Triggered by: `order/created` event
   - Waits 20 seconds, then checks if order is still pending

2. **`generateTicketEmailAndQR`** - Generates QR codes and sends ticket email after payment
   - Triggered by: `payment/success` event
   - Runs immediately after payment is processed

## Setup Steps

### 1. Install Inngest CLI (for local development)

```bash
npm install -g inngest-cli
```

Or use npx (no install needed):
```bash
npx inngest-cli dev
```

### 2. Set Up Environment Variables

Add these to your `.env.local` or `.env` file:

```env
# For local development (optional - Inngest dev server works without it)
INNGEST_EVENT_KEY=

# For production (REQUIRED)
# Get this from: https://app.inngest.com/env/[your-env]/manage/keys
INNGEST_EVENT_KEY=your_inngest_event_key_here
INNGEST_SIGNING_KEY=your_inngest_signing_key_here

# Your app URL (used for API calls)
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # local
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com  # production
```

### 3. Production Setup (Inngest Cloud)

1. **Create an Inngest account**: https://app.inngest.com/sign-up
2. **Create a new app** in Inngest Cloud dashboard
3. **Get your keys**:
   - Go to: https://app.inngest.com/env/[your-env]/manage/keys
   - Copy `Event Key` → set as `INNGEST_EVENT_KEY`
   - Copy `Signing Key` → set as `INNGEST_SIGNING_KEY`
4. **Set sync URL**:
   - Go to: https://app.inngest.com/env/[your-env]/settings
   - Set "Sync URL" to: `https://yourdomain.com/api/inngest`
   - This allows Inngest to discover your functions

### 4. Local Development Setup

For local development, you can use Inngest's dev server:

```bash
# Terminal 1: Start your Next.js app
npm run dev

# Terminal 2: Start Inngest dev server
npx inngest-cli dev
```

The Inngest dev server will:
- Automatically discover your functions at `http://localhost:3000/api/inngest`
- Show a dashboard at `http://localhost:3000/inngest` (if configured) or `http://127.0.0.1:8288`
- Allow you to trigger events manually for testing

## Testing Inngest Functions

### Option 1: Test via Real User Flow (Recommended)

#### Test Abandoned Cart Email:

1. **Create an order** (but don't complete payment):
   ```bash
   # In your browser, go through checkout flow
   # Stop before completing payment
   ```

2. **Wait 20 seconds** - The abandoned cart email should be sent automatically

3. **Check Inngest dashboard**:
   - Local: `http://127.0.0.1:8288` (Inngest dev server)
   - Production: https://app.inngest.com
   - You should see the `order/created` event and function execution

#### Test Ticket Email & QR Generation:

1. **Complete a payment** (use Paystack test mode)
2. **Check email** - Ticket email with QR code should arrive
3. **Check Inngest dashboard** - Should see `payment/success` event and function execution

### Option 2: Manual Testing via API

#### Test Abandoned Cart Function:

```bash
# First, create an order (get the orderId from your database)
# Then trigger the event:

curl -X POST http://localhost:3000/api/inngest/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "order/created",
    "data": {
      "orderId": "your-order-id-here"
    }
  }'
```

**Check order exists and is pending:**
```sql
SELECT id, status, buyer_email, created_at 
FROM orders 
WHERE id = 'your-order-id-here';
```

#### Test Ticket Email Function:

```bash
# First, mark an order as paid and create tickets
# Then trigger the event:

curl -X POST http://localhost:3000/api/inngest/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "payment/success",
    "data": {
      "orderId": "your-order-id-here",
      "paymentReference": "test-ref-123",
      "paymentProvider": "paystack"
    }
  }'
```

### Option 3: Test via Inngest Dashboard

1. **Go to Inngest Dashboard**:
   - Local: `http://127.0.0.1:8288`
   - Production: https://app.inngest.com

2. **Navigate to "Events"** → "Send Event"

3. **Send test event**:
   - Event name: `order/created`
   - Data:
     ```json
     {
       "orderId": "your-order-id-here"
     }
     ```

4. **Watch function execution** in real-time

### Option 4: Test via Database (Quick Test)

Create a test order directly in the database:

```sql
-- Create a test order
INSERT INTO orders (
  id, 
  event_id, 
  buyer_email, 
  buyer_full_name,
  total_amount,
  currency,
  status
)
VALUES (
  gen_random_uuid(),
  'your-event-id-here',  -- Replace with actual event ID
  'test@example.com',
  'Test User',
  1000.00,
  'NGN',
  'pending'
)
RETURNING id;
```

Then trigger the event via API (Option 2) using the returned `id`.

## Monitoring & Debugging

### View Function Runs

1. **Local**: `http://127.0.0.1:8288` → Functions → Select function → View runs
2. **Production**: https://app.inngest.com → Functions → Select function → View runs

### Check Logs

1. **Inngest Dashboard**: Each function run shows detailed logs
2. **Your App Logs**: Check your Next.js server console/logs
3. **Email Logs**: Check your email service (Gmail) for sent emails

### Common Issues

#### Issue: Events not triggering functions

**Check:**
- ✅ Inngest dev server is running (local) OR sync URL is set correctly (production)
- ✅ `INNGEST_EVENT_KEY` is set (production only)
- ✅ Functions are registered at `/api/inngest` (check browser: `http://localhost:3000/api/inngest`)

**Debug:**
```bash
# Check if Inngest can see your functions
curl http://localhost:3000/api/inngest

# Should return JSON with function definitions
```

#### Issue: Functions running but emails not sending

**Check:**
- ✅ Gmail credentials are set (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
- ✅ Email API routes are working: `/api/emails/abandoned-cart` and `/api/emails/ticket`
- ✅ Check server logs for email errors

**Test email API directly:**
```bash
# Test abandoned cart email
curl -X POST http://localhost:3000/api/emails/abandoned-cart \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "eventTitle": "Test Event",
    "eventDate": "Saturday, January 1, 2024",
    "eventTime": "2:00 PM",
    "venue": "Test Venue",
    "ticketType": "General",
    "quantity": 1,
    "totalAmount": 1000,
    "currency": "NGN",
    "orderId": "test-order-id",
    "eventSlug": "test-event"
  }'
```

#### Issue: QR codes not generating

**Check:**
- ✅ Storage bucket `ticket-qr` exists in Supabase
- ✅ Storage policies are set (should be in `COMPLETE_SETUP.sql`)
- ✅ API route `/api/tickets/generate-qr` is working

## Production Deployment Checklist

Before deploying to production:

- [ ] Create Inngest Cloud account and app
- [ ] Set `INNGEST_EVENT_KEY` in production environment
- [ ] Set `INNGEST_SIGNING_KEY` in production environment
- [ ] Set sync URL in Inngest dashboard to `https://yourdomain.com/api/inngest`
- [ ] Verify functions are synced (check Inngest dashboard)
- [ ] Test with a real order (use Paystack test mode first)
- [ ] Monitor function executions in Inngest dashboard

## Architecture Overview

```
Order Created
    ↓
Trigger: order/created event
    ↓
Inngest Function: sendAbandonedCartEmail
    ↓
Wait 20 seconds
    ↓
Check if order still pending
    ↓
Send abandoned cart email

Payment Success
    ↓
Trigger: payment/success event
    ↓
Inngest Function: generateTicketEmailAndQR
    ↓
Generate QR codes
    ↓
Send ticket email with QR
```

## Useful Commands

```bash
# Start Inngest dev server
npx inngest-cli dev

# Check Inngest CLI version
npx inngest-cli --version

# View Inngest dashboard (local)
open http://127.0.0.1:8288
```

## Additional Resources

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Next.js Guide](https://www.inngest.com/docs/quick-start/nextjs)
- [Inngest Dashboard](https://app.inngest.com)


