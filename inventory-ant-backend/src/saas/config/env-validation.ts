import { Logger } from '@nestjs/common';

export function validateEnv() {
  const logger = new Logger('EnvValidation');
  const mandatoryVars = [
    'DATABASE_URL',
    'GEMINI_API_KEY',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
  ];

  const missing = mandatoryVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error('CRITICAL STARTUP ERROR: Missing mandatory environment variables:');
    missing.forEach((v) => {
      logger.error(`  - ${v}`);
    });
    logger.error('Please verify your .env file or configuration provider.');
    process.exit(1);
  }

  logger.log('Environment variables validated successfully.');
}
