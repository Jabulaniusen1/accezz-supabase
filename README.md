This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Paystack Payments Integration

This project integrates Paystack for ticket purchases. Flow overview:

- Users create an order from the ticket modal.
- They are redirected to `/payment` which initializes a Paystack transaction via `/api/paystack/initialize` and redirects to Paystack Checkout.
- Paystack returns to `/success?reference=...`. The success page calls `/api/paystack/verify` to confirm payment, marks the order as paid, issues tickets, and shows the receipt.

### Environment Variables

Set the following in your environment (e.g., `.env.local`):

```
NEXT_PUBLIC_BASE_URL=https://your-domain.com
PAYSTACK_SECRET_KEY=sk_live_xxx_or_sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx_or_pk_test_xxx
# Optional, if you configure webhook signing
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_or_use_secret_key
```

Notes:
- Do not expose `PAYSTACK_SECRET_KEY` publicly. Use server-only runtime envs.
- `NEXT_PUBLIC_BASE_URL` is used for Paystack callback URLs.

### API Routes Added

- `POST /api/paystack/initialize`
  - Body: `{ email, amount, currency, orderId, callbackUrl? }`
  - Creates a Paystack transaction and returns `{ authorization_url, reference }`.

- `GET /api/paystack/verify?reference=...`
  - Verifies the transaction with Paystack. Returns `{ status, reference, orderId }`.

- `POST /api/paystack/webhook`
  - Validates `x-paystack-signature` and acknowledges events. You can extend this to reconcile state server-side.

### Client Pages Updated/Added

- `src/app/payment/page.tsx`
  - Reads `orderId`, `amount`, `email` from query (or `localStorage.pendingPayment`) and calls initialize, then redirects to Paystack.

- `src/app/success/page.tsx`
  - Calls verify endpoint, marks the order as paid, creates tickets, and redirects to the final receipt.

### Where Things Hook In

- Order creation and ticket issuance logic live in `src/utils/paymentUtils.ts`.
- The ticket modal `src/app/components/TicketTypeForm.tsx` stores `pendingPayment` in `localStorage` and sends the user to `/payment`.

### Paystack Dashboard Configuration

- Callback URL: `${NEXT_PUBLIC_BASE_URL}/success`
- Webhook URL (optional): `${NEXT_PUBLIC_BASE_URL}/api/paystack/webhook`

### Local Development

Use a tunnel (e.g., `ngrok http 3000`) and set the exposed URL as `NEXT_PUBLIC_BASE_URL` to receive callbacks locally.

### Testing

- Use your Paystack test keys.
- Buy a low-price ticket, complete the Paystack test flow, and ensure you land on the success page with a receipt (ticket issued).

