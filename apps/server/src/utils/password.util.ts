import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export class PasswordUtil {
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
