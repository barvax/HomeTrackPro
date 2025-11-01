import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ודא שאנחנו באמת מקבלים JSON
    const { email, inviter_id } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }

    // שליחת הזמנה
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { inviter_id },
      redirectTo: "https://hometrackpro.vercel.app/set-password",
    });

    if (error) {
      console.error("Invite error:", error);
      return res.status(500).json({ message: "Invite failed", error: error.message });
    }

    return res.status(200).json({ message: "Invitation sent successfully", data });
  } catch (err) {
    console.error("Unexpected server error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message || "Unknown error" });
  }
}
