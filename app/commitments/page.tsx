"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Commitment = {
  id: string;
  name: string;
  category: string;
  amount: number;
  due_day: number | null;
  active: boolean;
};

const commitmentCategories = [
  { name: "Loan", icon: "💳" },
  { name: "Kereta", icon: "🚗" },
  { name: "Motor", icon: "🏍️" },
  { name: "Telefon", icon: "📱" },
  { name: "Internet", icon: "🌐" },
  { name: "Insurance / Takaful", icon: "🛡️" },
  { name: "Subscription", icon: "📺" },
  { name: "Rumah", icon: "🏠" },
  { name: "Lain-lain", icon: "📦" },
];

export default function CommitmentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [commitments, setCommitments] = useState<Commitment[]>(
    []
  );

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Loan");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");

  const [error, setError] = useState("");

  // =========================
  // START
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

      await loadCommitments();

      setLoading(false);
    }

    start();
  }, [router]);

  // =========================
  // LOAD COMMITMENTS
  // =========================

  async function loadCommitments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("fixed_commitments")
      .select(
        "id, name, category, amount, due_day, active"
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Load commitments error:",
        error
      );

      setError(
        `Tak dapat load komitmen: ${error.message}`
      );

      return;
    }

    setCommitments(data ?? []);
  }

  // =========================
  // ADD COMMITMENT
  // =========================

  async function addCommitment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const numericAmount = Number(amount);

    const numericDueDay =
      dueDay.trim() === ""
        ? null
        : Number(dueDay);

    if (!name.trim()) {
      setError("Masukkan nama komitmen.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Masukkan jumlah bulanan yang sah.");
      return;
    }

    if (
      numericDueDay !== null &&
      (!Number.isInteger(numericDueDay) ||
        numericDueDay < 1 ||
        numericDueDay > 31)
    ) {
      setError(
        "Tarikh bayaran mestilah antara 1 hingga 31."
      );
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sesi login telah tamat.");
      setSaving(false);
      router.replace("/login");
      return;
    }

    const { error: insertError } = await supabase
      .from("fixed_commitments")
      .insert({
        user_id: user.id,
        name: name.trim(),
        category,
        amount: numericAmount,
        due_day: numericDueDay,
        active: true,
      });

    if (insertError) {
      console.error(
        "Insert commitment error:",
        insertError
      );

      setError(
        `Komitmen tak berjaya disimpan: ${insertError.message}`
      );

      setSaving(false);
      return;
    }

    setName("");
    setCategory("Loan");
    setAmount("");
    setDueDay("");

    await loadCommitments();

    setSaving(false);
  }

  // =========================
  // TOGGLE ACTIVE
  // =========================

  async function toggleCommitment(
    commitment: Commitment
  ) {
    const { error } = await supabase
      .from("fixed_commitments")
      .update({
        active: !commitment.active,
      })
      .eq("id", commitment.id);

    if (error) {
      console.error(
        "Toggle commitment error:",
        error
      );

      setError(
        `Tak dapat ubah status: ${error.message}`
      );

      return;
    }

    await loadCommitments();
  }

  // =========================
  // DELETE
  // =========================

  async function deleteCommitment(
    id: string
  ) {
    const confirmed = window.confirm(
      "Padam komitmen ini?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("fixed_commitments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Delete commitment error:",
        error
      );

      setError(
        `Tak dapat padam komitmen: ${error.message}`
      );

      return;
    }

    await loadCommitments();
  }

  // =========================
  // TOTAL
  // =========================

  const activeCommitments =
    commitments.filter(
      (item) => item.active
    );

  const totalCommitments =
    activeCommitments.reduce(
      (total, item) =>
        total + Number(item.amount),
      0
    );

  // =========================
  // GET ICON
  // =========================

  function getIcon(categoryName: string) {
    return (
      commitmentCategories.find(
        (item) => item.name === categoryName
      )?.icon ?? "📦"
    );
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-center">

          <div className="text-4xl">
            💳
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            Memuatkan komitmen...
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

        <header className="mb-6 flex items-center justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              BELANJAKU
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Komitmen
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

        </header>

        {/* TOTAL CARD */}

        <section className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-xl">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative">

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
              Komitmen Bulanan
            </p>

            <p className="mt-2 text-4xl font-bold">
              RM {totalCommitments.toFixed(2)}
            </p>

            <p className="mt-2 text-xs text-white/50">
              {activeCommitments.length} komitmen aktif
            </p>

          </div>

        </section>

        {/* ADD FORM */}

        <section className="mt-5 rounded-[24px] border border-neutral-200 bg-white p-5 shadow-sm">

          <h2 className="text-lg font-bold">
            Tambah Komitmen
          </h2>

          <p className="mt-1 text-xs text-neutral-400">
            Contoh: loan, kereta, telefon atau internet.
          </p>

          <form
            onSubmit={addCommitment}
            className="mt-5"
          >

            {/* NAME */}

            <label className="text-xs font-medium text-neutral-500">
              Nama Komitmen
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Contoh: Agrobank"
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
            />

            {/* CATEGORY */}

            <label className="mt-5 block text-xs font-medium text-neutral-500">
              Kategori
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
            >
              {commitmentCategories.map(
                (item) => (
                  <option
                    key={item.name}
                    value={item.name}
                  >
                    {item.icon} {item.name}
                  </option>
                )
              )}
            </select>

            {/* AMOUNT */}

            <label className="mt-5 block text-xs font-medium text-neutral-500">
              Jumlah Bulanan
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="0.00"
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-2xl font-bold outline-none focus:border-neutral-900"
            />

            {/* DUE DAY */}

            <label className="mt-5 block text-xs font-medium text-neutral-500">
              Tarikh Bayaran
            </label>

            <div className="mt-2 flex items-center gap-3">

              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(event) =>
                  setDueDay(event.target.value)
                }
                placeholder="5"
                className="w-24 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center outline-none focus:border-neutral-900"
              />

              <span className="text-sm text-neutral-400">
                haribulan setiap bulan
              </span>

            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">

                <p className="break-words text-xs font-medium text-red-600">
                  ❌ {error}
                </p>

              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-neutral-900 py-4 font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : "Simpan Komitmen"}
            </button>

          </form>

        </section>

        {/* COMMITMENT LIST */}

        <section className="mt-7">

          <div className="mb-3">

            <h2 className="text-lg font-bold">
              Komitmen Saya
            </h2>

            <p className="mt-1 text-xs text-neutral-400">
              Komitmen aktif akan ditolak daripada income.
            </p>

          </div>

          <div className="rounded-[24px] border border-neutral-200 bg-white px-4 shadow-sm">

            {commitments.length === 0 ? (
              <div className="py-10 text-center">

                <div className="text-3xl">
                  💳
                </div>

                <p className="mt-3 text-sm font-semibold">
                  Belum ada komitmen
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  Tambah komitmen pertama anda di atas.
                </p>

              </div>
            ) : (
              commitments.map(
                (commitment) => (
                  <div
                    key={commitment.id}
                    className={`border-b border-neutral-100 py-4 last:border-0 ${
                      !commitment.active
                        ? "opacity-50"
                        : ""
                    }`}
                  >

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-lg">
                        {getIcon(
                          commitment.category
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-semibold">
                          {commitment.name}
                        </p>

                        <p className="mt-1 text-[11px] text-neutral-400">
                          {commitment.category}

                          {commitment.due_day
                            ? ` · Bayar ${commitment.due_day}hb`
                            : ""}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-sm font-bold">
                          RM{" "}
                          {Number(
                            commitment.amount
                          ).toFixed(2)}
                        </p>

                        <p className="text-[10px] text-neutral-400">
                          / bulan
                        </p>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="mt-3 flex gap-2 pl-14">

                      <button
                        type="button"
                        onClick={() =>
                          toggleCommitment(
                            commitment
                          )
                        }
                        className="rounded-xl bg-neutral-100 px-3 py-2 text-[11px] font-semibold"
                      >
                        {commitment.active
                          ? "Pause"
                          : "Aktifkan"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCommitment(
                            commitment.id
                          )
                        }
                        className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600"
                      >
                        Padam
                      </button>

                    </div>

                  </div>
                )
              )
            )}

          </div>

        </section>

        {/* BACK BUTTON */}

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