import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import IncomeExpenses from "./pages/IncomeExpenses";
import MonthlyDetails from "./pages/MonthlyDetails";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Inbox from "./pages/Inbox"; // 👈 נוסיף את זה


import DashboardHome from "./pages/DashboardHome";
import Tasks from "./pages/Tasks";
import Budget from "./pages/Budget";
import Settings from "./pages/Settings";

export default function App() {
  const [session, setSession] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false); // NEW

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <div className="relative flex min-h-screen bg-zinc-50">
        {/* המבורגר – רק במובייל */}
        <button
          aria-label="Open menu"
          className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow"
          onClick={() => setMobileOpen(true)}
        >
          <div className="space-y-1.5">
            <div className="w-6 h-0.5 bg-black" />
            <div className="w-6 h-0.5 bg-black" />
            <div className="w-6 h-0.5 bg-black" />
          </div>
        </button>

        {/* Sidebar: מובייל (off-canvas) + דסקטופ (רגיל) */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* תוכן */}
        <main className="flex-1 p-6 pt-16 md:pt-6">
          <Routes>
              {/* דף ברירת המחדל אחרי לוגין */}
  <Route path="/" element={<IncomeExpenses />} />
           <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/details" element={<MonthlyDetails />} />
             <Route path="/settings" element={<Settings />} />
              <Route path="/inbox" element={<Inbox />} /> {/* 👈 חדש */}
             
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
