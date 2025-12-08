import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";


const CURRENCY = "₪";
const fmt = (n) =>
  new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

function getYmFromQuery(search) {
  const p = new URLSearchParams(search);
  const y = Number(p.get("y"));
  const m = Number(p.get("m")); // 1..12
  const d = new Date();
  const year = y || d.getFullYear();
  const month = m ? m - 1 : d.getMonth(); // 0..11
  return { year, month };
}

function monthRange(year, month0) {
  // month0: 0..11
  const mm = String(month0 + 1).padStart(2, "0");

  // next month with year rollover
  const nextY = month0 === 11 ? year + 1 : year;
  const nextM = month0 === 11 ? 1 : month0 + 2;
  const mm2 = String(nextM).padStart(2, "0");

  const startIso = `${year}-${mm}-01`;
  const endIso = `${nextY}-${mm2}-01`;
  return { startIso, endIso };
}

function monthLabel(y, m0) {
  return new Date(y, m0, 1).toLocaleString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

function CategoryIcon({ name, className = "" }) {
  const Icon = (name && Icons[name]) || Icons.Folder;
  return <Icon size={18} className={`text-zinc-600 ${className}`} />;
}

export default function MonthlyDetails() {
  const { search } = useLocation();
  const { year, month } = getYmFromQuery(search);
  const { startIso, endIso } = monthRange(year, month);

  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // מיון לפי תאריך: near = הכי קרוב להיום (דיפולט), asc = מהישן לחדש, desc = מהחדש לישן
  const [sortDir, setSortDir] = useState("near");

  const sortLabel =
    sortDir === "near"
      ? "תאריך (קרוב להיום)"
      : sortDir === "desc"
      ? "תאריך ↓"
      : "תאריך ↑";

  const handleToggleSort = () => {
    setSortDir((prev) => {
      if (prev === "near") return "desc"; // לחיצה ראשונה → חדש למעלה
      if (prev === "desc") return "asc";  // לחיצה שנייה → ישן למעלה
      return "desc";                      // ואז מחזור בין desc/asc
    });
  };

  // סינון קטגוריה (null = הכל)
  const [filterCatId, setFilterCatId] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
// מסנן סוג הוצאה (multi-select): one_time | recurring | installments
const [selectedModes, setSelectedModes] = useState([
  "one_time",
  "recurring",
  "installments",
]);

// פתיחת חלון מסנן סוג הוצאה
const [showTypeFilter, setShowTypeFilter] = useState(false);

  // פופ-אפ פרטי רשומה
  const [editingRow, setEditingRow] = useState(null);

  // טען רשומות לחודש
  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id, tx_date, amount, kind, mode, series_id, note,
          installment_no, installments_total, original_amount,
          category_id,
          category:categories(name, icon)
        `
        )
        .gte("tx_date", startIso)
        .lt("tx_date", endIso)
        .order("tx_date", { ascending: true });

      if (!live) return;
      if (error) setErr(error.message);
      else setRows(data || []);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [startIso, endIso]);

  // טען קטגוריות פעילות למשתמש (לסינון + עריכה)
  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (!live) return;
      if (!error) setCats(data || []);
    })();
    return () => {
      live = false;
    };
  }, []);

  // סינון לפי קטגוריה
// סינון לפי סוג הוצאה (על הוצאות בלבד), ואז לפי קטגוריה
const visibleRows = useMemo(() => {
  // שלב 1: סוג הוצאה
  const byType = rows.filter((r) => {
    if (r.kind === "income") return true; // המסנן משפיע רק על הוצאות
    const mode = r.mode || "one_time";   // ברירת מחדל להיסטוריות
    const active = selectedModes?.length
      ? selectedModes
      : ["one_time", "recurring", "installments"];
    return active.includes(mode);
  });

  // שלב 2: קטגוריה
  const filtered = !filterCatId
    ? byType
    : byType.filter((r) => r.category_id === filterCatId);

  // שלב 3: מיון לפי תאריך
  const sorted = [...filtered];
  if (!sorted.length) return sorted;

  const today = new Date();
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  sorted.sort((a, b) => {
    const ta = new Date(a.tx_date).getTime();
    const tb = new Date(b.tx_date).getTime();

    if (sortDir === "asc") {
      // מהישן לחדש
      return ta - tb;
    }
    if (sortDir === "desc") {
      // מהחדש לישן
      return tb - ta;
    }

    // sortDir === "near" – דיפולט: הכי קרוב להיום למעלה
    const da = Math.abs(ta - todayMid);
    const db = Math.abs(tb - todayMid);
    if (da !== db) return da - db; // מי שקרוב יותר עולה למעלה

    // במצב תיקו – מיון רגיל מהישן לחדש
    return ta - tb;
  });

  return sorted;
}, [rows, selectedModes, filterCatId, sortDir]);


  // סיכומים (לפי הסינון)
  const totals = useMemo(() => {
    const income = visibleRows
      .filter((r) => r.kind === "income")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const expense = visibleRows
      .filter((r) => r.kind === "expense")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return { income, expense, remaining: income - expense };
  }, [visibleRows]);

  async function handleDelete(row) {
    try {
      // עצירת bubble כדי לא לפתוח את חלון העריכה
      // (נשתמש בזה כשנלחץ על האיקון)
      // if (row._stopOpen) return;

      if (row.mode === "installments") {
        const ok = confirm("מחק את כל הסדרה של התשלומים?");
        if (!ok) return;
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("series_id", row.series_id);
        if (error) throw error;
        setRows((rs) => rs.filter((r) => r.series_id !== row.series_id));
        return;
      }

      if (row.mode === "recurring") {
        const monthStart = row.tx_date.slice(0, 7) + "-01"; // תחילת אותו חודש
        const ok = confirm("מחק את ההוצאה/הכנסה הקבועה מהחודש הזה והלאה?");
        if (!ok) return;
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("series_id", row.series_id)
          .gte("tx_date", monthStart);
        if (error) throw error;
        setRows((rs) =>
          rs.filter(
            (r) => !(r.series_id === row.series_id && r.tx_date >= monthStart)
          )
        );
        return;
      }

      // one_time
      const ok = confirm("למחוק את הרשומה?");
      if (!ok) return;
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  function openEdit(row) {
    setEditingRow(row);
  }

  function closeEdit() {
    setEditingRow(null);
  }

  // עדכון מקומי אחרי שמירה
  function patchRow(updated) {
    setRows((rs) =>
      rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
  }

return (
  <div className="max-w-3xl mx-auto px-4 py-6 overflow-x-hidden">
    {/* שורת עליונה – כותרת באמצע, חץ חזרה בצד ימין */}
  <div className="flex items-center justify-between mb-4">
    {/* ספייסר בצד שמאל לשמירה על סימטריה */}
    <div className="w-8" />

    {/* כותרת במרכז */}
    <h1 className="text-xl font-semibold text-center flex-1 ml-2">
      פירוט חודשי — {monthLabel(year, month)}
    </h1>

    {/* חזרה לסיכום – איקון בצד ימין */}
    <Link
      to="/"
      className="p-2 rounded-lg hover:bg-zinc-200 active:bg-zinc-300"
      title="חזרה לסיכום"
    >
      <ArrowRight size={22} className="text-zinc-700" />
    </Link>
  </div>

    {/* כפתורי סינון ומיון – בשורה נפרדת, רספונסיבי */}
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        onClick={() => setShowFilter(true)}
        className="rounded-xl px-3 py-2 bg-white shadow hover:bg-zinc-50 text-sm"
        title="סינון לפי קטגוריה"
      >
        סינון לפי קטגוריה
      </button>

      <button
        onClick={() => setShowTypeFilter(true)}
        className="rounded-xl px-3 py-2 bg-white shadow hover:bg-zinc-50 text-sm"
        title="סוג הוצאה"
      >
        סוג הוצאה
      </button>

      <button
        type="button"
        onClick={handleToggleSort}
        className="rounded-xl px-3 py-2 bg-white shadow hover:bg-zinc-50 text-sm"
        title="מיון לפי תאריך"
      >
        {sortLabel}
      </button>
    </div>

    {/* תיאור סינון פעיל */}
    {filterCatId && (
      <div className="mb-3 text-xs text-zinc-600">
        מסונן לפי:{" "}
        <span className="inline-flex items-center gap-1 font-medium">
          <CategoryIcon
            name={cats.find((c) => c.id === filterCatId)?.icon}
            className="!text-zinc-500"
          />
          {cats.find((c) => c.id === filterCatId)?.name || "—"}
        </span>
        <button
          onClick={() => setFilterCatId(null)}
          className="ml-2 text-blue-600 hover:underline"
        >
          נקה סינון
        </button>
      </div>
    )}

    {/* מודל סינון לפי סוג הוצאה */}
    {showTypeFilter && (
      <Modal title="בחר סוג הוצאה" onClose={() => setShowTypeFilter(false)}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "one_time", label: "חד־פעמי" },
              { id: "recurring", label: "קבועה" },
              { id: "installments", label: "תשלומים" },
            ].map((opt) => {
              const active = selectedModes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (active) {
                      // לא נשאיר מצב “ריק” — אם זה האחרון, אל תבטל
                      if (selectedModes.length === 1) return;
                      setSelectedModes(
                        selectedModes.filter((m) => m !== opt.id)
                      );
                    } else {
                      setSelectedModes([...selectedModes, opt.id]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-zinc-500">
              נבחרו {selectedModes.length}/3
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedModes(["one_time", "recurring", "installments"])
                }
                className="rounded-lg px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-sm"
              >
                איפוס
              </button>
              <button
                type="button"
                onClick={() => setShowTypeFilter(false)}
                className="rounded-lg px-3 py-1.5 bg-black text-white text-sm"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )}

    {/* סיכומים */}
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="rounded-xl bg-white shadow p-3 text-center">
        <div className="text-xs text-zinc-500">הכנסה</div>
        <div className="text-xs font-semibold">
          {CURRENCY} {fmt(totals.income)}
        </div>
      </div>
      <div className="rounded-xl bg-white shadow p-3 text-center">
        <div className="text-xs text-zinc-500">הוצאה</div>
        <div className="text-xs font-semibold">
          {CURRENCY} {fmt(totals.expense)}
        </div>
      </div>
      <div className="rounded-xl bg-white shadow p-3 text-center">
        <div className="text-xs text-zinc-500">
          {totals.remaining >= 0 ? "יתרה" : "במינוס"}
        </div>
        <div className="text-xs font-semibold">
          {CURRENCY} {fmt(Math.abs(totals.remaining))}
        </div>
      </div>
    </div>

    {err && (
      <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
        {err}
      </div>
    )}
    {loading && <div className="text-zinc-500">טוען…</div>}

    {/* רשימת רשומות */}
    {!loading && visibleRows.length === 0 && (
      <div className="text-zinc-500">אין רשומות לחודש הזה.</div>
    )}

    <div className="overflow-x-hidden">
      <ul className="space-y-2">
        {visibleRows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl bg-white shadow p-3 flex items-center justify-between cursor-pointer"
            onClick={() => openEdit(r)}
          >
            <div className="flex items-center gap-3">
              <CategoryIcon name={r.category?.icon} />
              <div>
                <div className="font-medium">
                  {r.category?.name || "—"}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(r.tx_date).toLocaleDateString("he-IL")}
                  {" · "}
                  {r.mode === "one_time" && "חד־פעמי"}
                  {r.mode === "installments" &&
                    `תשלומים ${r.installment_no}/${r.installments_total}`}
                  {r.mode === "recurring" && "קבועה"}
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`font-semibold ${
                  r.kind === "income"
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {r.kind === "income" ? "+" : "−"} {CURRENCY} {fmt(r.amount)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(r);
                }}
                className="text-zinc-500 hover:text-red-600"
                title="מחיקה"
                aria-label="מחיקה"
              >
                <Icons.Trash2 size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>

    {/* מודל סינון לפי קטגוריה */}
    {showFilter && (
      <Modal title="בחר קטגוריה" onClose={() => setShowFilter(false)}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => {
              setFilterCatId(null);
              setShowFilter(false);
            }}
            className={`flex items-center gap-2 rounded-xl border p-2 hover:bg-zinc-50 ${
              filterCatId === null ? "bg-zinc-100" : ""
            }`}
          >
            <Icons.ListChecks size={18} className="text-zinc-600" />
            הכל
          </button>

          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setFilterCatId(c.id);
                setShowFilter(false);
              }}
              className={`flex items-center gap-2 rounded-xl border p-2 hover:bg-zinc-50 ${
                filterCatId === c.id ? "bg-zinc-100" : ""
              }`}
            >
              <CategoryIcon name={c.icon} />
              {c.name}
            </button>
          ))}
        </div>
      </Modal>
    )}

    {/* מודל עריכת רשומה */}
    {editingRow && (
      <EditTransactionModal
        row={editingRow}
        cats={cats}
        onClose={closeEdit}
        onSaved={(updated) => {
          patchRow(updated);
          closeEdit();
        }}
      />
    )}
  </div>
);

}

