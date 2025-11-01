import { createClient } from "@supabase/supabase-js";

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
    const { email, group_id } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }

    // ✅ שליחת הזמנה עם redirectTo מדויק
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: "https://hometrackpro.vercel.app/set-password",
        // 🔥 חשוב! data יועבר בתוך הטוקן ונוכל לגשת אליו אחר כך
        data: {
          group_id: group_id,
          invited: true,
        },
      }
    );

    if (error) {
      console.error("Supabase invite error:", error);
      return res
        .status(500)
        .json({ message: "Invite failed", error: error.message });
    }

    // אם ההזמנה הצליחה, הוסף אותו לקבוצה
    if (data.user) {
      const { error: memberError } = await supabaseAdmin
        .from("group_members")
        .insert({
          group_id: group_id,
          user_id: data.user.id,
          role: "member",
        });

      if (memberError) {
        console.error("Error adding to group:", memberError);
      }
    }

    console.log("✅ Invitation sent:", data);
    return res.status(200).json({ message: "Invitation sent successfully" });
  } catch (err) {
    console.error("Server error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
}