"use client";

import { useActionState, useState } from "react";
import {
  registerAction,
  signInAction,
  type AuthState,
} from "@/lib/auth-actions";

type Mode = "signin" | "register";

/** Email/password sign-in and registration form (local accounts). */
export function CredentialsForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const action = mode === "signin" ? signInAction : registerAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  const isRegister = mode === "register";

  return (
    <div className="space-y-4 text-left">
      <form action={formAction} className="space-y-3">
        {isRegister && (
          <Field
            label="Name"
            name="name"
            type="text"
            placeholder="Your name (optional)"
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder={isRegister ? "At least 8 characters" : "Your password"}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />

        {state.error && (
          <p
            role="alert"
            className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-primary px-6 py-3 font-bold text-white shadow-soft transition hover:bg-primary-strong disabled:opacity-60"
        >
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        {isRegister ? "Already have an account?" : "New to Game Checker?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isRegister ? "signin" : "register")}
          className="font-bold text-primary-strong hover:underline"
        >
          {isRegister ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink-soft">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20"
      />
    </label>
  );
}
