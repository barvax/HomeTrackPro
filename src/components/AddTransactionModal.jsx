import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import CategoryIcon from "./CategoryIcon";

function daysInMonth(y, m0) {
  // m0: 0..11
  return new Date(y, m0 + 1, 0).getDate();
}

// עזרה: הוספת חודשים קדימה
function addMonths(isoDate, n) {
  // isoDate: "YYYY-MM-DD"
  const [Y, M, D] = isoDate.split("-").map(Number);
  const targetM0 = (M - 1) + n; // 0..11 + offset
  const targetY = Y + Math.floor(targetM0 / 12);
  const targetM0Norm = ((targetM0 % 12) + 12) % 12;
  const dim = daysInMonth(targetY, targetM0Norm);
  const d = Math.min(D, dim); // clamp ליום האחרון בחודש
  const mm = String(targetM0Norm + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${targetY}-${mm}-${dd}`; // בלי toISOString -> אין הסטות זמן
}

// עיגול לשתי ספרות אחרי הנקודה — למניעת שברי אגורות מתגלגלים
const toCents = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => Math.round(c) / 100;

const heDate = (iso) =>
  new Date(iso).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// סדר קשיח לקטגוריות של הוצאות – בדיוק כמו שאתה רוצה לראות על המסך
const EXPENSE_ORDER = [
  "אחר",
  "סופרמרקט",
  "מסעדות/קפה",
  
  "ביגוד",
  "דלק",
  "בילויים",
  "בית",
  "בריאות/תרופות",
  "גן/בית ספר",
   "תחבורה ציבורית",
  
  "חוגים",
  "חיות מחמד",
  "חשמל",
  "כספומט",
  "מים",
  "מנויים",
 "נופש",
  "ארנונה",
  "אינטרנט/סלולר",
  "רכב",
  "שכירות/משכנתא",
 "ביטוח",
];

export default function AddTransactionModal({
  initialKind = "expense",
  defaultDate = new Date().toISOString().slice(0, 10),
  onSaved,
  onClose,
}) {
  const [kind, setKind] = useState(initialKind);
  const [mode, setMode] = useState("one_time"); // one_time | installments | recurring
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState(""); // חד-פעמי או "סכום לחודש" בקבועה
  const [note, setNote] = useState("");
  const [cats, setCats] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // שדות לתשלומים/קבועה
  const [originalAmount, setOriginalAmount] = useState(""); // סכום עסקה כולל (תשלומים)
  const [installments, setInstallments] = useState(3); // מספר תשלומים
  const [monthsCount, setMonthsCount] = useState(6); // לכמה חודשים קדימה (קבועה)

  useEffect(() => {
    let live = true;
    (async () => {
      setErr("");
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,group_id")
        .eq("kind", kind)
        .eq("is_active", true);

      if (!live) return;
      if (error) {
        setErr(error.message);
      } else {
        let arr = [...(data || [])];

        if (kind === "expense") {
          // סדר על פי EXPENSE_ORDER
          const orderMap = new Map(
            EXPENSE_ORDER.map((name, index) => [name, index])
          );

          arr = arr
            .slice()
            .sort((a, b) => {
              const wa = orderMap.has(a.name) ? orderMap.get(a.name) : 999;
              const wb = orderMap.has(b.name) ? orderMap.get(b.name) : 999;
              if (wa !== wb) return wa - wb;
              // fallback: לפי שם
              return a.name.localeCompare(b.name, "he");
            });
        } else {
          // הכנסות – פשוט למיין לפי שם
          arr = arr
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "he"));
        }

        setCats(arr);
        setSelectedCat(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [kind]);

  // לא חובה ב-UI כרגע, אבל נשאר אם תרצה להשתמש
  const perInstallmentAmount = useMemo(() => {
    const total = toCents(originalAmount || 0);
    const n = Number(installments) || 0;
    if (!total || !n) return 0;
    return fromCents(Math.floor(total / n));
  }, [originalAmount, installments]);

  // אפשר לשמור רק אם…
  const canSave = useMemo(() => {
    if (!selectedCat || !date) return false;
    if (mode === "one_time") return Number(amount) > 0;
    if (mode === "installments")
      return Number(originalAmount) > 0 && Number(installments) > 0;
    if (mode === "recurring")
      return Number(amount) > 0 && Number(monthsCount) > 0;
    return false;
  }, [selectedCat, date, amount, mode, originalAmount, installments, monthsCount]);

  async function handleSave(e) {
    e?.preventDefault?.();
    setErr("");
    setSaving(true);
    try {
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      const user_id = ures?.user?.id;
      if (!user_id) throw new Error("No authenticated user.");

      const base = {
        user_id,
        kind, // "income" | "expense"
        category_id: selectedCat.id,
        group_id: selectedCat.group_id,
        note: note || null,
      };

      let records = [];

      if (mode === "one_time") {
        const num = Number(amount);
        if (!num || num <= 0) throw new Error("סכום חייב להיות גדול מאפס.");
        records = [
          {
            ...base,
            mode: "one_time",
            amount: num,
            tx_date: date,
          },
        ];
      }

      if (mode === "installments") {
        const total = Number(originalAmount);
        const n = Number(installments);
        if (!total || total <= 0)
          throw new Error("סכום העסקה חייב להיות גדול מאפס.");
        if (!n || n <= 0)
          throw new Error("מספר התשלומים חייב להיות גדול מאפס.");
        const series_id = crypto.randomUUID();

        const totalC = toCents(total);
        const baseEach = Math.floor(totalC / n);
        const remainder = totalC - baseEach * n;

        records = Array.from({ length: n }, (_, i) => {
          const amtC = baseEach + (i === n - 1 ? remainder : 0);
          const tx_date = addMonths(date, i);
          return {
            ...base,
            mode: "installments",
            series_id,
            original_amount: total,
            installments_total: n,
            installment_no: i + 1,
            amount: fromCents(amtC),
            tx_date,
          };
        });
      }

      if (mode === "recurring") {
        const perMonth = Number(amount);
        const n = Number(monthsCount);
        if (!perMonth || perMonth <= 0)
          throw new Error("סכום לחודש חייב להיות גדול מאפס.");
        if (!n || n <= 0)
          throw new Error("מספר חודשים חייב להיות גדול מאפס.");
        const series_id = crypto.randomUUID();

        records = Array.from({ length: n }, (_, i) => ({
          ...base,
          mode: "recurring",
          series_id,
          original_amount: perMonth,
          amount: perMonth,
          tx_date: addMonths(date, i),
        }));
      }

      const { error: insErr } = await supabase
        .from("transactions")
        .insert(records);
      if (insErr) throw insErr;

      records.forEach((r) =>
        onSaved?.({ kind: r.kind, amount: r.amount, tx_date: r.tx_date })
      );

      onClose?.();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSave}>
      {/* טאבים הכנסה/הוצאה */}
      <div className="grid grid-cols-2 rounded-2xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setKind("expense")}
          className={`py-2.5 rounded-xl font-medium ${
            kind === "expense"
              ? "bg-white shadow text-blue-600"
              : "text-zinc-600"
          }`}
        >
          הוצאה
        </button>
        <button
          type="button"
          onClick={() => setKind("income")}
          className={`py-2.5 rounded-xl font-medium ${
            kind === "income"
              ? "bg-white shadow text-blue-600"
              : "text-zinc-600"
          }`}
        >
          הכנסה
        </button>
      </div>

      {/* רשת קטגוריות */}
      <div className="grid grid-cols-4 gap-3">
        {cats.map((c) => {
          const active = selectedCat?.id === c.id;
          // קטגוריות עם מסגרת אדומה עדינה
          const isSpecial = ["סופרמרקט",   "כספומט", "דלק"].includes(c.name);
          const baseBorder = isSpecial ? "border-red-300" : "border-zinc-200";

          return (
            <button
              type="button"
              key={c.id}
              onClick={() => setSelectedCat(c)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm
                ${
                  active
                    ? `bg-blue-50 ring-2 ring-blue-200 ${baseBorder}`
                    : `bg-white hover:bg-zinc-50 ${baseBorder}`
                }`}
            >
              <CategoryIcon icon={c.icon} />
              <span className="truncate">{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* סוג */}
      <div>
        <div className="mb-2 text-sm font-medium text-zinc-700">
          {kind === "expense" ? "סוג הוצאה" : "סוג הכנסה"}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode("one_time")}
            className={`py-2 rounded-xl border ${
              mode === "one_time"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-700"
            }`}
          >
            חד פעמית
          </button>
          <button
            type="button"
            onClick={() => setMode("recurring")}
            className={`py-2 rounded-xl border ${
              mode === "recurring"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-700"
            }`}
          >
            קבועה
          </button>
          <button
            type="button"
            onClick={() => setMode("installments")}
            className={`py-2 rounded-xl border ${
              mode === "installments"
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-700"
            }`}
          >
            תשלומים
          </button>
        </div>
      </div>

      {/* תאריך + כותרת תיאורית */}
      <div className="rounded-xl bg-zinc-100 px-3 py-2.5 text-center text-zinc-700">
        {heDate(date)}
      </div>
      <input
        type="date"
        className="w-full rounded-xl border p-2.5 bg-zinc-50"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {/* שדות לפי מצב */}
      {mode === "one_time" && (
        <>
          <input
            inputMode="decimal"
            type="number"
            step="0.01"
            placeholder="Amount"
            className="w-full rounded-xl border p-2.5 bg-zinc-50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </>
      )}

      {mode === "installments" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                סכום העסקה (סה״כ)
              </label>
              <input
                inputMode="decimal"
                type="number"
                step="0.01"
                placeholder="Total"
                className="w-full rounded-xl border p-2.5 bg-zinc-50"
                value={originalAmount}
                onChange={(e) => setOriginalAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                מס׳ תשלומים
              </label>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border p-2.5 bg-zinc-50"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl bg-zinc-50 border px-3 py-2.5 text-sm text-zinc-700">
            תשלום חודשי משוער:{" "}
            <strong>
              {fromCents(
                toCents(originalAmount || 0) / (installments || 1) || 0
              ).toLocaleString()}
            </strong>
          </div>
        </>
      )}

      {mode === "recurring" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                סכום לחודש
              </label>
              <input
                inputMode="decimal"
                type="number"
                step="0.01"
                className="w-full rounded-xl border p-2.5 bg-zinc-50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                מס׳ חודשים קדימה
              </label>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border p-2.5 bg-zinc-50"
                value={monthsCount}
                onChange={(e) => setMonthsCount(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* תיאור */}
      <input
        placeholder="Description"
        className="w-full rounded-xl border p-2.5 bg-zinc-50"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSave || saving}
        className="w-full rounded-2xl bg-blue-600 text-white py-3 font-semibold disabled:opacity-50"
      >
        {saving ? "שומר…" : "Save"}
      </button>
    </form>
  );
}
