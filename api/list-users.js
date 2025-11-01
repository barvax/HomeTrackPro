/**
 * /api/list-users.js
 * 
 * ⚙️ Serverless API Route for HomeTrackPro
 * 📍 Runs on Vercel (server-side)
 * 🔒 Uses Supabase Service Role key securely (not exposed to client)
 */

import { createClient } from "@supabase/supabase-js";

// הגדר את הלקוח עם Service Role Key מהסביבה
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // הגבלת גישה רק לבקשות GET
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // שלוף את כל המשתמשים מה־Auth
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // החזר רשימה בפורמט פשוט
    return res.status(200).json({
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
      })),
    });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
