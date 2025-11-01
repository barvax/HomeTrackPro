import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Trash2, CheckCircle2, Circle } from "lucide-react";

export default function Inbox() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    fetchMessages();

    // עדכונים בזמן אמת
    const channel = supabase
      .channel("messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchMessages()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchMessages() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setMessages(data);
  }

  async function toggleRead(id, isRead) {
    const { error } = await supabase.rpc("mark_message_read", {
      mid: id,
      state: !isRead,
    });
    if (error) console.error(error);
    fetchMessages();
  }

  async function deleteMessage(id) {
    if (!confirm("למחוק הודעה זו?")) return;
    const { error } = await supabase.rpc("delete_message", { mid: id });
    if (error) console.error(error);
    fetchMessages();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📩 תיבת הודעות</h1>

      {messages.length === 0 ? (
        <p className="text-zinc-500 text-center mt-10">אין הודעות.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border p-4 flex justify-between items-start transition ${
                m.is_read
                  ? "bg-white border-zinc-200"
                  : "bg-zinc-50 border-zinc-400"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {m.is_read ? (
                    <CheckCircle2
                      size={18}
                      className="text-green-500 cursor-pointer"
                      onClick={() => toggleRead(m.id, m.is_read)}
                      title="סמן כלא נקרא"
                    />
                  ) : (
                    <Circle
                      size={18}
                      className="text-zinc-400 cursor-pointer"
                      onClick={() => toggleRead(m.id, m.is_read)}
                      title="סמן כנקרא"
                    />
                  )}
                  <h2
                    className={`font-semibold ${
                      m.is_read ? "text-zinc-700" : "text-black"
                    }`}
                  >
                    {m.subject}
                  </h2>
                </div>
                <p className="text-sm text-zinc-600">{m.body}</p>
                <p className="text-xs text-zinc-400 mt-2">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>

              <Trash2
                size={18}
                className="text-zinc-500 hover:text-red-500 cursor-pointer ml-3 mt-1"
                onClick={() => deleteMessage(m.id)}
                title="מחק הודעה"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
