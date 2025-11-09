type WhatsappConfig = {
  phoneNumberId: string;
  accessToken: string;
};

function getWhatsappConfig(): WhatsappConfig {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId) {
    throw new Error('Missing META_PHONE_NUMBER_ID environment variable');
  }

  if (!accessToken) {
    throw new Error('Missing META_WHATSAPP_ACCESS_TOKEN environment variable');
  }

  return { phoneNumberId, accessToken };
}

function buildMessagesEndpoint(phoneNumberId: string): string {
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v19.0';
  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
}

export async function sendWhatsappTextMessage(params: { to: string; body: string; previewUrl?: boolean }): Promise<void> {
  const { phoneNumberId, accessToken } = getWhatsappConfig();
  const endpoint = buildMessagesEndpoint(phoneNumberId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'text',
      text: {
        preview_url: params.previewUrl ?? true,
        body: params.body,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send WhatsApp message: ${errorText}`);
  }
}

export async function sendWhatsappImageMessage(params: { to: string; imageUrl: string; caption?: string }): Promise<void> {
  const { phoneNumberId, accessToken } = getWhatsappConfig();
  const endpoint = buildMessagesEndpoint(phoneNumberId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'image',
      image: {
        link: params.imageUrl,
        caption: params.caption,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send WhatsApp image: ${errorText}`);
  }
}

export async function sendWhatsappTypingIndicator(params: { to: string; state: 'typing_on' | 'typing_off' }): Promise<void> {
  const { phoneNumberId, accessToken } = getWhatsappConfig();
  const endpoint = buildMessagesEndpoint(phoneNumberId);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'action',
      action: {
        typing: params.state,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send WhatsApp typing indicator: ${errorText}`);
  }
}


