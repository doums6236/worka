import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CinetPayClient } from './cinetpay.client';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CinetPayClient],
})
export class PaymentsModule {}
