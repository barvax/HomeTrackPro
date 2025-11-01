import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, inviter_id } = req.body;

  try {
    // שליחת הזמנה עם redirect תקין
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { inviter_id },
      redirectTo: "https://hometrackpro.vercel.app/set-password",
    });

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }

    return res.status(200).json({ message: "Invitation sent successfully", data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ message: "Unexpected error", error: err.message });
  }
}
