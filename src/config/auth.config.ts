require("dotenv").config();
import type { StringValue } from "ms";
const JWT_SECRET = process.env.AUTH_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("AUTH_JWT_SECRET env var is required for JWT signing");
}
const JWT_EXPIRES_IN: string | number = process.env.AUTH_JWT_EXPIRES_IN ?? "24h";

export const authConfig = {
  jwtSecret: JWT_SECRET,
  jwtExpiresIn: JWT_EXPIRES_IN as StringValue,
};