/* ──────────────────────────────── */
/*      HELPERS / MODALS BELOW      */
/* ──────────────────────────────── */

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="mx-auto max-w-md p-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="rounded-2xl bg-white shadow max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur p-4 border-b rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  onClick={onClose}
                  className="text-zinc-500 hover:text-zinc-800"
                  aria-label="סגירה"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">{children}</div>
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditTransactionModal({ row, cats, onClose, onSaved }) {
  const [amount, setAmount] = useState(row.amount ?? "");
  const [date, setDate] = useState(row.tx_date?.slice(0, 10) ?? "");
  const [categoryId, setCategoryId] = useState(row.category_id ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    try {
      setErr("");
      setSaving(true);

      const payload = {
        amount: Number(amount),
        tx_date: date,
        category_id: categoryId || null,
        note: note || null,
      };

      const { data, error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", row.id)
        .select(
          `
          id, tx_date, amount, kind, mode, series_id, note,
          installment_no, installments_total, original_amount,
          category_id,
          category:categories(name, icon)
        `
        )
        .single();

      if (error) throw error;
      onSaved?.(data);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`פרטי ${row.kind === "income" ? "הכנסה" : "הוצאה"}`}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
          <div>מצב: {row.mode === "one_time" ? "חד־פעמי" : row.mode === "installments" ? "תשלומים" : "קבועה"}</div>
          {row.mode === "installments" && (
            <div>
              מספר תשלום: {row.installment_no}/{row.installments_total} (סכום
              מקורי: {fmt(row.original_amount)})
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            סכום
          </label>
          <input
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-xl border p-2.5 bg-zinc-50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            תאריך
          </label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border p-2.5 bg-zinc-50"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            קטגוריה
          </label>
          <select
            className="mt-1 w-full rounded-xl border p-2.5 bg-zinc-50"
            value={categoryId || ""}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            הערה (אופציונלי)
          </label>
          <input
            className="mt-1 w-full rounded-xl border p-2.5 bg-zinc-50"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="פרטים נוספים…"
          />
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200"
            disabled={saving}
          >
            ביטול
          </button>
          <button
            type="submit"
            className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "שומר…" : "שמור"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
