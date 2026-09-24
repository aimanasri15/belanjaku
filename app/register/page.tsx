"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent) {
    event.preventDefault();

    setError("");

    if (password.length < 6) {
      setError("Password mesti sekurang-kurangnya 6 aksara.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak sama.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-900 text-3xl shadow-lg">
            💰
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            BelanjaKu
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Mula urus perbelanjaan dengan lebih mudah.
          </p>

        </div>

        {/* CARD */}
        <div className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">

          <div className="mb-6">

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              New account
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Daftar akaun
            </h2>

          </div>

          <form onSubmit={handleRegister}>

            {/* EMAIL */}
            <label className="text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="contoh@email.com"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none transition focus:border-neutral-900"
            />

            {/* PASSWORD */}
            <label className="mt-5 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 6 aksara"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none transition focus:border-neutral-900"
            />

            {/* CONFIRM PASSWORD */}
            <label className="mt-5 block text-sm font-medium">
              Ulang password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Masukkan semula password"
              required
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none transition focus:border-neutral-900"
            />

            {/* ERROR */}
            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-neutral-900 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Mencipta akaun..."
                : "Daftar Akaun"}
            </button>

          </form>

          <div className="my-6 flex items-center gap-3">

            <div className="h-px flex-1 bg-neutral-200" />

            <span className="text-xs text-neutral-400">
              atau
            </span>

            <div className="h-px flex-1 bg-neutral-200" />

          </div>

          {/* GOOGLE */}
          <button
            type="button"
            className="w-full rounded-2xl border border-neutral-200 bg-white py-4 font-semibold transition hover:bg-neutral-50"
          >
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Dah ada akaun?

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="ml-1 font-semibold text-neutral-900"
            >
              Log in
            </button>

          </p>

        </div>

      </div>
    </main>
  );
}