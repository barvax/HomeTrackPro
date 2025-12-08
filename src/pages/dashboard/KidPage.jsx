// src/pages/dashboard/KidPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import KidActionModal from "../../components/KidActionModal";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function KidPage() {
  const { id } = useParams();
  const [kid, setKid] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null); // "add" | "subtract" | null

  useEffect(() => {
    loadKid();
  }, []);

  async function loadKid() {
    setLoading(true);

    // טוען את הילד
    const { data: kidRows, error: kidErr } = await supabase
      .from("kids")
      .select("*")
      .eq("id", id)
      .single();

    if (kidErr) console.error(kidErr);

    setKid(kidRows);

    // טוען לוג
    const { data: logRows, error: logErr } = await supabase
      .from("kids_log")
      .select("*")
      .eq("kid_id", id)
      .order("created_at", { ascending: false });

    if (logErr) console.error(logErr);

    setLog(logRows || []);
    setLoading(false);
  }

  // ❗❗ פונקציה מתוקנת לחלוטין — היתרה סוף סוף תשתנה ❗❗
  async function applyChange(amount, note) {
    if (!kid) return;

    // amount מגיע כמספר חיובי — כאן נקבע אם להוריד או להוסיף
    const change = Number(amount);
    if (isNaN(change) || change === 0) return;

    const currentBalance = Number(kid.balance) || 0;
    const newBalance = currentBalance + change; // change כבר כולל + או -

    // 1) מכניס ללוג
    const { error: logErr } = await supabase.from("kids_log").insert([
      {
        kid_id: kid.id,
        change: change, // מספר בלבד
        description: note || null,
        user_id: null,
      },
    ]);

    if (logErr) {
      console.error("Log error:", logErr);
      return;
    }

    // 2) מעדכן יתרה בטבלת kids — פה הייתה הבעיה! 
    const { error: updErr } = await supabase
      .from("kids")
      .update({ balance: newBalance }) // חייב להיות מספר
      .eq("id", kid.id);

    if (updErr) {
      console.error("Update error:", updErr);
      return;
    }

    // 3) רענון הדף
    await loadKid();

    // 4) סגירת מודאל
    setShowModal(null);
  }

  if (loading || !kid) return <div className="p-4">טוען...</div>;

  return (
    <div className="p-4">

      <Link to="/dashboard" className="flex items-center text-blue-600 mb-3">
        <ArrowLeft size={18} className="ml-1" />
        חזרה
      </Link>

      <h1 className="text-2xl font-semibold mb-2">{kid.name}</h1>

      {/* תצוגת יתרה */}
      <div className="text-lg mb-4">
        יתרה נוכחית: <span className="font-bold">{kid.balance} ₪</span>
      </div>

      {/* כפתורי פעולות */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowModal("add")}
          className="px-4 py-2 bg-green-600 text-white rounded-xl shadow hover:bg-green-700"
        >
          הוסף כסף +
        </button>
        <button
          onClick={() => setShowModal("subtract")}
          className="px-4 py-2 bg-red-600 text-white rounded-xl shadow hover:bg-red-700"
        >
          הורד כסף -
        </button>
      </div>

      {/* לוג פעולות */}
      <h2 className="text-xl font-semibold mb-2">לוג פעולות</h2>

      {log.length === 0 && (
        <div className="text-zinc-500">אין פעולות עדיין.</div>
      )}

      <div className="space-y-2">
        {log.map((row) => (
          <div
            key={row.id}
            className="p-3 bg-white border rounded-xl shadow-sm flex justify-between"
          >
            <div>
              <div className="font-medium">
                {row.change > 0 ? "הוספה" : "הורדה"}: {row.change} ₪
              </div>
              {row.description && (
                <div className="text-sm text-zinc-600">{row.description}</div>
              )}
            </div>

            <div className="text-sm text-zinc-500">
              {new Date(row.created_at).toLocaleString("he-IL")}
            </div>
          </div>
        ))}
      </div>

      {/* מודל פעולה */}
      {showModal && (
        <KidActionModal
          mode={showModal} // "add" | "subtract"
          onClose={() => setShowModal(null)}
          onSubmit={applyChange}
        />
      )}
    </div>
  );
}
