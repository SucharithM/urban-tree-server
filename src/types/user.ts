export type UserRole = "ADMIN" | "VIEWER";

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}
