type Environment = Record<string, string | undefined>;

export function validateEnv(config: Environment) {
  const required = ['DATABASE_URL', 'JWT_SECRET'];

  const storageConfigured = [
    'CLOUD_STORAGE_ENDPOINT',
    'CLOUD_STORAGE_BUCKET',
    'CLOUD_STORAGE_ACCESS_KEY_ID',
    'CLOUD_STORAGE_SECRET_ACCESS_KEY'
  ].some((key) => config[key]?.trim());

  if (storageConfigured || config.NODE_ENV === 'production') {
    required.push(
      'CLOUD_STORAGE_ENDPOINT',
      'CLOUD_STORAGE_BUCKET',
      'CLOUD_STORAGE_ACCESS_KEY_ID',
      'CLOUD_STORAGE_SECRET_ACCESS_KEY'
    );
  }

  const paymentProvider = config.PAYMENT_GATEWAY_PROVIDER?.trim() || 'manual_bank_transfer';

  if (paymentProvider === 'manual_bank_transfer' && config.NODE_ENV === 'production') {
    required.push(
      'BANK_TRANSFER_BANK_NAME',
      'BANK_TRANSFER_ACCOUNT_NUMBER',
      'BANK_TRANSFER_ACCOUNT_NAME'
    );
  } else if (paymentProvider !== 'manual_bank_transfer') {
    required.push('PAYMENT_GATEWAY_WEBHOOK_SECRET');
  }

  const missing = required.filter((key) => !config[key]?.trim());

  const emailProvider = config.EMAIL_PROVIDER?.trim() || (config.NODE_ENV === 'production' ? 'resend' : 'log');
  if (config.NODE_ENV === 'production' && emailProvider === 'resend') {
    for (const key of ['RESEND_API_KEY', 'EMAIL_FROM']) {
      if (!config[key]?.trim()) missing.push(key);
    }
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.JWT_SECRET === 'change-me') {
    throw new Error('JWT_SECRET must be changed.');
  }

  return config;
}
