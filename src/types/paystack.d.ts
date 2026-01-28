declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackOptions) => PaystackHandler;
    };
  }
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  callback?: (response: PaystackResponse) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  reference: string;
  status: string;
  message?: string;
}

export interface PaystackHandler {
  openIframe: () => void;
  closeIframe: () => void;
}

