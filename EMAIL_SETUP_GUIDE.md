# Email Setup Guide - Google SMTP

This guide explains how to set up Google SMTP for sending welcome emails and ticket emails in Accezz.

## Overview

Accezz sends two types of automated emails:
1. **Welcome Email** - Sent automatically when a user signs up successfully
2. **Ticket Email** - Sent automatically when a ticket is purchased successfully

Both emails are sent using Google SMTP (Gmail) via the nodemailer library.

## Prerequisites

1. A Gmail account
2. 2-Step Verification enabled on your Google Account
3. A Gmail App Password generated

## Setup Instructions

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the prompts to enable 2-Step Verification
4. This is required to generate App Passwords

### Step 2: Generate Gmail App Password

1. Go to **Security** → **App Passwords**
   - Direct link: https://myaccount.google.com/apppasswords
   - If you don't see this option, make sure 2-Step Verification is enabled
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter "Accezz" (or any name you prefer)
5. Click **Generate**
6. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
   - You can use it with or without spaces

### Step 3: Configure Environment Variables

Add the following to your `.env` file in the project root:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
GMAIL_SENDER_NAME=Accezz

# Optional: Base URL for email links
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Example:**
```env
GMAIL_USER=support@accezz.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
GMAIL_SENDER_NAME=Accezz Team
NEXT_PUBLIC_BASE_URL=https://accezz.com
```

### Step 4: Restart Your Development Server

After updating your `.env` file, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

### Welcome Email Flow

1. User completes signup form at `/auth/signup`
2. Account is created via Supabase Auth
3. Welcome email is automatically sent to the user's email address
4. Email includes:
   - Welcome message
   - Overview of Accezz features
   - Link to dashboard

**Code Location:** `src/app/auth/signup/page.tsx`

### Ticket Email Flow

1. User completes ticket purchase and payment
2. Payment is verified via Paystack
3. Order is marked as paid
4. Tickets are created with QR codes
5. Ticket email is automatically sent to the buyer's email address
6. Email includes:
   - Event details (title, date, time, venue)
   - Ticket codes
   - QR code for entry
   - Order information

**Code Location:** `src/utils/paymentUtils.ts` → `createTicketsForOrder()`

## Email Templates

Email templates are generated dynamically using HTML:

- **Welcome Email Template:** `src/utils/emailUtils.ts` → `generateWelcomeEmailHTML()`
- **Ticket Email Template:** `src/utils/emailUtils.ts` → `generateTicketEmailHTML()`

You can customize these templates by editing the HTML in `src/utils/emailUtils.ts`.

## API Routes

The email functionality uses the following API routes:

- **Welcome Email:** `POST /api/emails/welcome`
  - Body: `{ email: string, fullName: string }`

- **Ticket Email:** `POST /api/emails/ticket`
  - Body: `{ email, fullName, eventTitle, eventDate, eventTime, venue, ticketType, quantity, ticketCodes, totalAmount, currency, orderId, qrCodeUrl }`

## Troubleshooting

### Emails Not Sending

1. **Check Environment Variables**
   - Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set correctly
   - Make sure there are no extra spaces or quotes
   - Restart your server after updating `.env`

2. **Check Gmail App Password**
   - Ensure you're using an App Password, not your regular Gmail password
   - Verify 2-Step Verification is enabled
   - Regenerate the app password if needed

3. **Check Server Logs**
   - Look for error messages in your console/terminal
   - Check for "Authentication failed" or "Connection timeout" errors

4. **Check Gmail Limits**
   - Free Gmail accounts: 500 emails/day limit
   - Google Workspace accounts: 2000 emails/day limit
   - If you hit the limit, wait 24 hours or upgrade to Google Workspace

### Common Errors

**Error: "Invalid login"**
- Solution: Verify your `GMAIL_USER` is correct and `GMAIL_APP_PASSWORD` is the correct App Password

**Error: "Connection timeout"**
- Solution: Check your firewall/network settings. Port 587 should be open

**Error: "Rate limit exceeded"**
- Solution: You've hit Gmail's daily sending limit. Wait 24 hours or upgrade to Google Workspace

**Error: "Authentication failed"**
- Solution: Regenerate your App Password and update `.env`

### Testing Email Functionality

1. **Test Welcome Email:**
   - Create a new user account
   - Check email inbox (and spam folder)

2. **Test Ticket Email:**
   - Make a test ticket purchase
   - Check email inbox (and spam folder)

3. **Test API Routes Directly:**
   ```bash
   # Test welcome email
   curl -X POST http://localhost:3000/api/emails/welcome \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","fullName":"Test User"}'

   # Test ticket email
   curl -X POST http://localhost:3000/api/emails/ticket \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","fullName":"Test User","eventTitle":"Test Event",...}'
   ```

## Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Keep credentials secure

2. **Use Environment-Specific Variables**
   - Different credentials for development vs production
   - Use your hosting platform's environment variable settings for production

3. **Rotate App Passwords Regularly**
   - Generate new App Passwords periodically
   - Revoke old ones if compromised

4. **Monitor Email Sending**
   - Check logs for unusual activity
   - Set up alerts for failed email sends

## Production Deployment

For production, set environment variables in your hosting platform:

### Vercel
1. Go to Project Settings → Environment Variables
2. Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_SENDER_NAME`
3. Redeploy your application

### Other Platforms
- Set environment variables in your platform's configuration
- Ensure they're available at runtime
- Restart the application after setting variables

## Support

If you continue to experience issues:

1. Check the [Supabase SMTP Setup Guide](./supabase/SMTP_SETUP.md) for Supabase-specific email configuration
2. Review server logs for detailed error messages
3. Verify your Gmail account settings and App Password
4. Test with a different Gmail account if needed

## Additional Resources

- [Google App Passwords Documentation](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)

