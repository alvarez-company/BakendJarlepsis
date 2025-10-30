import { SetMetadata } from '@nestjs/common';

export const Origin = (origin: 'user' | 'query' | 'body') => SetMetadata('origin', origin);

