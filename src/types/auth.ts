import { UserRole } from "./user";

export interface AuthUserPayload {
  id: number;
  email: string;
  role: UserRole;
}
