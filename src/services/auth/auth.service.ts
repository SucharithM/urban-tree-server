import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { authConfig } from "../../config/auth.config";
import { AuthUserPayload } from "../../types/auth";
import { getUserByEmail } from "../user/user.service";

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthUserPayload | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export function generateAuthToken(user: AuthUserPayload): string {
  const payload = {
    sub: user.id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.jwtExpiresIn,
  });
}
