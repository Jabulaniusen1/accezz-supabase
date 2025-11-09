import crypto from 'crypto';

type InitializeParams = {
  amountKobo: number;
  email: string;
  reference?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
};

type InitializeResponse = {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
};

const PAYSTACK_API_BASE = 'https://api.paystack.co';

function getPaystackSecret(): string {
  const secret =
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error('Missing PAYSTACK_SECRET_KEY environment variable');
  }

  return secret;
}

export async function initializePaystackTransaction(params: InitializeParams): Promise<InitializeResponse> {
  const secret = getPaystackSecret();

  if (!Number.isInteger(params.amountKobo) || params.amountKobo <= 0) {
    throw new Error('amountKobo must be a positive integer');
  }

  const reference =
    params.reference ||
    `WTP-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

  const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference,
      currency: params.currency || 'NGN',
      metadata: params.metadata ?? {},
      callback_url: params.callbackUrl,
    }),
  });

  const raw = await response.text();
  let json: { status?: boolean; data?: { authorization_url?: string; access_code?: string; reference?: string }; message?: string } | null = null;

  try {
    json = raw ? JSON.parse(raw) : null;
  } catch (error) {
    throw new Error(`Failed to parse Paystack response: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  if (!response.ok || !json?.status || !json.data?.authorization_url) {
    const message = json?.message || raw || 'Failed to initialize Paystack transaction';
    throw new Error(message);
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code ?? undefined,
    reference: json.data.reference || reference,
  };
}

export function verifyPaystackSignature(signatureHeader: string | null | undefined, rawBody: string): boolean {
  const secret = getPaystackSecret();
  const expectedSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return typeof signatureHeader === 'string' && signatureHeader === expectedSignature;
}


