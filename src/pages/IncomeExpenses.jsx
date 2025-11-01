// src/pages/IncomeExpenses.jsx
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../supabaseClient";
import AddTransactionModal from "../components/AddTransactionModal";
import { useNavigate } from "react-router-dom";

const CURRENCY = "₪";
const BLUE   = "#93c5fd";
const PURPLE = "#c4b5fd";
const RED    = "#f87171";
const TRACK  = "#eef2f7";

const fmt = (n) => Math.round(n).toLocaleString("he-IL");

const monthLabel = (y, m0) =>
  new Date(y, m0, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

// טווח חודש כ-YYYY-MM-DD בלי המרת UTC (להימנע מהיסט)
function monthRange(year, month0) {
  const mm = String(month0 + 1).padStart(2, "0");
  const nextY = month0 === 11 ? year + 1 : year;
  const nextM = month0 === 11 ? 1 : month0 + 2;
  const mm2 = String(nextM).padStart(2, "0");
  return { startIso: `${year}-${mm}-01`, endIso: `${nextY}-${mm2}-01` };
}

const shiftMonth = (year, month0, delta) => {
  const d = new Date(year, month0, 1);
  d.setMonth(d.getMonth() + delta);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export default function IncomeExpenses() {
  const navigate = useNavigate();
  const now = new Date();
  const [{ year, month }, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  // סכומי אמת מה-DB
  const [income, setIncome]   = useState(0);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(false);

  const { startIso, endIso } = monthRange(year, month);

  // טעינת סיכומי חודש
  async function loadTotals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, kind")
        .gte("tx_date", startIso)
        .lt("tx_date", endIso);

      if (error) throw error;
      let inc = 0, exp = 0;
      (data || []).forEach(r => {
        const v = Number(r.amount) || 0;
        if (r.kind === "income") inc += v; else exp += v;
      });
      setIncome(inc);
      setExpense(exp);
    } catch (e) {
      console.error(e);
      setIncome(0);
      setExpense(0);
    } finally {
      setLoading(false);
    }
  }

  // טען כשמשתנה חודש
  useEffect(() => { loadTotals(); }, [startIso, endIso]);

  // ניווט חודשי
  const go = (delta) => setYm(shiftMonth(year, month, delta));

  // מאזן + צבעי עיגול
  const remaining = income - expense;
  const spentRatio = useMemo(() => {
    if (income <= 0 && expense > 0) return 1;
    if (income <= 0) return 0;
    return Math.min(1, Math.max(0, expense / income));
  }, [income, expense]);

  const donutStyle = useMemo(() => {
    if (expense <= 0) return { background: `conic-gradient(${BLUE} 0% 100%)` };
    if (expense > income) return { background: `conic-gradient(${RED} 0% 100%)` };
    const pct = Math.round(spentRatio * 100);
    return { background: `conic-gradient(${PURPLE} 0% ${pct}%, ${BLUE} ${pct}% 100%)` };
  }, [income, expense, spentRatio]);

  // פתיחת מודלים
  const [openIncome, setOpenIncome]   = useState(false);
  const [openExpense, setOpenExpense] = useState(false);

  // רענון מיד לאחר שמירה – רק אם נוגע בחודש המוצג
  function handleTxSaved({ tx_date }) {
    const d = new Date(tx_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      loadTotals();
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* ניווט חודשים */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => go(-1)}
          className="p-2 rounded-lg bg-white shadow hover:bg-zinc-50"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>

        <h1 className="text-2xl font-semibold">{monthLabel(year, month)}</h1>

        <button
          onClick={() => go(1)}
          className="p-2 rounded-lg bg-white shadow hover:bg-zinc-50"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* כרטיס סיכום */}
      <div className="rounded-3xl bg-white shadow p-6">
        {/* סכומי צדדים */}
        <div className="flex items-center justify-between text-sm mb-6">
          <div className="text-zinc-500">
            Expense
            <div className="text-[15px]" style={{ color: PURPLE }}>
              {loading ? "…" : `${CURRENCY} ${fmt(expense)}`}
            </div>
          </div>

          <div className="text-zinc-500 text-right">
            Income
            <div className="text-[15px]" style={{ color: BLUE }}>
              {loading ? "…" : `${CURRENCY} ${fmt(income)}`}
            </div>
          </div>
        </div>

        
       {/* עיגול/דונאט */}
<div className="flex items-center justify-center my-6">
  {/* עוטף יחיד לשליטה במיקום */}
  <div className="relative h-56 w-56">
    {/* הדונאט עצמו – עם מסכה */}
    <div
      className="absolute inset-0 rounded-full"
      style={{
        ...donutStyle,
        WebkitMask: "radial-gradient(transparent 48%, #000 49%)",
        mask: "radial-gradient(transparent 48%, #000 49%)",
      }}
    />
    {/* טבעת רקע עדינה (גם ממוסכת) */}
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: TRACK,
        WebkitMask: "radial-gradient(transparent 48%, #000 49%)",
        mask: "radial-gradient(transparent 48%, #000 49%)",
        opacity: 0.35,
      }}
    />
    {/* הטקסט במרכז – מחוץ למסכה, עם z-index */}
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
      <div className="text-xl font-extrabold text-zinc-900">
        {loading ? "…" : `${CURRENCY} ${fmt(Math.abs(remaining))}`}
      </div>
      <div className="text-zinc-500 text-sm">
        {remaining >= 0 ? "Remaining" : "Over budget"}
      </div>
    </div>
  </div>
</div>

      </div>

      {/* כפתורים */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <button
          onClick={() => setOpenIncome(true)}
          className="rounded-2xl bg-white shadow px-3 py-3 text-sm hover:bg-zinc-50"
        >
          + Income
        </button>
        <button
          onClick={() => setOpenExpense(true)}
          className="rounded-2xl bg-white shadow px-3 py-3 text-sm hover:bg-zinc-50"
        >
          + Expense
        </button>
        <button
          onClick={() => navigate(`/details?y=${year}&m=${month + 1}`)}
          className="rounded-2xl bg-white shadow px-3 py-3 text-sm hover:bg-zinc-50"
        >
          Monthly Details
        </button>
      </div>

      {/* מודלים */}
      {openIncome && (
        <Modal onClose={() => setOpenIncome(false)} title="הוספת הכנסה">
          <AddTransactionModal
            initialKind="income"
            onClose={() => setOpenIncome(false)}
            onSaved={handleTxSaved}
          />
        </Modal>
      )}

      {openExpense && (
        <Modal onClose={() => setOpenExpense(false)} title="הוספת הוצאה">
          <AddTransactionModal
            initialKind="expense"
            onClose={() => setOpenExpense(false)}
            onSaved={handleTxSaved}
          />
        </Modal>
      )}
    </div>
  );
}

/* ──────────────────────────────── */
/*      COMPONENT HELPERS BELOW     */
/* ──────────────────────────────── */

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40">
      {/* שכבת רקע */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* עטיפה שמאפשרת גלילה של כל המודל במסכים קטנים */}
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        {/* מרכוז + מרווחים בטוחים לאייפון */}
        <div className="mx-auto max-w-md p-4 pb-[env(safe-area-inset-bottom,16px)]">
          {/* פאנל המודל: גובה מקס' וגלילה פנימית */}
          <div
            className="rounded-2xl bg-white shadow pointer-events-auto
                       max-h-[85vh] overflow-y-auto"
          >
            {/* כותרת */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur p-4 border-b rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800">✕</button>
              </div>
            </div>

            {/* תוכן */}
            <div className="p-4">{children}</div>

            {/* רווח תחתון לבטיחות מול המקלדת/בר תחתון */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
