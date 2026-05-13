import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtService } from './jwt.service';
import { JwtGuard } from './guards/jwt.guard';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, OtpService, JwtService, JwtGuard],
  exports: [JwtService, JwtGuard],
})
export class AuthModule {}
