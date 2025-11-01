import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function InboxIcon() {
  const [unreadCount, setUnreadCount] = useState(0);




  
  useEffect(() => {
    fetchUnreadCount();

    // מנוי לשינויים בזמן אמת (Realtime)
    const channel = supabase
      .channel("messages_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchUnreadCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    setUnreadCount(count || 0);
  }

  return (
    <div className="relative cursor-pointer">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-6 h-6 text-zinc-800"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.03 1.888l-7.5 4.5a2.25 2.25 0 01-2.44 0l-7.5-4.5A2.25 2.25 0 012.25 6.993V6.75"
        />
      </svg>

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
