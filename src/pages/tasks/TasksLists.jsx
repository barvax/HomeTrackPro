import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function TasksLists() {
  const [tasks, setTasks] = useState([]);
  const [items, setItems] = useState({}); // { taskId: [items] }
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  /* ---------------------- LOAD TASKS ---------------------- */
  async function loadTasks() {
    setLoading(true);
    setErr("");

    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr) {
      setErr(uerr.message);
      setLoading(false);
      return;
    }
    const userId = ures?.user?.id;
    if (!userId) {
      setErr("לא נמצא משתמש מחובר");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) setErr(error.message);
    setTasks(data || []);
    setLoading(false);
  }

  /* ---------------------- CREATE TASK ---------------------- */
  async function handleCreateTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreatingTask(true);
    setErr("");

    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr) {
      setErr(uerr.message);
      setCreatingTask(false);
      return;
    }
    const userId = ures?.user?.id;

    const { error } = await supabase.from("tasks").insert([
      {
        user_id: userId,
        title: newTitle.trim(),
      },
    ]);

    if (error) setErr(error.message);

    setNewTitle("");
    setCreatingTask(false);
    await loadTasks();
  }

  /* ---------------------- LOAD SUB ITEMS ---------------------- */
  async function loadTaskItems(taskId) {
    const { data, error } = await supabase
      .from("task_items")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (!error) {
      setItems((prev) => ({ ...prev, [taskId]: data }));
    }
  }

  /* ---------------------- ADD SUB TASK ---------------------- */
  async function addItem(taskId, text, resetInput) {
    if (!text.trim()) return;

    const { error } = await supabase.from("task_items").insert([
      {
        task_id: taskId,
        text: text.trim(),
      },
    ]);

    if (!error) {
      resetInput("");
      await loadTaskItems(taskId);
    }
  }

  /* ---------------------- TOGGLE DONE ---------------------- */
  async function toggleDone(item) {
    const { error } = await supabase
      .from("task_items")
      .update({ done: !item.done })
      .eq("id", item.id);

    if (!error) {
      setItems((prev) => ({
        ...prev,
        [item.task_id]: prev[item.task_id].map((i) =>
          i.id === item.id ? { ...i, done: !item.done } : i
        ),
      }));
    }
  }

  /* ---------------------- DELETE SUB TASK ---------------------- */
  async function deleteItem(item) {
    const { error } = await supabase
      .from("task_items")
      .delete()
      .eq("id", item.id);

    if (!error) {
      setItems((prev) => ({
        ...prev,
        [item.task_id]: prev[item.task_id].filter((i) => i.id !== item.id),
      }));
    }
  }

  /* ---------------------- DELETE WHOLE TASK ---------------------- */
  async function deleteTask(task) {
    const ok = window.confirm(
      `למחוק את הרשימה "${task.title}" ואת כל הפריטים שבה?`
    );
    if (!ok) return;

    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      setErr(error.message);
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setItems((prev) => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    if (openTaskId === task.id) {
      setOpenTaskId(null);
    }
  }

  /* ---------------------- DUPLICATE TASK ---------------------- */
  async function duplicateTask(task) {
    setErr("");

    const { data: ures, error: uerr } = await supabase.auth.getUser();
    if (uerr) {
      setErr(uerr.message);
      return;
    }
    const userId = ures?.user?.id;
    if (!userId) {
      setErr("לא נמצא משתמש מחובר");
      return;
    }

    const newTitle = `${task.title} (העתק)`;

    const { data: newTaskRows, error: insErr } = await supabase
      .from("tasks")
      .insert([{ user_id: userId, title: newTitle }])
      .select()
      .single();

    if (insErr) {
      setErr(insErr.message);
      return;
    }

    const newTaskId = newTaskRows.id;

    const { data: srcItems, error: srcErr } = await supabase
      .from("task_items")
      .select("*")
      .eq("task_id", task.id);

    if (srcErr) {
      setErr(srcErr.message);
      return;
    }

    if (srcItems && srcItems.length > 0) {
      const cloneRows = srcItems.map((it) => ({
        task_id: newTaskId,
        text: it.text,
        done: it.done,
      }));

      const { error: cloneErr } = await supabase
        .from("task_items")
        .insert(cloneRows);

      if (cloneErr) {
        setErr(cloneErr.message);
        return;
      }
    }

    await loadTasks();
    await loadTaskItems(newTaskId);
    setOpenTaskId(newTaskId);
  }

  /* ---------------------- RENAME TASK ---------------------- */
  async function renameTask(task) {
    const newName = window.prompt("עריכת שם הרשימה:", task.title);
    if (!newName) return; // ביטול
    const trimmed = newName.trim();
    if (!trimmed || trimmed === task.title.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ title: trimmed })
      .eq("id", task.id);

    if (error) {
      setErr(error.message);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, title: trimmed } : t))
    );
  }

  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">רשימות</h2>

      {/* יצירת Task חדש */}
      <form
        onSubmit={handleCreateTask}
        className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
      >
        <input
          type="text"
          placeholder="כותרת רשימה חדשה (למשל: רשימת קניות)"
          className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm bg-white"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />

        <button
          type="submit"
          disabled={creatingTask || !newTitle.trim()}
          className="rounded-xl px-4 py-2 bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {creatingTask ? "יוצר..." : "צור רשימה"}
        </button>
      </form>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading && <div className="text-sm text-zinc-500">טוען רשימות…</div>}

      {!loading && tasks.length === 0 && (
        <div className="text-sm text-zinc-500">
          אין רשימות עדיין. אפשר להתחיל ליצור 😊
        </div>
      )}

      {/* TASK ACCORDIONS */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isOpen = openTaskId === task.id;
          const subItems = items[task.id];

          return (
            <div
              key={task.id}
              className="rounded-xl bg-white shadow border border-zinc-200"
            >
              {/* HEADER ROW */}
              <div className="flex items-center justify-between px-3 py-2.5">
                {/* כותרת + פתיחה/סגירה */}
                <button
                  type="button"
                  onClick={() => {
                    if (isOpen) {
                      setOpenTaskId(null);
                    } else {
                      setOpenTaskId(task.id);
                      if (!items[task.id]) loadTaskItems(task.id);
                    }
                  }}
                  className="flex-1 text-right"
                >
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className="text-xs text-zinc-500">
                    {isOpen ? "סגור" : "פתח"}
                  </div>
                </button>

                {/* כפתורי פעולה על הטאסק */}
                <div className="flex items-center gap-2 mr-2">
                  {/* עריכה */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameTask(task);
                    }}
                    className="text-zinc-500 hover:text-zinc-800"
                    title="עריכת שם הרשימה"
                  >
                    <Icons.Pencil size={18} />
                  </button>

                  {/* שכפול */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateTask(task);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title="שכפל רשימה"
                  >
                    <Icons.Copy size={18} />
                  </button>

                  {/* מחיקה */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task);
                    }}
                    className="text-red-600 hover:text-red-800"
                    title="מחק רשימה"
                  >
                    <Icons.Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* BODY */}
              {isOpen && (
                <div className="border-t border-zinc-100 px-3 py-3 space-y-3">
                  {/* Loading */}
                  {!subItems && (
                    <div className="text-xs text-zinc-500">טוען פריטים…</div>
                  )}

                  {/* Empty */}
                  {subItems && subItems.length === 0 && (
                    <div className="text-xs text-zinc-500">
                      אין פריטים עדיין.
                    </div>
                  )}

                  {/* LIST OF SUB ITEMS */}
                  {subItems &&
                    subItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border"
                      >
                        {/* Checkbox + Text */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleDone(item)}
                            className="w-5 h-5 border-2 border-zinc-400 rounded"
                          />

                          <span
                            className={
                              item.done
                                ? "line-through text-zinc-400"
                                : "text-zinc-700"
                            }
                          >
                            {item.text}
                          </span>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => deleteItem(item)}
                          className="text-zinc-500 hover:text-red-600"
                          title="מחק פריט"
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                  {/* ADD NEW SUB ITEM */}
                  <AddSubItem taskId={task.id} addItem={addItem} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------- COMPONENT: Add Sub Item ---------------------- */
function AddSubItem({ taskId, addItem }) {
  const [text, setText] = useState("");

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="הוסף פריט חדש…"
        className="flex-1 rounded-lg border px-3 py-2 text-sm bg-white"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={() => addItem(taskId, text, setText)}
        disabled={!text.trim()}
        className="rounded-lg px-3 py-2 bg-blue-600 text-white text-sm disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
