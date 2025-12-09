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

    const { data: ures } = await supabase.auth.getUser();
    const userId = ures?.user?.id;

    const { error } = await supabase
      .from("tasks")
      .insert([{ user_id: userId, title: newTitle.trim() }]);

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

    const { error } = await supabase
      .from("task_items")
      .insert([{ task_id: taskId, text: text.trim() }]);

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
    if (error) return setErr(error.message);

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setItems((prev) => {
      const copy = { ...prev };
      delete copy[task.id];
      return copy;
    });
    if (openTaskId === task.id) setOpenTaskId(null);
  }

  /* ---------------------- DUPLICATE TASK ---------------------- */
  async function duplicateTask(task) {
    setErr("");

    const { data: ures } = await supabase.auth.getUser();
    const userId = ures?.user?.id;

    const newTitle = `${task.title} (העתק)`;

    const { data: newTaskRows, error: insErr } = await supabase
      .from("tasks")
      .insert([{ user_id: userId, title: newTitle }])
      .select()
      .single();

    if (insErr) return setErr(insErr.message);

    const newTaskId = newTaskRows.id;

    const { data: srcItems } = await supabase
      .from("task_items")
      .select("*")
      .eq("task_id", task.id);

    if (srcItems && srcItems.length > 0) {
      const cloneRows = srcItems.map((i) => ({
        task_id: newTaskId,
        text: i.text,
        done: i.done,
      }));
      await supabase.from("task_items").insert(cloneRows);
    }

    await loadTasks();
    await loadTaskItems(newTaskId);
    setOpenTaskId(newTaskId);
  }

  /* ---------------------- RENAME TASK ---------------------- */
  async function renameTask(task) {
    const newName = window.prompt("עריכת שם הרשימה:", task.title);
    if (!newName) return;

    const trimmed = newName.trim();
    if (!trimmed || trimmed === task.title.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ title: trimmed })
      .eq("id", task.id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, title: trimmed } : t))
      );
    }
  }

  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="max-w-3xl mx-auto px-4 overflow-x-hidden space-y-4">
      <h2 className="text-lg font-semibold">רשימות</h2>

      {/* יצירת רשימה */}
      <form
        onSubmit={handleCreateTask}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          placeholder="כותרת רשימה חדשה (למשל: רשימת קניות)"
          className="flex-1 rounded-xl border px-3 py-2 bg-white text-sm"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || creatingTask}
          className="rounded-xl px-4 py-2 bg-blue-600 text-white text-sm"
        >
          {creatingTask ? "יוצר..." : "צור רשימה"}
        </button>
      </form>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading && <div className="text-sm text-zinc-500">טוען…</div>}

      {!loading && tasks.length === 0 && (
        <div className="text-sm text-zinc-500">אין רשימות עדיין.</div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => {
          const isOpen = openTaskId === task.id;
          const subItems = items[task.id];

          return (
            <div
              key={task.id}
              className="rounded-xl bg-white border shadow-sm"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-medium text-sm">{task.title}</span>

                  <button
                    onClick={() => renameTask(task)}
                    className="text-zinc-500 hover:text-zinc-800"
                  >
                    <Icons.Pencil size={18} />
                  </button>

                  <button
                    onClick={() => duplicateTask(task)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Icons.Copy size={18} />
                  </button>

                  <button
                    onClick={() => deleteTask(task)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Icons.Trash2 size={18} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (isOpen) {
                      setOpenTaskId(null);
                    } else {
                      setOpenTaskId(task.id);
                      if (!items[task.id]) loadTaskItems(task.id);
                    }
                  }}
                  className="flex items-center gap-1 text-zinc-600 hover:text-black"
                >
                  <span className="text-sm">{isOpen ? "סגור" : "פתח"}</span>
                  {isOpen ? (
                    <Icons.ChevronDown size={16} />
                  ) : (
                    <Icons.ChevronLeft size={16} />
                  )}
                </button>
              </div>

              {/* BODY */}
              {isOpen && (
                <div className="px-3 py-3 border-t space-y-3">
                  {!subItems && (
                    <div className="text-xs text-zinc-500">טוען פריטים…</div>
                  )}

                  {subItems && subItems.length === 0 && (
                    <div className="text-xs text-zinc-500">אין פריטים.</div>
                  )}

                  {/* ITEMS */}
                  {subItems &&
                    subItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleDone(item)}
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

                        <button
                          onClick={() => deleteItem(item)}
                          className="text-zinc-500 hover:text-red-600"
                        >
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                  <AddSubItem
                    taskId={task.id}
                    addItem={addItem}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------- AddSubItem Component ---------------------- */
function AddSubItem({ taskId, addItem }) {
  const [text, setText] = useState("");

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="הוסף פריט…"
        className="flex-1 rounded-lg border px-3 py-2 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={() => addItem(taskId, text, setText)}
        className="rounded-lg px-3 py-2 bg-blue-600 text-white text-sm"
      >
        הוסף
      </button>
    </div>
  );
}
