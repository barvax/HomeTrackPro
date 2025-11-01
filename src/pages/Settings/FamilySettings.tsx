import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

interface Member {
  id: string;
  email: string;
  role: "owner" | "member";
}

export default function FamilySettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [userRole, setUserRole] = useState<"owner" | "member">("member");
  const [loading, setLoading] = useState(true);

  // Fetch group + members
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        // Get group ID and role
        const { data: gm, error: gmError } = await supabase
          .from("group_members")
          .select("group_id, role")
          .eq("user_id", userId)
          .single();

        if (gmError || !gm) return;

        setGroupId(gm.group_id);
        setUserRole(gm.role);

        // Fetch group details
        const { data: groupData } = await supabase
          .from("groups")
          .select("id, name, is_premium")
          .eq("id", gm.group_id)
          .single();

        if (groupData) {
          setGroupName(groupData.name);
          setIsPremium(groupData.is_premium);
        }

        // Fetch all members
        const { data: membersData } = await supabase
          .from("group_members")
          .select("id, role, user_id")
          .eq("group_id", gm.group_id);

        if (!membersData) return;

        // Fetch user list securely from backend
        const response = await fetch("/api/list-users");
        const { users } = await response.json();

        const formatted = membersData.map((m: any) => ({
          id: m.id,
          email: users.find((u: any) => u.id === m.user_id)?.email ?? "",
          role: m.role,
        }));

        setMembers(formatted);
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, []);

  // Invite new member (via server API)
  const handleInvite = async () => {
    if (!inviteEmail || !groupId) return;
    try {
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, group_id: groupId }),
      });

      const result = await res.json();
      if (res.ok) {
        alert("הזמנה נשלחה בהצלחה 🎉");
        setMembers([...members, { id: result.user.id, email: result.user.email, role: "member" }]);
        setInviteEmail("");
      } else {
        alert("שגיאה: " + result.error);
      }
    } catch (err: any) {
      alert("שגיאת שרת: " + err.message);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (userRole !== "owner") return alert("רק בעל הקבוצה יכול להסיר חברים.");
    await supabase.from("group_members").delete().eq("id", memberId);
    setMembers(members.filter((m) => m.id !== memberId));
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
              הוסף
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
