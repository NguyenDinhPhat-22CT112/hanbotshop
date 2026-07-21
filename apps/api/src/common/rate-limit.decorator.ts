import { SetMetadata } from '@nestjs/common';

export const skipRateLimitMetadataKey = 'skipRateLimit';

export const SkipRateLimit = () => SetMetadata(skipRateLimitMetadataKey, true);
