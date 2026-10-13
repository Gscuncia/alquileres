"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/design-system";

interface SignInFormProps {
  callbackUrl: string;
}

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: true,
    });

    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-section">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface-card p-8 shadow-card">
        <h1 className="text-display-sm font-semibold text-ink">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          Acceso administrativo de Alquileres Anita
        </p>

        {error && (
          <p className="mt-4 text-body-sm text-primary-error-text">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-caption-sm font-medium text-ink"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-sm border border-hairline bg-canvas px-3 py-3 text-body-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-caption-sm font-medium text-ink"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-sm border border-hairline bg-canvas px-3 py-3 text-body-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button type="submit" block>
            Ingresar
          </Button>
        </form>
      </div>
    </main>
  );
}
