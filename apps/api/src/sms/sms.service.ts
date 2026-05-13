import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phoneE164: string, code: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER ?? 'mock';

    if (provider === 'mock') {
      console.log(`[MOCK SMS] to ${phoneE164}: Your Worka code is ${code}`);
      return;
    }

    if (provider === 'cinetpay') {
      const apiKey = process.env.CINETPAY_API_KEY;
      const siteId = process.env.CINETPAY_SITE_ID;
      if (!apiKey || !siteId) {
        throw new Error('CINETPAY_API_KEY and CINETPAY_SITE_ID must be set');
      }
      throw new Error('CinetPay SMS provider not yet implemented — see plan 1C');
    }

    throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
