// src/pages/dashboard/DashboardKids.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
export default function DashboardKids() {
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true);

const location = useLocation();

useEffect(() => {
  loadKids();
}, [location]);
  async function loadKids() {
    setLoading(true);

    const { data: ures } = await supabase.auth.getUser();
    const userId = ures?.user?.id;

    const { data: groupRows } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .limit(1);

    const gid = groupRows?.[0]?.group_id;

    const { data: kidsRows } = await supabase
      .from("kids")
      .select("*")
      .eq("group_id", gid)
      .order("created_at", { ascending: true });

    setKids(kidsRows || []);
    setLoading(false);
  }

  return (
    <div className="p-4">

      <h1 className="text-xl font-semibold mb-4">ילדים</h1>

      {loading && <div>טוען...</div>}

      {!loading && kids.length === 0 && (
        <div className="text-zinc-500">אין ילדים עדיין (יש להוסיף במסך ההגדרות).</div>
      )}

      <div className="space-y-3">
        {kids.map((kid) => (
          <Link
            key={kid.id}
            to={`/kid/${kid.id}`}
            className="block p-4 bg-white border rounded-xl shadow hover:bg-blue-50"
          >
            <div className="font-medium text-lg">{kid.name}</div>
            <div className="text-sm text-zinc-600">
              יתרה: {kid.balance} ₪
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
