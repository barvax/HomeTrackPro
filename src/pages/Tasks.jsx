import { useState } from "react";
import TasksLists from "./tasks/TasksLists";
import TasksEvents from "./tasks/TasksEvents";
import TasksCalendar from "./tasks/TasksCalendar";

export default function Tasks() {
  const [tab, setTab] = useState("lists");

  const tabs = [
    { id: "lists", label: "רשימות" },
    { id: "events", label: "אירועים" },
    { id: "calendar", label: "יומן" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border
              ${tab === t.id 
                ? "bg-blue-600 text-white border-blue-600" 
                : "bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Render Active Tab */}
      {tab === "lists" && <TasksLists />}
      {tab === "events" && <TasksEvents />}
      {tab === "calendar" && <TasksCalendar />}
    </div>
  );
}
