import { createClient } from "@supabase/supabase-js";

// יצירת Supabase Client בצד השרת בלבד (עם מפתח service)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // לא לאפשר גישה ב־GET כדי למנוע קריאות מבחוץ
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, group_id } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }

    // 1️⃣ צור משתמש חדש או קיים במערכת Supabase Auth
 const { data: user, error: userError } =
  await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://hometrackpro.vercel.app/set-password",
  });

    if (userError) throw userError;

    // 2️⃣ צור רשומה בטבלת invitations (אם תרצה לשמור מעקב)
    if (group_id) {
      await supabaseAdmin.from("group_invitations").insert([
        {
          invitee_email: email,
          inviter_id: user?.id ?? null,
          group_id,
          status: "pending",
        },
      ]);
    }

    return res.status(200).json({
      message: "Invitation sent successfully",
      email,
    });
  } catch (err) {
    console.error("Invite error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
}
