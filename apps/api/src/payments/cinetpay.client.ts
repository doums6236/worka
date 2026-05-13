import { Injectable, Logger } from '@nestjs/common';

export interface InitPaymentParams {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  customerPhone: string;
}

export interface InitPaymentResult {
  paymentUrl: string;
  providerRef: string;
}

interface CinetPayResponse {
  data?: { payment_url?: string; payment_token?: string };
}

@Injectable()
export class CinetPayClient {
  private readonly logger = new Logger(CinetPayClient.name);

  async initPayment(params: InitPaymentParams): Promise<InitPaymentResult> {
    const mode = process.env.CINETPAY_MODE ?? 'mock';

    if (mode === 'mock') {
      return {
        paymentUrl: `mock://cinetpay/pay?tx=${params.transactionId}`,
        providerRef: `mock-${params.transactionId}`,
      };
    }

    const baseUrl = process.env.CINETPAY_BASE_URL!;
    const apiKey = process.env.CINETPAY_API_KEY!;
    const siteId = process.env.CINETPAY_SITE_ID!;
    const notifyUrl = process.env.CINETPAY_NOTIFY_URL!;
    const returnUrl = process.env.CINETPAY_RETURN_URL!;

    const body = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      notify_url: notifyUrl,
      return_url: returnUrl,
      channels: 'MOBILE_MONEY',
      customer_phone_number: params.customerPhone,
    };

    const res = await fetch(`${baseUrl}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      this.logger.error(`CinetPay init failed: ${res.status} ${await res.text()}`);
      throw new Error(`CinetPay init failed: ${res.status}`);
    }
    const json = (await res.json()) as CinetPayResponse;
    return {
      paymentUrl: json.data?.payment_url ?? '',
      providerRef: json.data?.payment_token ?? params.transactionId,
    };
  }
}
