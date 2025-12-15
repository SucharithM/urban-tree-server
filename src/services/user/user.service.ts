import bcrypt from "bcryptjs";

import { supabase } from "../../config/supabase.client";
import { UserRole, UserRow } from "../../types/user";

export type CreateUserInput = {
  email: string;
  password: string;
  role?: UserRole;
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
  role?: UserRole;
};

const USER_TABLE = "User";

export async function getUserById(id: number): Promise<UserRow | null> {
  const { data, error } = await supabase.from(USER_TABLE).select("*").eq("id", id).single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data as UserRow;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select("*")
    .ilike("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch user by email: ${error.message}`);
  }

  return data as UserRow;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const hashed = await bcrypt.hash(input.password, 10);

  const { data, error } = await supabase
    .from(USER_TABLE)
    .insert({
      email: input.email.toLowerCase(),
      passwordHash: hashed,
      role: input.role ?? "VIEWER",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as UserRow;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<UserRow> {
  const patch: Record<string, any> = {};

  if (input.email) {
    patch.email = input.email.toLowerCase();
  }

  if (input.password) {
    patch.passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (input.role) {
    patch.role = input.role;
  }

  if (Object.keys(patch).length === 0) {
    const user = await getUserById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  const { data, error } = await supabase
    .from(USER_TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data as UserRow;
}

export async function deleteUser(id: number): Promise<void> {
  const { error } = await supabase.from(USER_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return (data ?? []) as UserRow[];
}
