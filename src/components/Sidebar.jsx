import { NavLink } from "react-router-dom";
import { Home, CheckSquare, Wallet, Settings, LogOut, BarChart2 } from "lucide-react";




import { supabase } from "../supabaseClient";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
const menu = [
  { to: "/",          icon: BarChart2,  label: "Income & Expenses", end: true },
  { to: "/dashboard", icon: Home,       label: "Home" },
  { to: "/tasks",     icon: CheckSquare,label: "Tasks" },
  { to: "/budget",    icon: Wallet,     label: "Budget" },
  { to: "/settings",  icon: Settings,   label: "Settings" },
];
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // כפתור ניווט (אייקון) משותף
  const Item = ({ to, Icon, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => setMobileOpen(false)} // סגירה במובייל אחרי ניווט
      className={({ isActive }) =>
        [
          "w-12 h-12 flex items-center justify-center rounded-xl transition",
          isActive ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100",
        ].join(" ")
      }
    >
      <Icon size={22} />
    </NavLink>
  );

  return (
    <>
      {/* Overlay במובייל */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* --- מובייל: off-canvas --- */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen w-64 bg-white border-r shadow-sm
                    flex flex-col justify-between py-6 transform transition-transform duration-300 md:hidden
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col items-center gap-4">
          {menu.map(({ to, icon: Icon, end }) => (
            <Item key={to} to={to} Icon={Icon} end={end} />
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="w-12 h-12 mx-auto flex items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-black transition"
          aria-label="Log out"
        >
          <LogOut size={22} />
        </button>
      </aside>

      {/* --- דסקטופ: כמו שהיה --- */}
      <aside
        className="hidden md:flex relative z-20 w-20 min-h-screen bg-white border-r flex-col items-center justify-between py-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-4">
          {menu.map(({ to, icon: Icon, end }) => (
            <Item key={to} to={to} Icon={Icon} end={end} />
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="w-12 h-12 flex items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-black transition"
          aria-label="Log out"
        >
          <LogOut size={22} />
        </button>
      </aside>
    </>
  );
}
