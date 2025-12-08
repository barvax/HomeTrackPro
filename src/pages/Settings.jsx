// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Trash2 } from "lucide-react";

export default function Settings() {
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [groupId, setGroupId] = useState(null);

  // נתוני ילד חדש
  const [kidName, setKidName] = useState("");
  const [kidBirth, setKidBirth] = useState("");

  useEffect(() => {
    loadKids();
  }, []);

  async function loadKids() {
    setLoading(true);

    // מביא את user_id
    const { data: ures } = await supabase.auth.getUser();
    const userId = ures?.user?.id;
    if (!userId) return;

    // מביא את group_id של המשתמש
    const { data: groupRows } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .limit(1);

    const gid = groupRows?.[0]?.group_id;
    setGroupId(gid);

    if (!gid) {
      setKids([]);
      setLoading(false);
      return;
    }

    // שליפת ילדים
    const { data: kidsRows } = await supabase
      .from("kids")
      .select("*")
      .eq("group_id", gid)
      .order("created_at", { ascending: true });

    setKids(kidsRows || []);
    setLoading(false);
  }

  async function handleAddKid(e) {
    e.preventDefault();
    if (!kidName.trim() || !groupId) return;

    const { error } = await supabase.from("kids").insert([
      {
        name: kidName.trim(),
        birthdate: kidBirth || null,
        balance: 0,
        group_id: groupId,
      },
    ]);

    if (error) {
      alert("שגיאה בהוספת ילד");
      return;
    }

    setKidName("");
    setKidBirth("");
    setShowAdd(false);
    loadKids();
  }

  async function handleDeleteKid(id) {
    const ok = confirm("למחוק את הילד מהרשימה?");
    if (!ok) return;

    const { error } = await supabase
      .from("kids")
      .delete()
      .eq("id", id);

    if (error) {
      alert("שגיאה במחיקה");
      return;
    }

    loadKids();
  }

  return (
    <div className="p-4">

      <h1 className="text-xl font-semibold mb-4">ניהול ילדים</h1>

      {/* כפתור הוספת ילד */}
      <button
        onClick={() => setShowAdd(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700"
      >
        הוסף ילד +
      </button>

      {/* רשימת ילדים */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">רשימת הילדים</h2>

        {loading && <div>טוען...</div>}

        {!loading && kids.length === 0 && (
          <div className="text-zinc-500">אין ילדים עדיין.</div>
        )}

        <ul className="space-y-2">
          {kids.map((kid) => (
            <li
              key={kid.id}
              className="p-3 border rounded-xl bg-white shadow-sm flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{kid.name}</div>
                {kid.birthdate && (
                  <div className="text-sm text-zinc-500">
                    תאריך לידה: {kid.birthdate}
                  </div>
                )}
              </div>

              {/* כפתור מחיקה */}
              <button
                onClick={() => handleDeleteKid(kid.id)}
                className="p-2 rounded-full hover:bg-red-50 text-red-600"
              >
                <Trash2 size={20} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* מודל הוספת ילד */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            
            <h2 className="text-lg font-semibold mb-4">הוסף ילד</h2>

            <form onSubmit={handleAddKid} className="space-y-3">
              
              <div>
                <label className="text-sm">שם הילד</label>
                <input
                  type="text"
                  value={kidName}
                  onChange={(e) => setKidName(e.target.value)}
                  className="w-full border rounded-xl p-2 mt-1 bg-zinc-50"
                  required
                />
              </div>

              <div>
                <label className="text-sm">תאריך לידה (לא חובה)</label>
                <input
                  type="date"
                  value={kidBirth}
                  onChange={(e) => setKidBirth(e.target.value)}
                  className="w-full border rounded-xl p-2 mt-1 bg-zinc-50"
                />
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300"
                >
                  ביטול
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700"
                >
                  שמירה
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
