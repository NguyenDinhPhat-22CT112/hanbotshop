import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const keyLength = 64;

@Injectable()
export class PasswordService {
  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
  }

  async verifyPassword(password: string, passwordHash: string) {
    const [algorithm, salt, storedKey] = passwordHash.split('$');

    if (algorithm !== 'scrypt' || !salt || !storedKey) {
      return false;
    }

    const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
    const storedBuffer = Buffer.from(storedKey, 'base64url');

    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, storedBuffer);
  }
}
