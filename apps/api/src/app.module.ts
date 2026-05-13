import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envSchema } from './config/env.schema';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { DomainsModule } from './domains/domains.module';
import { SkillsModule } from './skills/skills.module';
import { StorageModule } from './storage/storage.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CompaniesModule } from './companies/companies.module';
import { JobsModule } from './jobs/jobs.module';
import { FeedModule } from './feed/feed.module';
import { SwipesModule } from './swipes/swipes.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CommonModule,
    AuthModule,
    HealthModule,
    DomainsModule,
    SkillsModule,
    StorageModule,
    ProfilesModule,
    CompaniesModule,
    JobsModule,
    FeedModule,
    SwipesModule,
    ApplicationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
