import { registerAs } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';

export const jwtConfig = registerAs('jwt', () => {
  const tryReadFile = (envVar: string, filePath: string): string => {
    const val = process.env[envVar];
    if (val) {
      try {
        return Buffer.from(val, 'base64').toString('utf-8');
      } catch {
        return val;
      }
    }
    try {
      return readFileSync(join(process.cwd(), filePath), 'utf-8');
    } catch {
      return '';
    }
  };

  return {
    privateKey: tryReadFile('JWT_PRIVATE_KEY', 'private.pem'),
    publicKey: tryReadFile('JWT_PUBLIC_KEY', 'public.pem'),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h',
  };
});
