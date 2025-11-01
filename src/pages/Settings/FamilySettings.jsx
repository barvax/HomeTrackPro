import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function FamilySettings() {
  const [members, setMembers] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [userRole, setUserRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState(""); // לשמירת הקישור

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return;

        const userId = userData.user.id;

        const { data: gm, error: gmError } = await supabase
          .from("group_members")
          .select("group_id, role")
          .eq("user_id", userId)
          .single();

        if (gmError || !gm) return;

        setGroupId(gm.group_id);
        setUserRole(gm.role);

        const { data: groupData } = await supabase
          .from("groups")
          .select("id, name, is_premium")
          .eq("id", gm.group_id)
          .single();

        if (groupData) {
          setGroupName(groupData.name);
          setIsPremium(groupData.is_premium);
        }

        const { data: membersData } = await supabase
          .from("group_members")
          .select("id, role, user_id")
          .eq("group_id", gm.group_id);

        const response = await fetch("/api/list-users");
        const { users } = await response.json();

        const formatted = membersData.map((m) => ({
          id: m.id,
          email: users.find((u) => u.id === m.user_id)?.email || "",
          role: m.role,
        }));

        setMembers(formatted);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail || !groupId) {
      alert("נא להזין אימייל תקין.");
      return;
    }

    // בדיקת פורמט מייל בסיסית
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      alert("כתובת המייל אינה תקינה.");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const res = await fetch("/api/create-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: inviteEmail, 
          group_id: groupId,
          invited_by: userData.user.id 
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result);
        alert("שגיאה: " + (result.error || "שליחה נכשלה"));
        return;
      }

      // שמור את הקישור להצגה
      setInviteLink(result.invite_link);

      alert(`ההזמנה נוצרה בהצלחה! 🎉\n\nהקישור הועתק למטה - שלח אותו ל-${inviteEmail}`);
      
      setInviteEmail("");
    } catch (err) {
      console.error(err);
      alert("שגיאת שרת: " + err.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert("הקישור הועתק ללוח! 📋");
  };

  const handleRemove = async (memberId) => {
    if (userRole !== "owner") {
      alert("רק בעל הקבוצה יכול להסיר חברים.");
      return;
    }

    const confirmed = window.confirm("האם אתה בטוח שברצונך להסיר חבר זה?");
    if (!confirmed) return;

    await supabase.from("group_members").delete().eq("id", memberId);
    setMembers((m) => m.filter((x) => x.id !== memberId));
    alert("החבר הוסר בהצלחה.");
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md mt-6 text-center text-gray-500">
        טוען נתונים...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{groupName || "קבוצה משפחתית"}</h2>
        {isPremium && (
          <span className="text-sm text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-lg">
            PREMIUM
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2">חברי המשפחה</h3>
      <ul className="space-y-2 mb-4">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg"
          >
            <span>{m.email}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{m.role}</span>
              {userRole === "owner" && m.role !== "owner" && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  הסר
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {userRole === "owner" && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-semibold mb-2">הוסף חבר חדש</h4>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="אימייל להזמנה..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleInvite}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              צור הזמנה
            </button>
          </div>

          {/* הצגת קישור ההזמנה */}
          {inviteLink && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold mb-2">📧 קישור הזמנה:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  העתק
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                שלח קישור זה למשתמש החדש. הקישור תקף ל-7 ימים.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}