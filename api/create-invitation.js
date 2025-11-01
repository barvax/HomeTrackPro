import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req, res) {
  // רק POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, group_id, invited_by } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // ולידציה
    if (!email || !group_id || !invited_by) {
      return res.status(400).json({ 
        error: "Missing required fields: email, group_id, invited_by" 
      });
    }

    // בדוק שהמשתמש הוא owner של הקבוצה
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("group_members")
      .select("role")
      .eq("group_id", group_id)
      .eq("user_id", invited_by)
      .single();

    if (memberError || !memberData || memberData.role !== "owner") {
      return res.status(403).json({ 
        error: "Only group owners can send invitations" 
      });
    }

    // בדוק אם המייל המוזמן כבר משויך למשתמש שנמצא בקבוצה
    // קודם נמצא את ה-user_id לפי המייל
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userWithEmail = existingUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (userWithEmail) {
      // אם המשתמש קיים, בדוק אם הוא כבר בקבוצה
      const { data: existingMember } = await supabaseAdmin
        .from("group_members")
        .select("id")
        .eq("group_id", group_id)
        .eq("user_id", userWithEmail.id);

      if (existingMember && existingMember.length > 0) {
        return res.status(400).json({ 
          error: "User is already a member of this group" 
        });
      }
    }

    // בדוק אם יש כבר הזמנה pending לאימייל הזה בקבוצה הזו
    const { data: existingInvite } = await supabaseAdmin
      .from("group_invitations")
      .select("id, status, expires_at")
      .eq("group_id", group_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (existingInvite && existingInvite.length > 0) {
      return res.status(400).json({ 
        error: "An active invitation already exists for this email" 
      });
    }

    // צור token ייחודי (32 bytes = 64 chars hex)
    const token = crypto.randomBytes(32).toString("hex");

    // שמור את ההזמנה בטבלה
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("group_invitations")
      .insert({
        group_id: group_id,
        email: email.toLowerCase(),
        invited_by: invited_by,
        token: token,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).json({ 
        error: "Failed to create invitation",
        details: insertError.message 
      });
    }

    // צור את קישור ההזמנה
    const inviteLink = `https://hometrackpro.vercel.app/join?token=${token}`;

    console.log("✅ Invitation created:", {
      id: invitation.id,
      email: email,
      group_id: group_id,
      link: inviteLink,
    });

    // כאן תוכל להוסיף שליחת מייל בעתיד
    // לדוגמה: await sendEmail(email, inviteLink);

    return res.status(200).json({
      success: true,
      message: "Invitation created successfully",
      invitation_id: invitation.id,
      invite_link: inviteLink,
      expires_at: invitation.expires_at,
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      details: err.message 
    });
  }
}