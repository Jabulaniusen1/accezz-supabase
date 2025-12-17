# Paystack Callback & Webhook URLs

## For Local Development (using ngrok or similar tunnel)

If you're running locally and need to test Paystack callbacks:

1. **Set up a tunnel** (e.g., using ngrok):
   ```bash
   ngrok http 3000
   ```

2. **Get your tunnel URL** (e.g., `https://abc123.ngrok.io`)

3. **Set in your `.env` file**:
   ```env
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

4. **Use these URLs in Paystack Dashboard**:
   - **Test Callback URL**: `https://abc123.ngrok.io/success`
   - **Test Webhook URL**: `https://abc123.ngrok.io/api/paystack/webhook`

## For Production

Replace `yourdomain.com` with your actual domain:

- **Test Callback URL**: `https://yourdomain.com/success`
- **Test Webhook URL**: `https://yourdomain.com/api/paystack/webhook`

- **Live Callback URL**: `https://yourdomain.com/success`
- **Live Webhook URL**: `https://yourdomain.com/api/paystack/webhook`

## Important Notes

1. **Callback URL** is where Paystack redirects users after payment
   - Used in the `callback_url` parameter when initializing transactions
   - Users are redirected here after completing payment on Paystack's hosted page

2. **Webhook URL** is where Paystack sends server-to-server notifications
   - Used for reliable payment status updates
   - Called asynchronously by Paystack after payment completes
   - More reliable than callback for critical operations

3. **Both URLs are required** for a complete payment flow:
   - Callback: For user experience (immediate redirect)
   - Webhook: For reliability (server-side confirmation)

## Setting Up in Paystack Dashboard

1. Go to https://dashboard.paystack.com/#/settings/developer
2. Scroll to "API Keys & Webhooks"
3. Under "Callback URL", add:
   - Test: `http://localhost:3000/success` (for local) or your tunnel URL
   - Live: Your production URL
4. Under "Webhook URL", add:
   - Test: `http://localhost:3000/api/paystack/webhook` (for local) or your tunnel URL
   - Live: Your production URL

## Quick Reference

Based on your `NEXT_PUBLIC_BASE_URL`:

**If `NEXT_PUBLIC_BASE_URL=http://localhost:3000`:**
- Callback: `http://localhost:3000/success`
- Webhook: `http://localhost:3000/api/paystack/webhook`

**If `NEXT_PUBLIC_BASE_URL=https://yourdomain.com`:**
- Callback: `https://yourdomain.com/success`
- Webhook: `https://yourdomain.com/api/paystack/webhook`

## Testing

After setting up:

1. Make a test payment
2. User should be redirected to `/success` page (callback)
3. Check server logs for webhook calls from Paystack
4. Verify order status is updated to "paid"

