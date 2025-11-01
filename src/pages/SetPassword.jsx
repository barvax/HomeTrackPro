// src/pages/SetPassword.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = window.location.hash;
    const accessToken = new URLSearchParams(hash.replace("#", "?")).get("access_token");

    if (!accessToken) {
      setMessage("לא נמצא טוקן גישה. הקישור לא תקין.");
      setLoading(false);
      return;
    }

    // יצירת סשן זמני לפי ה-token
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: accessToken,
      })
      .then(({ error }) => {
        if (error) {
          console.error(error);
          setMessage("שגיאה באימות הקישור.");
        } else {
          setMessage("התחברות הצליחה! בחר סיסמה חדשה.");
          setToken(accessToken);
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error(error);
      setMessage("שגיאה בשמירת הסיסמה. נסה שוב.");
    } else {
      setMessage("הסיסמה נשמרה בהצלחה!");
      setTimeout(() => navigate("/invite-confirmation"), 1500);
    }
  };

  if (loading) return <p style={{ textAlign: "center", marginTop: "50px" }}>טוען...</p>;

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", textAlign: "center", direction: "rtl" }}>
      <h2>קביעת סיסמה חדשה</h2>
      <p>{message}</p>

      {token && (
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <input
            type="password"
            placeholder="הקלד סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginBottom: 10,
              textAlign: "center",
            }}
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            שמור סיסמה
          </button>
        </form>
      )}
    </div>
  );
}
