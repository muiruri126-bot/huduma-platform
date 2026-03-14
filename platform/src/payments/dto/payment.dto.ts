import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Matches,
} from 'class-validator';

export enum PaymentReason {
  SERVICE_PAYMENT = 'service_payment',
  LISTING_BOOST = 'listing_boost',
  SUBSCRIPTION = 'subscription',
}

export class InitiatePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @Matches(/^254\d{9}$/, {
    message: 'Phone must be in format 254XXXXXXXXX',
  })
  phoneNumber: string;

  @IsEnum(PaymentReason)
  reason: PaymentReason;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
