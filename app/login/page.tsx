"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const REMEMBER_EMAIL_KEY = "belanjaku-remember-email";
const REMEMBER_ME_KEY = "belanjaku-remember-me";

export default function LoginPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================
  // CLIENT MOUNT
  // =========================

  useEffect(() => {
    setMounted(true);
  }, []);

  // =========================
  // LOAD SESSION + REMEMBER ME
  // =========================

  useEffect(() => {
    if (!mounted) return;

    let active = true;

    async function initializeLogin() {
      try {
        const savedEmail =
          localStorage.getItem(
            REMEMBER_EMAIL_KEY
          );

        const savedRememberMe =
          localStorage.getItem(
            REMEMBER_ME_KEY
          );

        if (active) {
          if (savedEmail) {
            setEmail(savedEmail);
          }

          if (savedRememberMe !== null) {
            setRememberMe(
              savedRememberMe === "true"
            );
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session) {
          router.replace("/dashboard");
          return;
        }

        setCheckingSession(false);
      } catch (err) {
        console.error(
          "Login initialization error:",
          err
        );

        if (active) {
          setCheckingSession(false);
        }
      }
    }

    initializeLogin();

    return () => {
      active = false;
    };
  }, [mounted, router]);

  // =========================
  // LOGIN
  // =========================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Sila masukkan email.");
      return;
    }

    if (!password) {
      setError("Sila masukkan password.");
      return;
    }

    setLoading(true);

    try {
      const {
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        console.error(
          "Login error:",
          loginError
        );

        setError(
          "Email atau password tidak betul."
        );

        setLoading(false);
        return;
      }

      // =========================
      // REMEMBER EMAIL
      // =========================

      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_EMAIL_KEY,
          cleanEmail
        );

        localStorage.setItem(
          REMEMBER_ME_KEY,
          "true"
        );
      } else {
        localStorage.removeItem(
          REMEMBER_EMAIL_KEY
        );

        localStorage.setItem(
          REMEMBER_ME_KEY,
          "false"
        );
      }

      // =========================
      // GO DASHBOARD
      // =========================

      router.replace("/dashboard");
    } catch (err) {
      console.error(
        "Unexpected login error:",
        err
      );

      setError(
        "Sesuatu telah berlaku. Cuba lagi."
      );

      setLoading(false);
    }
  }

  // =========================
  // INITIAL HYDRATION
  // =========================

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-900 text-3xl shadow-lg">
            💰
          </div>

          <p className="mt-4 text-sm font-medium text-neutral-500">
            Membuka BelanjaKu...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // CHECKING EXISTING SESSION
  // =========================

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-900 text-3xl shadow-lg">
            💰
          </div>

          <p className="mt-4 text-sm font-medium text-neutral-500">
            Semak sesi login...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // LOGIN PAGE
  // =========================

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900">

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">

        <div className="w-full">

          {/* LOGO */}

          <div className="mb-8 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-neutral-900 text-4xl shadow-xl">
              💰
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight">
              BelanjaKu
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Urus belanja. Kawal kewangan.
            </p>

          </div>

          {/* LOGIN CARD */}

          <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-xl sm:p-8">

            <div className="mb-6">

              <h2 className="text-xl font-bold">
                Selamat datang 👋
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Log masuk ke akaun BelanjaKu anda.
              </p>

            </div>

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="contoh@email.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setError(
                        "Fungsi lupa password akan kita sambungkan selepas ini."
                      );
                    }}
                    className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
                  >
                    Lupa password?
                  </button>

                </div>

                <div className="relative">

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-14 text-sm outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tunjukkan password"
                    }
                  >
                    {showPassword
                      ? "🙈"
                      : "👁️"}
                  </button>

                </div>

              </div>

              {/* REMEMBER ME */}

              <label className="flex cursor-pointer items-center gap-3 select-none">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-neutral-300 accent-neutral-900"
                />

                <span className="text-sm font-medium text-neutral-700">
                  Remember me
                </span>

              </label>

              {/* ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sedang log masuk...
                  </>
                ) : (
                  "Log masuk"
                )}
              </button>

            </form>

            {/* DIVIDER */}

            <div className="my-6 flex items-center gap-3">

              <div className="h-px flex-1 bg-neutral-100" />

              <span className="text-xs text-neutral-400">
                atau
              </span>

              <div className="h-px flex-1 bg-neutral-100" />

            </div>

            {/* REGISTER */}

            <button
              type="button"
              onClick={() =>
                router.push("/register")
              }
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Daftar akaun baru
            </button>

          </section>

          <p className="mt-6 text-center text-xs text-neutral-400">
            © 2026 BelanjaKu
          </p>

        </div>

      </div>

    </main>
  );
}