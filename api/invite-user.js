import { createClient } from "@supabase/supabase-js";

// תומך גם ב-Vite וגם ב-Vercel
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, inviter_id } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }

    // ✅ שליחת מייל מסוג “Invite User” בלבד
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://hometrackpro.vercel.app/set-password",
    });

    if (error) {
      console.error("Supabase invite error:", error);
      return res.status(500).json({ message: "Invite failed", error: error.message });
    }

    console.log("✅ Invitation sent:", data);
    return res.status(200).json({ message: "Invitation sent successfully" });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}
