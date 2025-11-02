import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, user_id } = 
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!token || !user_id) {
      return res.status(400).json({ 
        error: "Missing required fields: token, user_id" 
      });
    }

    // מצא את ההזמנה
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("group_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ 
        error: "Invalid or expired invitation" 
      });
    }

    // בדוק שהמשתמש לא כבר בקבוצה
    const { data: existingMember } = await supabaseAdmin
      .from("group_members")
      .select("id")
      .eq("group_id", invitation.group_id)
      .eq("user_id", user_id);

    if (existingMember && existingMember.length > 0) {
      return res.status(400).json({ 
        error: "User is already a member of this group" 
      });
    }

    // הוסף את המשתמש לקבוצה (Service Role עוקף RLS)
    const { data: member, error: memberError } = await supabaseAdmin
      .from("group_members")
      .insert({
        group_id: invitation.group_id,
        user_id: user_id,
        role: "member"
      })
      .select()
      .single();

    if (memberError) {
      console.error("Member insert error:", memberError);
      return res.status(500).json({ 
        error: "Failed to add member to group",
        details: memberError.message 
      });
    }

    // עדכן את סטטוס ההזמנה
    await supabaseAdmin
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return res.status(200).json({
      success: true,
      message: "Successfully joined group",
      group_id: invitation.group_id,
      member_id: member.id
    });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      details: err.message 
    });
  }
}