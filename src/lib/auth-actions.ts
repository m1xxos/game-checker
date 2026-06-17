"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface AuthState {
  error?: string;
}

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Create a local account, then sign the user in. */
export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: (formData.get("name") as string) || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: { email, name: parsed.data.name ?? null, passwordHash },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/welcome",
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Could not sign in" };
    throw err; // re-throw the redirect
  }
  return {};
}

/** Sign in with an existing local account. */
export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  try {
    await signIn("credentials", {
      email: (formData.get("email") as string)?.toLowerCase(),
      password: formData.get("password"),
      redirectTo: "/welcome",
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Invalid email or password" };
    throw err; // re-throw the redirect
  }
  return {};
}
