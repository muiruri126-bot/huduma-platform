import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly passkey: string;
  private readonly shortcode: string;
  private readonly callbackUrl: string;
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const isSandbox = this.config.get('MPESA_ENV', 'sandbox') === 'sandbox';
    this.baseUrl = isSandbox
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
    this.consumerKey = this.config.get('MPESA_CONSUMER_KEY', '');
    this.consumerSecret = this.config.get('MPESA_CONSUMER_SECRET', '');
    this.passkey = this.config.get('MPESA_PASSKEY', '');
    this.shortcode = this.config.get('MPESA_SHORTCODE', '174379');
    this.callbackUrl = this.config.get(
      'MPESA_CALLBACK_URL',
      'https://huduma-production.up.railway.app/api/v1/payments/callback',
    );
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${auth}` },
      },
    );

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, '')
      .slice(0, 14);
    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`,
    ).toString('base64');
    return { password, timestamp };
  }

  async initiateSTKPush(
    dto: InitiatePaymentDto,
    userId: string,
  ): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        phoneNumber: dto.phoneNumber,
        method: 'mpesa_stk',
        status: 'pending',
        description: dto.description || dto.reason,
        listingId: dto.listingId || null,
      },
    });

    const body = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(dto.amount),
      PartyA: dto.phoneNumber,
      PartyB: this.shortcode,
      PhoneNumber: dto.phoneNumber,
      CallBackURL: this.callbackUrl,
      AccountReference: `HUDUMA-${payment.id.slice(0, 8).toUpperCase()}`,
      TransactionDesc: dto.description || 'Huduma Platform Payment',
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const result = (await response.json()) as {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResponseCode: string;
      ResponseDescription: string;
    };

    if (result.ResponseCode !== '0') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', resultDesc: result.ResponseDescription },
      });
      throw new Error(result.ResponseDescription);
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        merchantRequestId: result.MerchantRequestID,
        checkoutRequestId: result.CheckoutRequestID,
        status: 'processing',
      },
    });

    return {
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
    };
  }

  async handleCallback(body: any): Promise<void> {
    const callback = body?.Body?.stkCallback;
    if (!callback) {
      this.logger.warn('Invalid M-Pesa callback body');
      return;
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      callback;

    const payment = await this.prisma.payment.findUnique({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!payment) {
      this.logger.warn(
        `Payment not found for CheckoutRequestID: ${CheckoutRequestID}`,
      );
      return;
    }

    if (ResultCode === 0) {
      const items = CallbackMetadata?.Item || [];
      const receiptNumber = items.find(
        (i: any) => i.Name === 'MpesaReceiptNumber',
      )?.Value;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'completed',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          mpesaReceiptNumber: receiptNumber || null,
          paidAt: new Date(),
          metadata: CallbackMetadata,
        },
      });

      this.logger.log(
        `Payment ${payment.id} completed. Receipt: ${receiptNumber}`,
      );
    } else {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          resultCode: ResultCode,
          resultDesc: ResultDesc,
        },
      });

      this.logger.log(
        `Payment ${payment.id} failed: ${ResultDesc}`,
      );
    }
  }

  async getPaymentStatus(checkoutRequestId: string, userId: string) {
    return this.prisma.payment.findFirst({
      where: { checkoutRequestId, userId },
      select: {
        id: true,
        amount: true,
        status: true,
        mpesaReceiptNumber: true,
        paidAt: true,
        createdAt: true,
      },
    });
  }

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          mpesaReceiptNumber: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return { payments, total, page, limit };
  }
}
