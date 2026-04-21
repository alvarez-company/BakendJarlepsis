import { Module } from '@nestjs/common';
import { PushTokensModule } from '../push-tokens/push-tokens.module';
import { PushService } from './push.service';

@Module({
  imports: [PushTokensModule],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}

