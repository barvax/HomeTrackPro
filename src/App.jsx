import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import IncomeExpenses from "./pages/IncomeExpenses";
import MonthlyDetails from "./pages/MonthlyDetails";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Inbox from "./pages/Inbox";
import SetPassword from "./pages/SetPassword";
import Join from "./pages/Join";
import VerifyEmail from "./pages/VerifyEmail";
import CompleteSignup from "./pages/CompleteSignup";
import DashboardHome from "./pages/DashboardHome";
import Tasks from "./pages/Tasks";
import Budget from "./pages/Budget";
import Settings from "./pages/Settings";
import KidPage from "./pages/dashboard/KidPage";


export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ ראוטים ציבוריים - נגישים תמיד (ללא session) */}
        <Route path="/join" element={<Join />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/complete-signup" element={<CompleteSignup />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* ✅ אם אין session - הצג login בכל דף אחר */}
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          /* ✅ יש session - הצג את האפליקציה עם Sidebar */
          <Route
            path="*"
            element={
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

                <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

                <main className="flex-1 p-6 pt-16 md:pt-6">
                  <Routes>
                    <Route path="/" element={<IncomeExpenses />} />
                    <Route path="/dashboard" element={<DashboardHome />} />
                    <Route path="/kid/:id" element={<KidPage />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/details" element={<MonthlyDetails />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}