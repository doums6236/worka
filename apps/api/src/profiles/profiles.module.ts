import { Module } from '@nestjs/common';
import { CandidateProfileController } from './candidate-profile.controller';
import { CandidateProfileService } from './candidate-profile.service';
import { RecruiterProfileController } from './recruiter-profile.controller';
import { RecruiterProfileService } from './recruiter-profile.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CandidateProfileController, RecruiterProfileController],
  providers: [CandidateProfileService, RecruiterProfileService],
  exports: [CandidateProfileService, RecruiterProfileService],
})
export class ProfilesModule {}
