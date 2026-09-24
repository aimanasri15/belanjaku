"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  name: string;
  category: string;
  icon: string;
  amount: number;
  date: string;
  expenseDate: string;
  receipt_url?: string | null;
};

type ReceiptItem = {
  name: string;
  quantity: number;
  price: number;
  category: string;
};

type AIReceiptResult = {
  merchant: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  receiptUrl?: string;
};

const categories = [
  {
    name: "Makan & Minum",
    icon: "🍔",
  },
  {
    name: "Anak",
    icon: "👶",
  },
  {
    name: "Minyak",
    icon: "⛽",
  },
  {
    name: "Rumah",
    icon: "🏠",
  },
  {
    name: "Kereta",
    icon: "🚗",
  },
  {
    name: "Shopping",
    icon: "🛍️",
  },
  {
    name: "Komitmen",
    icon: "💳",
  },
  {
    name: "Lain-lain",
    icon: "📦",
  },
];

export default function Dashboard() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  // =========================
  // AUTH / LOADING
  // =========================

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [loadingExpenses, setLoadingExpenses] =
    useState(true);

  const [loadingIncome, setLoadingIncome] =
    useState(true);

  const [
    loadingCommitments,
    setLoadingCommitments,
  ] = useState(true);

  // =========================
  // DATA
  // =========================

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [totalIncome, setTotalIncome] =
    useState(0);

  const [
    incomeRecords,
    setIncomeRecords,
  ] = useState<
    { amount: number; income_date: string }[]
  >([]);

  const [
    totalCommitments,
    setTotalCommitments,
  ] = useState(0);

  // =========================
  // UI
  // =========================

  const [
    showAddExpense,
    setShowAddExpense,
  ] = useState(false);

  const [
    showProfileMenu,
    setShowProfileMenu,
  ] = useState(false);

  // =========================
  // MONTH FILTER
  // =========================

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 7)
  );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // =========================
  // EXPENSE FORM
  // =========================

  const [amount, setAmount] =
    useState("");

  const [category, setCategory] =
    useState("Makan & Minum");

  const [note, setNote] =
    useState("");

  const [
    expenseDate,
    setExpenseDate,
  ] = useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  // =========================
  // RECEIPT
  // =========================

  const [receiptFile, setReceiptFile] =
    useState<File | null>(null);

  const [
    receiptPreview,
    setReceiptPreview,
  ] = useState<string | null>(null);

  const [
    uploadingReceipt,
    setUploadingReceipt,
  ] = useState(false);

  const [
    scanningReceipt,
    setScanningReceipt,
  ] = useState(false);

  const [
    aiResult,
    setAiResult,
  ] = useState<AIReceiptResult | null>(
    null
  );

  const [
    showAiResult,
    setShowAiResult,
  ] = useState(false);

  // =========================
  // RECEIPT DETAIL
  // =========================

  const [
    selectedTransaction,
    setSelectedTransaction,
  ] = useState<Transaction | null>(null);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<string | null>(null);

  const [
    receiptDetailItems,
    setReceiptDetailItems,
  ] = useState<ReceiptItem[]>([]);

  const [
    loadingReceiptDetail,
    setLoadingReceiptDetail,
  ] = useState(false);

  // =========================
  // EDIT / DELETE EXPENSE
  // =========================

  const [showEditExpense, setShowEditExpense] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("Makan & Minum");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // =========================
  // SEARCH / FILTER TRANSACTIONS
  // =========================

  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionCategoryFilter, setTransactionCategoryFilter] = useState("Semua");

  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  // =========================
  // APP SETTINGS
  // =========================

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("belanjaku-theme");
    setDarkMode(savedTheme === "dark");
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    window.localStorage.setItem("belanjaku-theme", next ? "dark" : "light");
  }

  function exportTransactionsCSV() {
    const rows = filteredTransactions.map((item) => ({
      Tarikh: item.expenseDate,
      Nama: item.name,
      Kategori: item.category,
      Jumlah: item.amount.toFixed(2),
      Resit: item.receipt_url ?? "",
    }));

    const headers = Object.keys(rows[0] ?? { Tarikh: "", Nama: "", Kategori: "", Jumlah: "", Resit: "" });
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => {
        const value = String(row[header as keyof typeof row] ?? "").replace(/"/g, '""');
        return `"${value}"`;
      }).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `belanjaku-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }


  // =========================
  // START DASHBOARD
  // =========================

  useEffect(() => {
    async function startDashboard() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);

      await Promise.all([
        loadExpenses(),
        loadIncome(),
        loadCommitments(),
        loadBudget(),
      ]);
    }

    startDashboard();
  }, [router]);

  // =========================
  // LOAD EXPENSES
  // =========================

  async function loadExpenses() {
    setLoadingExpenses(true);

    const {
      data,
      error,
    } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Load expenses error:",
        error
      );

      setError(
        "Tak dapat mengambil data belanja."
      );

      setLoadingExpenses(false);

      return;
    }

    const formattedTransactions: Transaction[] =
      (data ?? []).map(
        (expense) => ({
          id: expense.id,
          name: expense.name,
          category:
            expense.category,
          icon: getCategoryIcon(
            expense.category
          ),
          amount: Number(
            expense.amount
          ),
          date: formatDate(
            expense.expense_date
          ),
          expenseDate:
            expense.expense_date,
          receipt_url:
            expense.receipt_url,
        })
      );

    setTransactions(
      formattedTransactions
    );

    setLoadingExpenses(false);
  }

  // =========================
  // LOAD INCOME
  // =========================

  async function loadIncome() {
    setLoadingIncome(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setLoadingIncome(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("income")
      .select("amount, income_date")
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Load income error:",
        error
      );

      setLoadingIncome(false);

      return;
    }

    const records =
      (data ?? []).map((item) => ({
        amount: Number(item.amount),
        income_date:
          item.income_date,
      }));

    setIncomeRecords(records);

    const total =
      records
        .filter(
          (item) =>
            item.income_date?.slice(0, 7) ===
            selectedMonth
        )
        .reduce(
          (sum, item) =>
            sum + item.amount,
          0
        );

    setTotalIncome(total);

    setLoadingIncome(false);
  }

  // =========================
  // LOAD COMMITMENTS
  // =========================

  async function loadCommitments() {
    setLoadingCommitments(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setLoadingCommitments(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("fixed_commitments")
      .select("amount")
      .eq("user_id", user.id)
      .eq("active", true);

    if (error) {
      console.error(
        "Load commitments error:",
        error
      );

      setLoadingCommitments(false);

      return;
    }

    const total =
      (data ?? []).reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

    setTotalCommitments(total);

    setLoadingCommitments(false);
  }

  // =========================
  // MONTHLY BUDGET
  // =========================

  async function loadBudget() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("monthly_budgets")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .maybeSingle();

    if (error) {
      console.error("Load budget error:", error);
      return;
    }

    setMonthlyBudget(Number(data?.amount ?? 0));
  }

  async function saveMonthlyBudget() {
    const numericBudget = Number(budgetInput);

    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      setError("Masukkan jumlah budget yang sah.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSavingBudget(true);
    setError("");

    const { error: upsertError } = await supabase
      .from("monthly_budgets")
      .upsert(
        {
          user_id: user.id,
          month: selectedMonth,
          amount: numericBudget,
        },
        { onConflict: "user_id,month" }
      );

    if (upsertError) {
      console.error("Save budget error:", upsertError);
      setError("Budget tak berjaya disimpan. Cuba lagi.");
      setSavingBudget(false);
      return;
    }

    setMonthlyBudget(numericBudget);
    setShowBudgetEditor(false);
    setBudgetInput("");
    setSavingBudget(false);
  }

  async function clearMonthlyBudget() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setSavingBudget(true);

    const { error: deleteError } = await supabase
      .from("monthly_budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    if (deleteError) {
      console.error("Delete budget error:", deleteError);
      setError("Budget tak berjaya dipadam.");
    } else {
      setMonthlyBudget(0);
    }

    setSavingBudget(false);
  }

  // Refresh budget whenever the selected month changes.
  useEffect(() => {
    if (!checkingAuth) loadBudget();
  }, [selectedMonth, checkingAuth]);

  // =========================
  // LOGOUT
  // =========================

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  // =========================
  // CATEGORY ICON
  // =========================

  function getCategoryIcon(
    categoryName: string
  ) {
    return (
      categories.find(
        (category) =>
          category.name ===
          categoryName
      )?.icon ?? "📦"
    );
  }

  // =========================
  // FORMAT DATE
  // =========================

  function formatDate(
    dateString: string
  ) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    const today = new Date();

    const yesterday =
      new Date();

    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return "Today";
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString(
      "en-MY",
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  // =========================
  // SELECT RECEIPT
  // =========================

  function handleReceiptSelect(
    file: File | null
  ) {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Sila pilih fail gambar."
      );

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "Saiz gambar maksimum ialah 10MB."
      );

      return;
    }

    setError("");

    setReceiptFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setReceiptPreview(
      previewUrl
    );

    // Reset result lama
    setAiResult(null);
    setShowAiResult(false);
  }

  // =========================
  // AI RECEIPT SCANNER
  // =========================

  async function scanReceiptWithAI() {
    if (!receiptFile) {
      setError(
        "Pilih gambar resit dahulu."
      );

      return;
    }

    setError("");

    setScanningReceipt(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setError(
          "Sesi login telah tamat."
        );

        router.replace("/login");

        return;
      }

      // =========================
      // UPLOAD RECEIPT
      // =========================

      setUploadingReceipt(true);

      const fileExtension =
        receiptFile.name
          .split(".")
          .pop() || "jpg";

      const filePath =
        `${user.id}/scan-${crypto.randomUUID()}.${fileExtension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("receipts")
          .upload(
            filePath,
            receiptFile,
            {
              upsert: false,
              contentType:
                receiptFile.type,
            }
          );

      if (uploadError) {
  console.error("RECEIPT UPLOAD ERROR:", uploadError);

  setError(
    `UPLOAD ERROR: ${uploadError.message || "Unknown error"} | ${
      uploadError.name || "Unknown"
    }`
  );

  return;
}
      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from("receipts")
          .getPublicUrl(
            filePath
          );

      const imageUrl =
        publicUrlData.publicUrl;

      setUploadingReceipt(
        false
      );

      // =========================
      // SEND TO API
      // =========================

      const response =
        await fetch(
          "/api/receipt",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              imageUrl,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        console.error(
          "AI scan error:",
          result
        );

        setError(
          result.message ||
            "AI gagal membaca resit."
        );

        return;
      }

      console.log(
        "AI RESULT:",
        result.data
      );

      const parsedResult:
        AIReceiptResult = {
        ...result.data,
        receiptUrl: imageUrl,
      };

      setAiResult(
        parsedResult
      );

      setShowAiResult(
        true
      );

      // =========================
      // AUTO FILL
      // =========================

      if (
        result.data.total !=
        null
      ) {
        setAmount(
          String(
            result.data.total
          )
        );
      }

      if (
        result.data.merchant
      ) {
        setNote(
          result.data.merchant
        );
      }

      if (
        result.data.items
          ?.length > 0
      ) {
        setCategory(
          result.data.items[0]
            .category ||
            "Makan & Minum"
        );
      }
    } catch (error) {
      console.error(
        "Scan receipt error:",
        error
      );

      setError(
        "Sesuatu berlaku semasa AI membaca resit."
      );
    } finally {
      setScanningReceipt(
        false
      );

      setUploadingReceipt(
        false
      );
    }
  }

  // =========================
  // RECEIPT HELPERS
  // =========================

  function calculateAIItemsTotal(
    items: ReceiptItem[]
  ) {
    return Number(
      items
        .reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
              Number(item.quantity || 0),
          0
        )
        .toFixed(2)
    );
  }

  function getAIWarnings(
    result: AIReceiptResult
  ) {
    const warnings: string[] = [];

    if (!result.merchant.trim()) {
      warnings.push("Nama kedai tidak dapat dikenal pasti.");
    }

    if (!result.date) {
      warnings.push("Tarikh resit tidak dapat dikenal pasti.");
    }

    if (!result.items.length) {
      warnings.push("Tiada item berjaya dikenal pasti.");
    }

    const itemTotal = calculateAIItemsTotal(
      result.items
    );

    if (
      result.items.length > 0 &&
      Math.abs(itemTotal - Number(result.total)) > 0.05
    ) {
      warnings.push(
        `Jumlah item RM${itemTotal.toFixed(
          2
        )} tidak sama dengan total resit RM${Number(
          result.total
        ).toFixed(2)}.`
      );
    }

    if (
      !Number.isFinite(Number(result.total)) ||
      Number(result.total) <= 0
    ) {
      warnings.push("Jumlah resit tidak sah.");
    }

    return warnings;
  }

  async function openReceiptDetail(
    transaction: Transaction
  ) {
    setSelectedTransaction(transaction);
    setReceiptDetailItems([]);

    if (!transaction.receipt_url) {
      return;
    }

    setLoadingReceiptDetail(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("receipt_items")
        .select(
          "item_name, quantity, unit_price, total_price, category"
        )
        .eq(
          "expense_id",
          transaction.id
        )
        .order("created_at", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Load receipt detail error:",
          error
        );
        return;
      }

      setReceiptDetailItems(
        (data ?? []).map((item) => ({
          name: item.item_name,
          quantity: Number(item.quantity),
          price: Number(item.unit_price),
          category: item.category,
        }))
      );
    } finally {
      setLoadingReceiptDetail(false);
    }
  }

  // =========================
  // EDIT / DELETE EXPENSE
  // =========================

  function startEditExpense(transaction: Transaction) {
    setEditExpenseId(transaction.id);
    setEditName(transaction.name);
    setEditAmount(transaction.amount.toFixed(2));
    setEditCategory(transaction.category);
    setEditExpenseDate(transaction.expenseDate);
    setShowDeleteConfirm(false);
    setShowEditExpense(true);
  }

  function closeEditExpense() {
    if (savingEdit) return;
    setShowEditExpense(false);
    setEditExpenseId(null);
    setShowDeleteConfirm(false);
  }

  async function saveEditedExpense() {
    if (!editExpenseId) return;
    const numericAmount = Number(editAmount);

    if (!editName.trim()) {
      setError("Nama belanja tak boleh kosong.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Jumlah belanja tak sah.");
      return;
    }
    if (!editExpenseDate) {
      setError("Sila pilih tarikh belanja.");
      return;
    }

    setSavingEdit(true);
    setError("");

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        name: editName.trim(),
        category: editCategory,
        amount: numericAmount,
        expense_date: editExpenseDate,
      })
      .eq("id", editExpenseId);

    if (updateError) {
      console.error("Update expense error:", updateError);
      setError("Belanja tak berjaya dikemaskini. Cuba lagi.");
      setSavingEdit(false);
      return;
    }

    setSelectedTransaction((current) =>
      current && current.id === editExpenseId
        ? {
            ...current,
            name: editName.trim(),
            category: editCategory,
            icon: getCategoryIcon(editCategory),
            amount: numericAmount,
            expenseDate: editExpenseDate,
            date: formatDate(editExpenseDate),
          }
        : current
    );

    setShowEditExpense(false);
    setEditExpenseId(null);
    setSavingEdit(false);
    setError("");
    await loadExpenses();
  }

  async function deleteSelectedExpense() {
    if (!selectedTransaction) return;

    setDeletingExpense(true);
    setError("");
    const expenseId = selectedTransaction.id;

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (deleteError) {
      console.error("Delete expense error:", deleteError);
      setError("Belanja tak berjaya dipadam. Cuba lagi.");
      setDeletingExpense(false);
      return;
    }

    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== expenseId)
    );
    setSelectedTransaction(null);
    setReceiptDetailItems([]);
    setShowDeleteConfirm(false);
    setDeletingExpense(false);
    setError("");
  }

  // =========================
  // UPDATE AI ITEM
  // =========================

  function updateAIItem(
    index: number,
    field: keyof ReceiptItem,
    value: string
  ) {
    if (!aiResult) {
      return;
    }

    const updatedItems = [
      ...aiResult.items,
    ];

    const currentItem =
      updatedItems[index];

    if (!currentItem) {
      return;
    }

    let updatedValue:
      | string
      | number = value;

    if (
      field === "quantity" ||
      field === "price"
    ) {
      updatedValue = Number(value) || 0;
    }

    updatedItems[index] = {
      ...currentItem,
      [field]: updatedValue,
    };

    const newTotal =
      calculateAIItemsTotal(
        updatedItems
      );

    setAiResult({
      ...aiResult,
      items: updatedItems,
      total: newTotal,
    });

    setAmount(
      newTotal.toFixed(2)
    );
  }

  // =========================
  // REMOVE AI ITEM
  // =========================

  function removeAIItem(
    index: number
  ) {
    if (!aiResult) {
      return;
    }

    const updatedItems =
      aiResult.items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );

    const newTotal =
      calculateAIItemsTotal(
        updatedItems
      );

    setAiResult({
      ...aiResult,
      items: updatedItems,
      total: newTotal,
    });

    setAmount(
      newTotal.toFixed(2)
    );
  }

  // =========================
  // CONFIRM AI RESULT
  // =========================

  async function confirmAIReceipt() {
    if (!aiResult) {
      return;
    }

    const total =
      Number(aiResult.total);

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      setError(
        "Jumlah resit tidak sah."
      );

      return;
    }

    setAmount(
      total.toFixed(2)
    );

    setNote(
      aiResult.merchant ||
        "Belanja resit"
    );

    if (aiResult.date) {
      setExpenseDate(
        aiResult.date
      );
    }

    if (
      aiResult.items.length >
      0
    ) {
      setCategory(
        aiResult.items[0]
          .category ||
          "Makan & Minum"
      );
    }

    setShowAiResult(
      false
    );

    setError("");
  }

  // =========================
  // ADD EXPENSE
  // =========================

  async function addExpense(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setError(
        "Masukkan jumlah yang sah."
      );

      return;
    }

    if (
      numericAmount >
      100000
    ) {
      setError(
        "Jumlah terlalu besar."
      );

      return;
    }

    if (!note.trim()) {
      setError(
        "Masukkan apa yang dibeli."
      );

      return;
    }

    setSaving(true);

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      setError(
        "Sesi login telah tamat."
      );

      setSaving(false);

      router.replace(
        "/login"
      );

      return;
    }

    let receiptUrl:
      | string
      | null =
      aiResult?.receiptUrl ??
      null;

    // =========================
    // UPLOAD RECEIPT
    // =========================

    // Jika resit sudah di-upload semasa AI scan,
    // gunakan URL yang sama supaya tidak berlaku
    // duplicate upload.
    if (receiptFile && !receiptUrl) {
      setUploadingReceipt(
        true
      );

      const fileExtension =
        receiptFile.name
          .split(".")
          .pop() || "jpg";

      const filePath =
        `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("receipts")
          .upload(
            filePath,
            receiptFile,
            {
              upsert: false,
              contentType:
                receiptFile.type,
            }
          );

      if (uploadError) {
        console.error(
          "Receipt upload error:",
          uploadError
        );

        setError(
          "Resit tak berjaya dimuat naik. Cuba lagi."
        );

        setUploadingReceipt(
          false
        );

        setSaving(false);

        return;
      }

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from("receipts")
          .getPublicUrl(
            filePath
          );

      receiptUrl =
        publicUrlData.publicUrl;

      setUploadingReceipt(
        false
      );
    }

    // =========================
    // SAVE EXPENSE
    // =========================

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const selectedExpenseDate =
      aiResult?.date ||
      expenseDate ||
      today;

    const {
      data: insertedExpense,
      error: insertError,
    } =
      await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          name: note.trim(),
          category,
          amount:
            numericAmount,
          expense_date:
            selectedExpenseDate,
          receipt_url:
            receiptUrl,
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "Insert expense error:",
        insertError
      );

      setError(
        "Belanja tak berjaya disimpan. Cuba lagi."
      );

      setSaving(false);

      return;
    }

    // =========================
    // SAVE AI ITEMS
    // =========================

    if (
      insertedExpense &&
      aiResult &&
      aiResult.items.length >
        0
    ) {
      const receiptItems =
        aiResult.items.map(
          (item) => ({
            expense_id:
              insertedExpense.id,

            user_id:
              user.id,

            item_name:
              item.name,

            quantity:
              Number(
                item.quantity
              ) || 1,

            unit_price:
              Number(
                item.price
              ) || 0,

            total_price:
              Number(
                item.price
              ) *
              (Number(
                item.quantity
              ) || 1),

            category:
              item.category ||
              category,

            confidence:
              null,
          })
        );

      const {
        error:
          receiptItemsError,
      } =
        await supabase
          .from(
            "receipt_items"
          )
          .insert(
            receiptItems
          );

      if (
        receiptItemsError
      ) {
        console.error(
          "Receipt items error:",
          receiptItemsError
        );

        // Expense masih berjaya disimpan.
        // Kita cuma maklumkan item AI gagal.
      }
    }

    // =========================
    // RESET
    // =========================

    setAmount("");

    setNote("");

    setCategory(
      "Makan & Minum"
    );

    setReceiptFile(null);

    setReceiptPreview(null);

    setAiResult(null);

    setShowAiResult(false);

    setError("");

    setShowAddExpense(
      false
    );

    setSaving(false);

    await loadExpenses();
  }

  // =========================
  // MONTH FILTER + CALCULATIONS
  // =========================

  const monthOptions = Array.from(
    { length: 12 },
    (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(
        date.getMonth() - index
      );

      return {
        value: `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`,
        label: date.toLocaleDateString(
          "ms-MY",
          {
            month: "long",
            year: "numeric",
          }
        ),
      };
    }
  );

  const selectedMonthLabel =
    monthOptions.find(
      (month) =>
        month.value === selectedMonth
    )?.label ??
    selectedMonth;

  const monthlyTransactions =
    transactions.filter(
      (transaction) =>
        transaction.expenseDate?.slice(
          0,
          7
        ) === selectedMonth
    );

  const normalizedTransactionSearch =
    transactionSearch.trim().toLowerCase();

  const filteredTransactions =
    monthlyTransactions.filter((transaction) => {
      const matchesSearch =
        !normalizedTransactionSearch ||
        transaction.name
          .toLowerCase()
          .includes(normalizedTransactionSearch) ||
        transaction.category
          .toLowerCase()
          .includes(normalizedTransactionSearch);

      const matchesCategory =
        transactionCategoryFilter === "Semua" ||
        transaction.category === transactionCategoryFilter;

      return matchesSearch && matchesCategory;
    });

  const selectedMonthIncome =
    incomeRecords
      .filter(
        (item) =>
          item.income_date?.slice(0, 7) ===
          selectedMonth
      )
      .reduce(
        (sum, item) =>
          sum + item.amount,
        0
      );

  const totalSpent =
    filteredTransactions.reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

  const availableBalance =
    selectedMonthIncome -
    totalCommitments -
    totalSpent;

  const budget = monthlyBudget > 0 ? monthlyBudget : selectedMonthIncome;

  const totalOutflow =
    totalCommitments +
    totalSpent;

  const budgetUsed =
    budget > 0
      ? Math.round(
          (totalOutflow /
            budget) *
            100
        )
      : 0;

  const budgetRemaining = budget - totalOutflow;

  const budgetStatus =
    monthlyBudget <= 0
      ? "Belum ditetapkan"
      : budgetUsed >= 100
        ? "Melebihi budget"
        : budgetUsed >= 80
          ? "Hampir habis"
          : "Terkawal";



  const dailyLimit =
    availableBalance > 0
      ? availableBalance / 20
      : 0;

  const smartInsight = (() => {
    if (totalOutflow <= 0) return "Belum ada perbelanjaan untuk bulan ini.";
    if (budgetRemaining < 0) return `Perbelanjaan sudah melebihi budget sebanyak RM${Math.abs(budgetRemaining).toFixed(2)}.`;
    if (budgetUsed >= 80 && monthlyBudget > 0) return `Dah guna ${budgetUsed}% budget. Baki RM${budgetRemaining.toFixed(2)}.`;
    if (dailyLimit > 0) return `Had anggaran harian sekarang RM${dailyLimit.toFixed(2)} berdasarkan baki yang ada.`;
    return "Belanja masih dalam keadaan terkawal.";
  })();

  // =========================
  // REAL SPENDING OVERVIEW
  // =========================

  const spendingOverview = (() => {
    const [year, month] =
      selectedMonth
        .split("-")
        .map(Number);

    const lastDay = new Date(
      year,
      month,
      0
    );

    const isCurrentMonth =
      selectedMonth ===
      new Date()
        .toISOString()
        .slice(0, 7);

    const endDate = isCurrentMonth
      ? new Date()
      : lastDay;

    const days = [];

    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(
        endDate
      );
      date.setHours(0, 0, 0, 0);
      date.setDate(
        endDate.getDate() - index
      );

      const dateKey =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;

      const amount =
        filteredTransactions
          .filter(
            (transaction) =>
              transaction.expenseDate ===
              dateKey
          )
          .reduce(
            (sum, transaction) =>
              sum + transaction.amount,
            0
          );

      days.push({
        dateKey,
        label: date.toLocaleDateString(
          "ms-MY",
          {
            weekday: "short",
          }
        ),
        amount,
      });
    }

    const maxAmount = Math.max(
      ...days.map(
        (day) => day.amount
      ),
      0
    );

    return days.map((day) => ({
      ...day,
      height:
        maxAmount > 0
          ? Math.max(
              6,
              (day.amount /
                maxAmount) *
                100
            )
          : 6,
    }));
  })();

  // =========================
  // MONTHLY CATEGORY BREAKDOWN
  // =========================

  const categorySpending = (() => {
    const totals = new Map<
      string,
      number
    >();

    filteredTransactions.forEach(
      (transaction) => {
        totals.set(
          transaction.category,
          (totals.get(
            transaction.category
          ) ?? 0) +
            transaction.amount
        );
      }
    );

    const total = Array.from(
      totals.values()
    ).reduce(
      (sum, amount) =>
        sum + amount,
      0
    );

    return Array.from(
      totals.entries()
    )
      .map(
        ([category, amount]) => ({
          category,
          amount,
          percentage:
            total > 0
              ? (amount / total) *
                100
              : 0,
        })
      )
      .sort(
        (a, b) =>
          b.amount - a.amount
      );
  })();

  const monthlyCategoryTotal =
    categorySpending.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  // =========================
  // AUTH LOADING
  // =========================

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="text-4xl">
            💰
          </div>

          <p className="mt-4 text-sm text-neutral-500">
            Membuka BelanjaKu...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // DASHBOARD
  // =========================

  return (
    <main className={`min-h-screen px-4 py-6 text-neutral-900 ${darkMode ? "bk-dark bg-neutral-950" : "bg-neutral-100"}`}>

      <div className="mx-auto w-full max-w-2xl">

        {/* HEADER */}

        <header className="mb-5 flex items-center justify-between">

          <div>
            <p className="text-sm text-neutral-500">
              Good evening, Aiman 👋
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              BelanjaKu
            </h1>
          </div>

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowProfileMenu(
                  !showProfileMenu
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg shadow-sm transition-transform active:scale-95"
              aria-label="Profile"
            >
              👤
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-14 z-50 w-52 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">

                <div className="border-b border-neutral-100 px-4 py-3">

                  <p className="text-sm font-bold">
                    BelanjaKu
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    Akaun saya
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/income"
                    )
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50"
                >
                  <span className="text-lg">
                    💰
                  </span>

                  <span>
                    Income
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/commitments"
                    )
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50"
                >
                  <span className="text-lg">
                    💳
                  </span>

                  <span>
                    Komitmen
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/analytics")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50"
                >
                  <span className="text-lg">📊</span>
                  <span>Analytics</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/settings")}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50"
                >
                  <span className="text-lg">⚙️</span>
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50"
                >
                  <span className="text-lg">{darkMode ? "☀️" : "🌙"}</span>
                  <span>{darkMode ? "Light mode" : "Dark mode"}</span>
                </button>

                <div className="my-1 border-t border-neutral-100" />

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <span className="text-lg">
                    🚪
                  </span>

                  <span>
                    Log out
                  </span>
                </button>

              </div>
            )}

          </div>

        </header>

        {/* MONTH SELECTOR */}
        <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Paparan bulan
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-neutral-900">
                {selectedMonthLabel}
              </p>
            </div>

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold capitalize outline-none focus:border-neutral-900"
            >
              {monthOptions.map(
                (month) => (
                  <option
                    key={month.value}
                    value={month.value}
                  >
                    {month.label}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        {/* MONTHLY BUDGET */}

        <section className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                Budget bulan ini
              </p>
              <p className="mt-1 text-2xl font-bold">
                RM {budget.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {monthlyBudget > 0 ? "Budget ditetapkan secara manual" : "Belum ada budget manual — guna income sebagai rujukan"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBudgetInput(monthlyBudget > 0 ? monthlyBudget.toFixed(2) : "");
                setShowBudgetEditor(true);
              }}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white active:scale-95"
            >
              {monthlyBudget > 0 ? "Edit" : "Set budget"}
            </button>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${Math.min(Math.max(budgetUsed, 0), 100)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Digunakan {budgetUsed}%</span>
            <span className={`font-bold ${budgetRemaining < 0 ? "text-red-600" : "text-neutral-900"}`}>
              {budgetRemaining >= 0 ? `Baki RM${budgetRemaining.toFixed(2)}` : `Lebih RM${Math.abs(budgetRemaining).toFixed(2)}`}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="text-xs font-bold text-neutral-900">Status kewangan</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">{smartInsight}</p>
              </div>
            </div>
          </div>
        </section>

        {/* BALANCE CARD */}

        <section className="relative overflow-hidden rounded-[28px] bg-neutral-900 p-6 text-white shadow-xl">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/5" />

          <div className="relative">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
                  Available balance
                </p>

                <p className="mt-2 text-4xl font-bold tracking-tight">
                  RM{" "}
                  {availableBalance.toFixed(
                    2
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs">
                {selectedMonthLabel}
              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-2">

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs">
                💰 RM{" "}
                {selectedMonthIncome.toFixed(
                  2
                )}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs">
                💳 RM{" "}
                {totalCommitments.toFixed(
                  2
                )}
              </span>

            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${Math.min(
                    budgetUsed,
                    100
                  )}%`,
                }}
              />

            </div>

            <div className="mt-2 flex justify-between text-[11px] text-white/50">

              <span>
                RM{" "}
                {totalOutflow.toFixed(
                  2
                )}{" "}
                digunakan
              </span>

              <span>
                {budgetUsed}%
                income
              </span>

            </div>

          </div>

        </section>

        {/* SMALL STATS */}

        <section className="mt-3 grid grid-cols-3 gap-3">

          <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm">

            <p className="text-[10px] font-medium text-neutral-500">
              INCOME
            </p>

            <p className="mt-2 text-lg font-bold">
              RM{" "}
              {loadingIncome
                ? "..."
                : totalIncome.toFixed(
                    2
                  )}
            </p>

          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm">

            <p className="text-[10px] font-medium text-neutral-500">
              KOMITMEN
            </p>

            <p className="mt-2 text-lg font-bold">
              RM{" "}
              {loadingCommitments
                ? "..."
                : totalCommitments.toFixed(
                    2
                  )}
            </p>

          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-sm">

            <p className="text-[10px] font-medium text-neutral-500">
              BELANJA
            </p>

            <p className="mt-2 text-lg font-bold">
              RM{" "}
              {totalSpent.toFixed(
                2
              )}
            </p>

          </div>

        </section>

        {/* DAILY LIMIT */}

        <section className="mt-3 rounded-[22px] border border-neutral-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs text-neutral-500">
                BOLEH BELANJA HARI INI
              </p>

              <p className="mt-1 text-2xl font-bold">
                RM{" "}
                {dailyLimit.toFixed(
                  2
                )}
              </p>

            </div>

            <div className="rounded-2xl bg-neutral-100 px-3 py-2 text-xl">
              📅
            </div>

          </div>

          <p className="mt-2 text-[11px] text-neutral-400">
            Anggaran berdasarkan baki semasa.
          </p>

        </section>

        {/* SPENDING OVERVIEW */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-lg font-bold">
              Spending overview
            </h2>

            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500"
            >
              7 hari terakhir · {selectedMonthLabel}
            </button>

          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white p-5 shadow-sm">

            <div className="relative flex h-40 items-end gap-2 border-b border-neutral-100 px-1 pt-5">

              {spendingOverview.map((day) => (
                <div
                  key={day.dateKey}
                  className="group relative flex h-full flex-1 items-end justify-center"
                  title={`${day.label}: RM ${day.amount.toFixed(2)}`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-full rounded-t-xl bg-neutral-50" />

                  <div
                    className={`relative z-10 w-full max-w-10 rounded-t-xl transition-all duration-300 ${
                      day.amount > 0 ? "bg-neutral-900" : "bg-neutral-200"
                    }`}
                    style={{
                      height: `${day.amount > 0 ? Math.max(day.height, 8) : 3}%`,
                      minHeight: day.amount > 0 ? "10px" : "4px",
                    }}
                  />

                  {day.amount > 0 && (
                    <div className="pointer-events-none absolute bottom-[calc(var(--bar-height,0px)+8px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[9px] font-semibold text-white shadow-lg group-hover:block">
                      RM {day.amount.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}

            </div>

            <div className="mt-2 grid grid-cols-7 text-center text-[10px] text-neutral-400">

              {spendingOverview.map(
                (day) => (
                  <span key={day.dateKey}>
                    {day.label}
                  </span>
                )
              )}

            </div>

            <div className="mt-6 flex items-end justify-between">

              <div>

                <p className="text-[11px] text-neutral-400">
                  TOTAL SPENDING
                </p>

                <p className="mt-1 text-xl font-bold">
                  RM{" "}
                  {totalSpent.toFixed(
                    2
                  )}
                </p>

              </div>

              <div className="text-right">

                <p className="text-[11px] text-neutral-400">
                  KOMITMEN
                </p>

                <p className="mt-1 text-xl font-bold">
                  RM{" "}
                  {totalCommitments.toFixed(
                    2
                  )}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* TRANSACTION SEARCH / FILTER */}

        <section className="mt-7 rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3">
            <span className="text-lg">🔎</span>
            <input
              type="text"
              value={transactionSearch}
              onChange={(event) => setTransactionSearch(event.target.value)}
              placeholder="Cari transaksi..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            {transactionSearch && (
              <button
                type="button"
                onClick={() => setTransactionSearch("")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs text-neutral-500"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {["Semua", ...categories.map((item) => item.name)].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTransactionCategoryFilter(filter)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  transactionCategoryFilter === filter
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {(transactionSearch || transactionCategoryFilter !== "Semua") && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
              <span>{filteredTransactions.length} transaksi dijumpai</span>
              <button
                type="button"
                onClick={() => {
                  setTransactionSearch("");
                  setTransactionCategoryFilter("Semua");
                }}
                className="font-bold text-neutral-700"
              >
                Reset
              </button>
            </div>
          )}
        </section>

        <section className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={exportTransactionsCSV}
            className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm"
          >
            📤 Export CSV
          </button>
          <button
            type="button"
            onClick={() => router.push("/analytics")}
            className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold shadow-sm"
          >
            📊 Full analytics
          </button>
        </section>

        {/* CHILD SPENDING */}
        <section className="mt-5 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Perbelanjaan anak</p>
              <p className="mt-1 text-lg font-bold">RM {filteredTransactions.filter((item) => item.category === "Anak").reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-neutral-400">Pampers, susu dan keperluan anak</p>
            </div>
            <div className="rounded-2xl bg-neutral-100 px-3 py-2 text-2xl">👶</div>
          </div>
        </section>

        {/* RECURRING COMMITMENTS */}
        <section className="mt-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Komitmen berulang</p>
              <p className="mt-1 text-lg font-bold">RM {totalCommitments.toFixed(2)} / bulan</p>
              <p className="mt-1 text-xs text-neutral-400">Komitmen aktif akan dikira setiap bulan</p>
            </div>
            <button type="button" onClick={() => router.push("/commitments")} className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white">Urus</button>
          </div>
        </section>

        {/* RECEIPT GALLERY */}
        <section className="mt-4 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Receipt gallery</p>
              <p className="mt-1 text-sm font-semibold">{filteredTransactions.filter((item) => !!item.receipt_url).length} resit disimpan bulan ini</p>
            </div>
            <span className="text-2xl">🧾</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {filteredTransactions.filter((item) => !!item.receipt_url).slice(0, 8).map((item) => (
              <button key={item.id} type="button" onClick={() => openReceiptDetail(item)} className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
                <img src={item.receipt_url!} alt={item.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* RECENT SPENDING */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-lg font-bold">
              
        {/* SMART SUMMARY */}
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Baki selepas komitmen</p>
            <p className="mt-2 text-xl font-bold">RM {(selectedMonthIncome - totalCommitments).toFixed(2)}</p>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm border border-neutral-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">Status budget</p>
            <p className="mt-2 text-xl font-bold">{budgetStatus}</p>
          </div>
        </section>

        {/* MONTHLY CATEGORY BREAKDOWN */}
        <section className="mt-5 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                Pecahan belanja
              </p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">
                Mengikut kategori
              </h2>
            </div>

            <div className="text-right">
              <p className="text-xs text-neutral-400">
                Bulan ini
              </p>
              <p className="mt-1 text-lg font-bold text-neutral-900">
                RM {monthlyCategoryTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {categorySpending.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-neutral-50 px-4 py-5 text-center text-sm text-neutral-500">
              Belum ada perbelanjaan bulan ini.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {categorySpending.map((item) => {
                const categoryInfo =
                  categories.find(
                    (category) =>
                      category.name ===
                      item.category
                  );

                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(
                        item.category
                      )
                    }
                    className="group w-full rounded-2xl bg-neutral-50 p-3 text-left transition hover:bg-neutral-100 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                          {categoryInfo?.icon ?? "📦"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-neutral-900">
                            {item.category}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {item.percentage.toFixed(0)}% daripada belanja
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-sm font-bold text-neutral-900">
                          RM {item.amount.toFixed(2)}
                        </p>
                        <span className="text-neutral-300 transition-transform group-hover:translate-x-0.5">
                          ›
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-neutral-900 transition-all"
                        style={{
                          width: `${Math.min(
                            item.percentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[10px] font-medium text-neutral-400">
                      Tekan untuk lihat transaksi
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

Recent spending
            </h2>

            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500"
            >
              See all
            </button>

          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white px-4 shadow-sm">

            {loadingExpenses ? (
              <div className="py-8 text-center text-sm text-neutral-400">
                Memuatkan belanja...
              </div>
            ) : filteredTransactions.length ===
              0 ? (
              <div className="py-8 text-center">

                <div className="text-3xl">
                  {transactionSearch || transactionCategoryFilter !== "Semua" ? "🔎" : "🧾"}
                </div>

                <p className="mt-3 text-sm font-semibold">
                  {transactionSearch || transactionCategoryFilter !== "Semua"
                    ? "Tiada transaksi dijumpai"
                    : "Belum ada belanja"}
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  {transactionSearch || transactionCategoryFilter !== "Semua"
                    ? "Cuba carian atau kategori lain."
                    : "Tekan + untuk tambah belanja pertama."}
                </p>

              </div>
            ) : (
              filteredTransactions
                .slice(0, 5)
                .map(
                  (
                    transaction
                  ) => (
                    <button
                      type="button"
                      key={
                        transaction.id
                      }
                      onClick={() =>
                        openReceiptDetail(
                          transaction
                        )
                      }
                      className="flex w-full items-center gap-3 border-b border-neutral-100 py-4 text-left last:border-0 transition active:bg-neutral-50"
                    >

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-lg">
                        {
                          transaction.icon
                        }
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-semibold">
                          {
                            transaction.name
                          }
                        </p>

                        <p className="mt-1 text-[11px] text-neutral-400">
                          {
                            transaction.date
                          }{" "}
                          ·{" "}
                          {
                            transaction.category
                          }
                          {transaction.receipt_url
                            ? " · 🧾 Resit"
                            : ""}
                        </p>

                      </div>

                      <p className="text-sm font-bold">
                        − RM{" "}
                        {transaction.amount.toFixed(
                          2
                        )}
                      </p>

                    </button>
                  )
                )
            )}

          </div>

        </section>

        {/* ADD BUTTON */}

        <div className="flex justify-end py-6">

          <button
            type="button"
            onClick={() =>
              setShowAddExpense(
                true
              )
            }
            className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-neutral-900 text-3xl text-white shadow-xl transition-transform active:scale-95"
            aria-label="Tambah belanja"
          >
            +
          </button>

        </div>

      </div>

      {/* ================================================= */}
      {/* ADD EXPENSE MODAL */}
      {/* ================================================= */}

      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">

          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">

            {/* HEADER */}

            <div className="mb-5 flex items-center justify-between">

              <div>

                <p className="text-xs text-neutral-400">
                  TRANSACTION
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Tambah Belanja
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddExpense(
                    false
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                addExpense
              }
            >

              {/* AMOUNT */}

              <label className="text-xs font-medium text-neutral-500">
                Jumlah
              </label>

              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
                  )
                }
                placeholder="0.00"
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-2xl font-bold outline-none focus:border-neutral-900"
              />

              {/* DATE */}

              <label className="mt-5 block text-xs font-medium text-neutral-500">
                Tarikh
              </label>

              <input
                type="date"
                value={expenseDate}
                onChange={(event) =>
                  setExpenseDate(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
              />

              <p className="mt-2 text-[11px] text-neutral-400">
                Boleh pilih tarikh lama jika resit backdated.
              </p>

              {/* CATEGORY */}

              <label className="mt-5 block text-xs font-medium text-neutral-500">
                Kategori
              </label>

              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target
                      .value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none"
              >

                {categories.map(
                  (item) => (
                    <option
                      key={
                        item.name
                      }
                      value={
                        item.name
                      }
                    >
                      {
                        item.icon
                      }{" "}
                      {
                        item.name
                      }
                    </option>
                  )
                )}

              </select>

              {/* NOTE */}

              <label className="mt-5 block text-xs font-medium text-neutral-500">
                Apa yang dibeli?
              </label>

              <input
                type="text"
                value={note}
                onChange={(
                  event
                ) =>
                  setNote(
                    event.target
                      .value
                  )
                }
                placeholder="Contoh: Nasi ayam"
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-neutral-900"
              />

              {/* ================================================= */}
              {/* AI RECEIPT SCANNER */}
              {/* ================================================= */}

              <div className="mt-6 rounded-[24px] border border-neutral-200 bg-neutral-50 p-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-xl text-white">
                    🤖
                  </div>

                  <div className="min-w-0">

                    <p className="text-sm font-bold">
                      AI Receipt Scanner
                    </p>

                    <p className="mt-1 text-xs leading-5 text-neutral-400">
                      Ambil gambar resit dan AI akan cuba baca merchant, jumlah dan setiap item secara automatik.
                    </p>

                  </div>

                </div>

                {/* FILE BUTTON */}

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(
                    event
                  ) =>
                    handleReceiptSelect(
                      event.target
                        .files?.[0] ??
                        null
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold shadow-sm transition hover:bg-neutral-50 active:scale-[0.98]"
                >
                  📷{" "}
                  {receiptFile
                    ? "Tukar Gambar Resit"
                    : "Pilih Gambar Resit"}
                </button>

                {/* PREVIEW */}

                {receiptPreview && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">

                    <img
                      src={
                        receiptPreview
                      }
                      alt="Receipt preview"
                      className="max-h-64 w-full object-contain"
                    />

                  </div>
                )}

                {/* SCAN BUTTON */}

                {receiptFile && (
                  <button
                    type="button"
                    onClick={
                      scanReceiptWithAI
                    }
                    disabled={
                      scanningReceipt ||
                      uploadingReceipt
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {uploadingReceipt ? (
                      <>
                        ⬆️{" "}
                        Memuat naik...
                      </>
                    ) : scanningReceipt ? (
                      <>
                        🤖{" "}
                        AI sedang membaca...
                      </>
                    ) : (
                      <>
                        ✨ Scan Resit Dengan AI
                      </>
                    )}

                  </button>
                )}

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              {/* SAVE */}

              <button
                type="submit"
                disabled={
                  saving ||
                  scanningReceipt ||
                  uploadingReceipt
                }
                className="mt-5 w-full rounded-2xl bg-neutral-900 py-4 font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Menyimpan..."
                  : "Simpan Belanja"}
              </button>

            </form>

          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* AI RESULT MODAL */}
      {/* ================================================= */}

      {showAiResult &&
        aiResult && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center">

            <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl">

              {/* HEADER */}

              <div className="flex items-start justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
                      🤖
                    </span>

                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      AI Receipt Result
                    </p>

                  </div>

                  <h2 className="mt-3 text-2xl font-bold">
                    Semak Resit
                  </h2>

                  <p className="mt-1 text-sm text-neutral-400">
                    Pastikan maklumat betul sebelum simpan.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAiResult(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100"
                >
                  ✕
                </button>

              </div>

              {/* MERCHANT */}

              <div className="mt-6 rounded-[22px] bg-neutral-900 p-5 text-white">

                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Merchant
                </p>

                <input
                  value={
                    aiResult.merchant
                  }
                  onChange={(
                    event
                  ) =>
                    setAiResult({
                      ...aiResult,
                      merchant:
                        event.target
                          .value,
                    })
                  }
                  className="mt-2 w-full bg-transparent text-xl font-bold outline-none"
                />

                <div className="mt-4 flex items-end justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-widest text-white/50">
                      Tarikh
                    </p>

                    <input
                      type="date"
                      value={
                        aiResult.date
                      }
                      onChange={(
                        event
                      ) =>
                        setAiResult({
                          ...aiResult,
                          date:
                            event.target
                              .value,
                        })
                      }
                      className="mt-1 bg-transparent text-sm font-medium outline-none"
                    />

                  </div>

                  <div className="text-right">

                    <p className="text-[10px] uppercase tracking-widest text-white/50">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      RM{" "}
                      {Number(
                        aiResult.total
                      ).toFixed(
                        2
                      )}
                    </p>

                  </div>

                </div>

              </div>

              {/* AI WARNINGS */}

              {getAIWarnings(aiResult).length > 0 && (
                <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      ⚠️
                    </span>

                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        Semak semula
                      </p>

                      <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
                        {getAIWarnings(aiResult).map(
                          (warning, index) => (
                            <li key={index}>
                              • {warning}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ITEMS */}

              <div className="mt-6">

                <div className="mb-3 flex items-center justify-between">

                  <h3 className="text-sm font-bold">
                    Items Resit
                  </h3>

                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold text-neutral-500">
                    {
                      aiResult
                        .items
                        .length
                    }{" "}
                    item
                  </span>

                </div>

                <div className="space-y-3">

                  {aiResult.items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="rounded-[22px] border border-neutral-200 bg-neutral-50 p-4"
                      >

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                            {getCategoryIcon(
                              item.category
                            )}
                          </div>

                          <div className="min-w-0 flex-1">

                            <input
                              value={
                                item.name
                              }
                              onChange={(
                                event
                              ) =>
                                updateAIItem(
                                  index,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full bg-transparent text-sm font-bold outline-none"
                            />

                            <div className="mt-3 grid grid-cols-2 gap-2">

                              <div>

                                <p className="mb-1 text-[10px] text-neutral-400">
                                  Kuantiti
                                </p>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateAIItem(
                                      index,
                                      "quantity",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
                                />

                              </div>

                              <div>

                                <p className="mb-1 text-[10px] text-neutral-400">
                                  Harga
                                </p>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.price
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateAIItem(
                                      index,
                                      "price",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
                                />

                              </div>

                            </div>

                            <div className="mt-3">

                              <p className="mb-1 text-[10px] text-neutral-400">
                                Kategori
                              </p>

                              <select
                                value={
                                  item.category
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateAIItem(
                                    index,
                                    "category",
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs outline-none"
                              >

                                {categories.map(
                                  (
                                    categoryItem
                                  ) => (
                                    <option
                                      key={
                                        categoryItem.name
                                      }
                                      value={
                                        categoryItem.name
                                      }
                                    >
                                      {
                                        categoryItem.icon
                                      }{" "}
                                      {
                                        categoryItem.name
                                      }
                                    </option>
                                  )
                                )}

                              </select>

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeAIItem(
                                index
                              )
                            }
                            className="text-xs text-red-500"
                          >
                            ✕
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>

              {/* TOTAL */}

              <div className="mt-6 rounded-[22px] border border-neutral-200 bg-neutral-50 p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-neutral-500">
                    Jumlah AI
                  </span>

                  <span className="text-lg font-bold">
                    RM{" "}
                    {Number(
                      aiResult.total
                    ).toFixed(
                      2
                    )}
                  </span>

                </div>

              </div>

              {/* ACTION */}

              <div className="mt-5 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowAiResult(
                      false
                    )
                  }
                  className="rounded-2xl border border-neutral-200 bg-white py-4 text-sm font-bold"
                >
                  Edit Kemudian
                </button>

                <button
                  type="button"
                  onClick={
                    confirmAIReceipt
                  }
                  className="rounded-2xl bg-neutral-900 py-4 text-sm font-bold text-white shadow-lg"
                >
                  ✓ Guna Maklumat
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ================================================= */}
      {/* CATEGORY TRANSACTIONS MODAL */}
      {/* ================================================= */}

      {selectedCategory && (
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl">
            {(() => {
              const categoryTransactions =
                filteredTransactions.filter(
                  (transaction) =>
                    transaction.category ===
                    selectedCategory
                );

              const categoryTotal =
                categoryTransactions.reduce(
                  (sum, transaction) =>
                    sum + transaction.amount,
                  0
                );

              const categoryInfo =
                categories.find(
                  (category) =>
                    category.name ===
                    selectedCategory
                );

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-2xl">
                        {categoryInfo?.icon ?? "📦"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                          Bulan ini
                        </p>
                        <h2 className="mt-1 truncate text-2xl font-bold text-neutral-900">
                          {selectedCategory}
                        </h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategory(null)
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-5 rounded-[24px] bg-neutral-900 p-5 text-white">
                    <p className="text-[10px] uppercase tracking-widest text-white/50">
                      Jumlah kategori
                    </p>
                    <p className="mt-1 text-3xl font-bold">
                      RM {categoryTotal.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {categoryTransactions.length}{" "}
                      transaksi
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-neutral-900">
                        Senarai transaksi
                      </h3>
                      <span className="text-xs text-neutral-400">
                        {categoryTransactions.length} item
                      </span>
                    </div>

                    {categoryTransactions.length ===
                    0 ? (
                      <div className="rounded-2xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
                        Tiada transaksi dalam kategori ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoryTransactions.map(
                          (transaction) => (
                            <button
                              key={transaction.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(
                                  null
                                );
                                openReceiptDetail(
                                  transaction
                                );
                              }}
                              className="group flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-3 text-left transition hover:bg-neutral-50 active:scale-[0.99]"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                                {transaction.icon}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-neutral-900">
                                  {transaction.name}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-400">
                                  {transaction.date}
                                  {transaction.receipt_url
                                    ? " · 🧾 Resit"
                                    : ""}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <p className="text-sm font-bold text-neutral-900">
                                  RM{" "}
                                  {transaction.amount.toFixed(
                                    2
                                  )}
                                </p>
                                <span className="text-neutral-300 group-hover:translate-x-0.5">
                                  ›
                                </span>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* RECEIPT DETAIL MODAL */}
      {/* ================================================= */}

      {selectedTransaction && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Receipt detail
                </p>

                <h2 className="mt-2 truncate text-2xl font-bold">
                  {selectedTransaction.name}
                </h2>

                <p className="mt-1 text-xs text-neutral-400">
                  {selectedTransaction.date} ·{" "}
                  {selectedTransaction.category}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTransaction(null)
                }
                className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100"
              >
                ✕
              </button>
            </div>

            {selectedTransaction.receipt_url && (
              <div className="mt-5 overflow-hidden rounded-[24px] border border-neutral-200 bg-neutral-50">
                <img
                  src={
                    selectedTransaction.receipt_url
                  }
                  alt="Receipt"
                  className="max-h-[360px] w-full object-contain"
                />
              </div>
            )}

            <div className="mt-5 flex items-end justify-between rounded-[22px] bg-neutral-900 p-5 text-white">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  Jumlah
                </p>
                <p className="mt-1 text-3xl font-bold">
                  RM{" "}
                  {selectedTransaction.amount.toFixed(
                    2
                  )}
                </p>
              </div>

              <div className="rounded-full bg-white/10 px-3 py-2 text-xs">
                {selectedTransaction.icon}{" "}
                {selectedTransaction.category}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  Item Resit
                </h3>

                <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold text-neutral-500">
                  {receiptDetailItems.length} item
                </span>
              </div>

              {!selectedTransaction.receipt_url ? (
                <div className="rounded-[22px] bg-neutral-50 p-5 text-center text-xs text-neutral-400">
                  Tiada gambar resit untuk transaksi ini.
                </div>
              ) : loadingReceiptDetail ? (
                <div className="rounded-[22px] bg-neutral-50 p-5 text-center text-xs text-neutral-400">
                  Memuatkan item resit...
                </div>
              ) : receiptDetailItems.length === 0 ? (
                <div className="rounded-[22px] bg-neutral-50 p-5 text-center text-xs text-neutral-400">
                  Tiada pecahan item disimpan untuk resit ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {receiptDetailItems.map(
                    (item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                          {getCategoryIcon(
                            item.category
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {item.name}
                          </p>

                          <p className="mt-1 text-[11px] text-neutral-400">
                            {item.quantity} × RM{" "}
                            {item.price.toFixed(2)}
                          </p>
                        </div>

                        <p className="text-sm font-bold">
                          RM{" "}
                          {(
                            item.quantity *
                            item.price
                          ).toFixed(2)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => startEditExpense(selectedTransaction)}
                className="rounded-2xl border border-neutral-200 bg-white py-4 text-sm font-bold text-neutral-900"
              >
                ✏️ Edit
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-2xl bg-red-50 py-4 text-sm font-bold text-red-600"
              >
                🗑️ Padam
              </button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">Padam transaksi ini?</p>
                <p className="mt-1 text-xs leading-5 text-red-500">
                  Transaksi dan pecahan item resit akan dipadam. Tindakan ini tak boleh dibuat asal semula.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingExpense}
                    className="rounded-xl bg-white py-3 text-xs font-bold text-neutral-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedExpense}
                    disabled={deletingExpense}
                    className="rounded-xl bg-red-600 py-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {deletingExpense ? "Memadam..." : "Ya, Padam"}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedTransaction(null)}
              className="mt-3 w-full rounded-2xl bg-neutral-900 py-4 text-sm font-bold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* EDIT EXPENSE MODAL */}
      {/* ================================================= */}

      {showBudgetEditor && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Budget</p>
                <h2 className="mt-2 text-2xl font-bold">Budget {selectedMonthLabel}</h2>
              </div>
              <button type="button" onClick={() => setShowBudgetEditor(false)} disabled={savingBudget} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">✕</button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-bold text-neutral-500">Jumlah budget</label>
              <div className="flex items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4">
                <span className="mr-2 text-sm font-bold text-neutral-400">RM</span>
                <input type="number" min="1" step="0.01" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} className="w-full bg-transparent py-4 text-2xl font-bold outline-none" placeholder="1500.00" autoFocus />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {monthlyBudget > 0 && (
                <button type="button" onClick={clearMonthlyBudget} disabled={savingBudget} className="flex-1 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-bold text-red-600 disabled:opacity-50">Padam</button>
              )}
              <button type="button" onClick={saveMonthlyBudget} disabled={savingBudget} className="flex-1 rounded-2xl bg-neutral-900 px-4 py-4 text-sm font-bold text-white disabled:opacity-50">{savingBudget ? "Menyimpan..." : "Simpan budget"}</button>
            </div>
          </div>
        </div>
      )}

      {showEditExpense && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Kemaskini transaksi</p>
                <h2 className="mt-2 text-2xl font-bold">Edit Belanja</h2>
              </div>
              <button
                type="button"
                onClick={closeEditExpense}
                disabled={savingEdit}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-500">Nama / Kedai</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm font-medium outline-none focus:border-neutral-900"
                  placeholder="Contoh: Starbucks"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-500">Jumlah</label>
                <div className="flex items-center rounded-2xl border border-neutral-200 bg-neutral-50 px-4">
                  <span className="mr-2 text-sm font-bold text-neutral-400">RM</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editAmount}
                    onChange={(event) => setEditAmount(event.target.value)}
                    className="w-full bg-transparent py-4 text-lg font-bold outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-500">Kategori</label>
                <select
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm font-bold outline-none focus:border-neutral-900"
                >
                  {categories.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.icon} {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-500">Tarikh</label>
                <input
                  type="date"
                  value={editExpenseDate}
                  onChange={(event) => setEditExpenseDate(event.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm font-medium outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveEditedExpense}
              disabled={savingEdit}
              className="mt-6 w-full rounded-2xl bg-neutral-900 py-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            <button
              type="button"
              onClick={closeEditExpense}
              disabled={savingEdit}
              className="mt-2 w-full rounded-2xl bg-neutral-100 py-4 text-sm font-bold text-neutral-700 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

    </main>
  );
}