"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Income = {
  id: string;
  name: string;
  amount: number;
  income_date: string;
};

export default function IncomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [income, setIncome] = useState<Income[]>([]);

  const [name, setName] = useState("Gaji");
  const [amount, setAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [error, setError] = useState("");

  // =========================
  // CHECK LOGIN
  // =========================

  useEffect(() => {
    async function start() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await loadIncome();

      setLoading(false);
    }

    start();
  }, [router]);

  // =========================
  // LOAD INCOME
  // =========================

  async function loadIncome() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    console.log("INCOME USER:", user.id);
    console.log("INCOME EMAIL:", user.email);

    const { data, error } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", user.id)
      .order("income_date", {
        ascending: false,
      });

    console.log("INCOME LOAD DATA:", data);
    console.log("INCOME LOAD ERROR:", error);

    if (error) {
      setError(
        `Load error: ${error.message}`
      );
      return;
    }

    setIncome(data ?? []);
  }

  // =========================
  // ADD INCOME
  // =========================

  async function addIncome(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    if (!name.trim()) {
      setError("Nama income tak boleh kosong.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Jumlah income tak sah.");
      return;
    }

    if (!incomeDate) {
      setError("Sila pilih tarikh.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log("INSERT USER:", user?.id);
    console.log("INSERT USER ERROR:", userError);

    if (userError) {
      setError(
        `User error: ${userError.message}`
      );
      setSaving(false);
      return;
    }

    if (!user) {
      setError("Tiada user login.");
      setSaving(false);
      return;
    }

    const incomeData = {
      user_id: user.id,
      name: name.trim(),
      amount: numericAmount,
      income_date: incomeDate,
    };

    console.log(
      "DATA YANG NAK INSERT:",
      incomeData
    );

    const {
      data: insertedData,
      error: insertError,
    } = await supabase
      .from("income")
      .insert(incomeData)
      .select()
      .single();

    console.log(
      "INSERTED DATA:",
      insertedData
    );

    console.log(
      "INSERT ERROR:",
      insertError
    );

    if (insertError) {
      setError(
        `SUPABASE ERROR: ${insertError.message}`
      );

      setSaving(false);
      return;
    }

    // Berjaya
    setAmount("");
    setName("Gaji");

    await loadIncome();

    setSaving(false);
  }

  // =========================
  // TOTAL
  // =========================

  const totalIncome = income.reduce(
    (total, item) =>
      total + Number(item.amount),
    0
  );

  // =========================
  // DATE
  // =========================

  function formatDate(dateString: string) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString("ms-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="text-4xl">
            💰
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            Memuatkan income...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 text-neutral-900">

      <div className="mx-auto w-full max-w-2xl">

        {/* HEADER */}

        <div className="mb-6 flex items-center justify-between">

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              BELANJAKU
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Income
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Dashboard
          </button>

        </div>

        {/* TOTAL */}

        <section className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-xl">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative">

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
              Total Income
            </p>

            <p className="mt-2 text-4xl font-bold">
              RM {totalIncome.toFixed(2)}
            </p>

          </div>

        </section>

        {/* FORM */}

        <section className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-5 shadow-sm">

          <h2 className="text-lg font-bold">
            Tambah Income
          </h2>

          <p className="mt-1 text-xs text-neutral-400">
            Masukkan income seperti gaji atau side income.
          </p>

          <form
            onSubmit={addIncome}
            className="mt-5"
          >

            {/* NAME */}

            <label className="text-xs font-medium text-neutral-500">
              Nama Income
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Contoh: Gaji"
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
            />

            {/* AMOUNT */}

            <label className="mt-5 block text-xs font-medium text-neutral-500">
              Jumlah
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="1700"
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-2xl font-bold outline-none focus:border-neutral-900"
            />

            {/* DATE */}

            <label className="mt-5 block text-xs font-medium text-neutral-500">
              Tarikh
            </label>

            <input
              type="date"
              value={incomeDate}
              onChange={(event) =>
                setIncomeDate(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
            />

            {/* ERROR */}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">

                <p className="text-xs font-bold text-red-600">
                  ❌ Ada masalah
                </p>

                <p className="mt-2 break-words text-xs text-red-600">
                  {error}
                </p>

              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-neutral-900 py-4 font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan Income"}
            </button>

          </form>

        </section>

        {/* HISTORY */}

        <section className="mt-7">

          <h2 className="text-lg font-bold">
            Income History
          </h2>

          <div className="mt-3 rounded-[24px] border border-neutral-200 bg-white px-4 shadow-sm">

            {income.length === 0 ? (
              <div className="py-10 text-center">

                <div className="text-3xl">
                  💰
                </div>

                <p className="mt-3 text-sm font-semibold">
                  Belum ada income
                </p>

              </div>
            ) : (
              income.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-neutral-100 py-4 last:border-0"
                >

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100">
                    💰
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {formatDate(
                        item.income_date
                      )}
                    </p>

                  </div>

                  <p className="text-sm font-bold text-green-600">
                    + RM{" "}
                    {Number(item.amount).toFixed(2)}
                  </p>

                </div>
              ))
            )}

          </div>

        </section>

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          className="mt-6 w-full rounded-2xl border border-neutral-200 bg-white py-4 text-sm font-bold shadow-sm"
        >
          ← Kembali ke Dashboard
        </button>

      </div>

    </main>
  );
}