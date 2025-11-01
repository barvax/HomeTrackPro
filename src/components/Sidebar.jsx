import { NavLink } from "react-router-dom";
import { Home, CheckSquare, Wallet, Settings, LogOut, BarChart2, Mail } from "lucide-react";
import InboxIcon from "../components/InboxIcon";
import { supabase } from "../supabaseClient";

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const menu = [
    { to: "/",          icon: BarChart2,  label: "Income & Expenses", end: true },
    { to: "/dashboard", icon: Home,       label: "Home" },
    { to: "/tasks",     icon: CheckSquare,label: "Tasks" },
    { to: "/budget",    icon: Wallet,     label: "Budget" },
    { to: "/settings",  icon: Settings,   label: "Settings" },
    { to: "/inbox",     icon: Mail,       label: "Inbox" }, // נוסיף את זה גם בתפריט
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // קומפוננטת פריט ניווט (כפתור)
  const Item = ({ to, Icon, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        [
          "w-12 h-12 flex items-center justify-center rounded-xl transition relative",
          isActive ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100",
        ].join(" ")
      }
    >
      {/* אם זה ה־Inbox נוסיף את ה־Badge */}
      {to === "/inbox" ? (
        <div className="relative flex items-center justify-center w-full h-full">
          <InboxIcon />
        </div>
      ) : (
        <Icon size={22} />
      )}
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

      {/* --- מובייל --- */}
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

      {/* --- דסקטופ --- */}
      <aside className="hidden md:flex relative z-20 w-20 min-h-screen bg-white border-r flex-col items-center justify-between py-6 shadow-sm">
        {/* חלק עליון */}
        <div className="flex flex-col items-center gap-4">
          {menu.map(({ to, icon: Icon, end }) => (
            <Item key={to} to={to} Icon={Icon} end={end} />
          ))}
        </div>

        {/* חלק תחתון */}
        <div className="flex flex-col items-center gap-3">
         
          <button
            onClick={handleLogout}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-black transition"
            aria-label="Log out"
          >
            <LogOut size={22} />
          </button>
        </div>
      </aside>
    </>
  );
}
