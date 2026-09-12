import { registerAs } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, normalize } from 'path';

const SECRETS_DIR = resolve(process.env.JWT_SECRETS_DIR ?? join(process.cwd(), 'secrets'));

export const jwtConfig = registerAs('jwt', () => {
  const decodeKey = (envVar: string, filePath: string): string => {
    const val = process.env[envVar];
    if (val) {
      // Explicit PEM text is used as-is; everything else is treated as base64
      if (val.includes('-----BEGIN')) {
        return val.replace(/\\n/g, '\n');
      }
      const decoded = Buffer.from(val, 'base64').toString('utf-8');
      if (!decoded.includes('-----BEGIN')) {
        throw new Error(`${envVar} is neither a PEM key nor base64-encoded PEM`);
      }
      return decoded;
    }

    const explicitFile = process.env[`${envVar}_FILE`];
    const targetFile = explicitFile ?? filePath;
    const fullPath = resolve(SECRETS_DIR, targetFile);
    const normalized = normalize(fullPath);
    if (!normalized.startsWith(SECRETS_DIR + normalize.sep) && normalized !== SECRETS_DIR) {
      throw new Error(`${envVar}_FILE path escapes the configured secrets directory`);
    }
    if (!existsSync(normalized)) {
      throw new Error(`${envVar}_FILE not found: ${normalized}`);
    }
    try {
      return readFileSync(normalized, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read ${envVar}_FILE: ${(err as Error).message}`);
    }
  };

  return {
    privateKey: decodeKey('JWT_PRIVATE_KEY', 'private.pem'),
    publicKey: decodeKey('JWT_PUBLIC_KEY', 'public.pem'),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h',
  };
});