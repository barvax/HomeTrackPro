// src/pages/DashboardHome.jsx
import React, { useState } from "react";
import DashboardKids from "./dashboard/DashboardKids";
import DashboardPension from "./dashboard/DashboardPension";
import DashboardFutureExpenses from "./dashboard/DashboardFutureExpenses";

export default function DashboardHome() {
  const [tab, setTab] = useState("kids");

  return (
    <div className="p-4">

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("kids")}
          className={`px-4 py-2 rounded-t-xl ${
            tab === "kids"
              ? "bg-white border border-b-0 shadow font-semibold"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          ילדים
        </button>

        <button
          onClick={() => setTab("pension")}
          className={`px-4 py-2 rounded-t-xl ${
            tab === "pension"
              ? "bg-white border border-b-0 shadow font-semibold"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          קרנות השתלמות & פנסיה
        </button>

        <button
          onClick={() => setTab("future")}
          className={`px-4 py-2 rounded-t-xl ${
            tab === "future"
              ? "bg-white border border-b-0 shadow font-semibold"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          הוצאות עתידיות
        </button>
      </div>

      {/* Panels */}
      <div className="bg-white rounded-xl shadow p-4">
        {tab === "kids" && <DashboardKids />}
        {tab === "pension" && <DashboardPension />}
        {tab === "future" && <DashboardFutureExpenses />}
      </div>

    </div>
  );
}
