# Email Setup Guide - ZeptoMail SMTP

This guide explains how to set up ZeptoMail SMTP for sending welcome emails and ticket emails in Accezz.

## Overview

Accezz sends two types of automated emails:
1. **Welcome Email** - Sent automatically when a user signs up successfully
2. **Ticket Email** - Sent automatically when a ticket is purchased successfully

Both emails are sent using ZeptoMail SMTP via the nodemailer library.

## Prerequisites

1. A ZeptoMail account
2. Your ZeptoMail API credentials
3. A verified domain (accezzlive.com)

## Setup Instructions

### Step 1: Get Your ZeptoMail Credentials

From your ZeptoMail dashboard, you should have:
- **Username:** `emailapikey` (standard for ZeptoMail)
- **Password:** Your ZeptoMail API password
- **Server:** `smtp.zeptomail.com`
- **Port:** `587` (TLS) or `465` (SSL)
- **Domain/Sender Address:** `accezzlive.com`

### Step 2: Configure Environment Variables

Add the following to your `.env` file in the project root:

```env
# ZeptoMail SMTP Configuration
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=your-zeptomail-api-password
ZEPTOMAIL_SENDER_EMAIL=noreply@accezzlive.com
ZEPTOMAIL_SENDER_NAME=Accezz

# Optional: Base URL for email links
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Example with your credentials:**
```env
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_PASSWORD=wSsVR61/qUL1Bvh8zTf8IOlrywkAAV33R0V/jFqh4iP1T/mRocduxRKbDAKgHfkeQG5sQGQSprotmUxT0zVaiIwrm1sGCCiF9mqRe1U4J3x17qnvhDzKX21ZmhqPK4sBzwlun2JpFs8h+g==
ZEPTOMAIL_SENDER_EMAIL=noreply@accezzlive.com
ZEPTOMAIL_SENDER_NAME=Accezz
NEXT_PUBLIC_BASE_URL=https://accezzlive.com
```

**Important Notes:**
- The username is always `emailapikey` for ZeptoMail
- Use your full ZeptoMail API password
- The sender email must be from your verified domain (accezzlive.com)
- Common sender emails: `noreply@accezzlive.com`, `support@accezzlive.com`, `info@accezzlive.com`

### Step 3: Restart Your Development Server

After updating your `.env` file, restart your Next.js development server:

```bash
npm run dev
```

## ZeptoMail SMTP Settings

The application uses the following ZeptoMail SMTP configuration:

- **Host:** `smtp.zeptomail.com`
- **Port:** `587` (TLS) - recommended
- **Alternative Port:** `465` (SSL) - if port 587 is blocked
- **Security:** TLS (STARTTLS) for port 587, SSL for port 465
- **Authentication:** Required
- **Username:** `emailapikey` (standard)
- **Password:** Your ZeptoMail API password

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
   - Verify `ZEPTOMAIL_PASSWORD` is set correctly
   - Make sure `ZEPTOMAIL_SENDER_EMAIL` uses your verified domain
   - Ensure there are no extra spaces or quotes
   - Restart your server after updating `.env`

2. **Check ZeptoMail Credentials**
   - Verify your API password is correct
   - Ensure your domain (accezzlive.com) is verified in ZeptoMail
   - Check that the sender email domain matches your verified domain

3. **Check Server Logs**
   - Look for error messages in your console/terminal
   - Check for "Authentication failed" or "Connection timeout" errors

4. **Check ZeptoMail Limits**
   - Review your ZeptoMail plan limits
   - Check your sending quota in ZeptoMail dashboard
   - Monitor your sending volume

### Common Errors

**Error: "Invalid login"**
- Solution: Verify your `ZEPTOMAIL_PASSWORD` is correct. The username should be `emailapikey`

**Error: "Connection timeout"**
- Solution: Check your firewall/network settings. Port 587 should be open. Try port 465 (SSL) if 587 is blocked

**Error: "Sender address not verified"**
- Solution: Ensure `ZEPTOMAIL_SENDER_EMAIL` uses a domain verified in your ZeptoMail account (accezzlive.com)

**Error: "Authentication failed"**
- Solution: 
  - Verify your API password is correct
  - Ensure the username is set to `emailapikey`
  - Check that your ZeptoMail account is active

**Error: "Domain not verified"**
- Solution: Verify your domain (accezzlive.com) in ZeptoMail dashboard and configure DNS records

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

3. **Monitor Email Sending**
   - Check logs for unusual activity
   - Set up alerts for failed email sends
   - Monitor your ZeptoMail dashboard for sending statistics

4. **Rotate API Passwords Regularly**
   - Generate new API passwords periodically
   - Revoke old ones if compromised

## Production Deployment

For production, set environment variables in your hosting platform:

### Vercel
1. Go to Project Settings → Environment Variables
2. Add `ZEPTOMAIL_USER`, `ZEPTOMAIL_PASSWORD`, `ZEPTOMAIL_SENDER_EMAIL`, `ZEPTOMAIL_SENDER_NAME`
3. Redeploy your application

### Other Platforms
- Set environment variables in your platform's configuration
- Ensure they're available at runtime
- Restart the application after setting variables

## ZeptoMail Domain Setup

For your domain (accezzlive.com):

1. **Verify Domain in ZeptoMail:**
   - Go to ZeptoMail dashboard
   - Add and verify your domain (accezzlive.com)
   - Configure DNS records (SPF, DKIM, DMARC) as required

2. **Use Domain Email Addresses:**
   - Use emails from your verified domain for `ZEPTOMAIL_SENDER_EMAIL`
   - Examples: `noreply@accezzlive.com`, `support@accezzlive.com`, `info@accezzlive.com`

3. **SPF/DKIM Records:**
   - Ensure SPF and DKIM records are properly configured
   - This improves email deliverability and prevents emails from going to spam

## Support

If you continue to experience issues:

1. Check ZeptoMail status and documentation
2. Review server logs for detailed error messages
3. Verify your ZeptoMail account settings
4. Test with a different sender email address if needed
5. Contact ZeptoMail support for account-specific issues

## Additional Resources

- [ZeptoMail Documentation](https://www.zeptomail.com/docs/)
- [ZeptoMail SMTP Settings](https://www.zeptomail.com/docs/smtp)
- [Nodemailer Documentation](https://nodemailer.com/about/)
