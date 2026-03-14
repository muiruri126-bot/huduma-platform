import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private sms: any;
  private senderId: string;
  private isConfigured = false;

  private isSandbox = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.get<string>('AT_API_KEY');
    const username = this.config.get<string>('AT_USERNAME');
    this.senderId = this.config.get<string>('AT_SENDER_ID', 'HUDUMA');
    this.isSandbox = username === 'sandbox';

    if (apiKey && username) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AfricasTalking = require('africastalking');
      const at = AfricasTalking({ apiKey, username });
      this.sms = at.SMS;
      this.isConfigured = true;
      this.logger.log(
        `Africa's Talking SMS initialized (username: ${username})`,
      );
    } else {
      this.logger.warn(
        "Africa's Talking credentials not configured — SMS disabled",
      );
    }
  }

  async send(
    to: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`SMS not configured. Would send to ${to}: ${message}`);
      return { success: false, error: 'SMS provider not configured' };
    }

    // Normalise Kenyan numbers to +254 format
    const phone = this.normalizePhone(to);

    try {
      const sendOptions: any = { to: [phone], message };
      // Sandbox doesn't support custom sender IDs
      if (!this.isSandbox && this.senderId) {
        sendOptions.from = this.senderId;
      }
      const result = await this.sms.send(sendOptions);

      const recipients = result.SMSMessageData?.Recipients ?? [];
      if (recipients.length > 0) {
        const recipient = recipients[0];
        const status = recipient.statusCode;
        if (status === 101) {
          this.logger.log(`SMS sent to ${phone} — messageId: ${recipient.messageId}`);
          return { success: true, messageId: recipient.messageId };
        }
        this.logger.warn(`SMS to ${phone} failed — status: ${recipient.status}`);
        return { success: false, error: recipient.status };
      }

      this.logger.warn(`SMS to ${phone} — no recipients in response`);
      return { success: false, error: 'No recipients in provider response' };
    } catch (error: any) {
      this.logger.error(`SMS send failed for ${phone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private normalizePhone(phone: string): string {
    // Remove all whitespace and dashes
    let cleaned = phone.replace(/[\s-]/g, '');

    // Convert 07xx to +2547xx
    if (cleaned.startsWith('0')) {
      cleaned = '+254' + cleaned.slice(1);
    }
    // Convert 2547xx to +2547xx
    if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}
