import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiateSTKPush(dto, userId);
  }

  @Post('callback')
  @HttpCode(200)
  handleCallback(@Body() body: any) {
    return this.paymentsService.handleCallback(body);
  }

  @Get('status/:checkoutRequestId')
  @UseGuards(AuthGuard('jwt'))
  getStatus(
    @Param('checkoutRequestId') checkoutRequestId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getPaymentStatus(checkoutRequestId, userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  getUserPayments(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getUserPayments(
      userId,
      page || 1,
      limit || 20,
    );
  }
}
