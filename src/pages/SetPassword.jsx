import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setMessage("לא נמצא טוקן גישה. הקישור לא תקין או שפג תוקפו.");
      setLoading(false);
      return;
    }

    // יצירת סשן זמני לפי הטוקנים
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Session error:", error);
          setMessage("שגיאה באימות הקישור. ייתכן שפג תוקפו.");
        } else {
          setMessage("התחברת בהצלחה! כעת ניתן לקבוע סיסמה חדשה.");
          setTokenValid(true);
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setMessage("יש להזין סיסמה חדשה.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error(error);
      setMessage("שגיאה בשמירת הסיסמה. נסה שוב.");
    } else {
      setMessage("הסיסמה נשמרה בהצלחה! מעביר אותך לדף הבא...");
      setTimeout(() => navigate("/invite-confirmation"), 1800);
    }
  };

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          marginTop: "100px",
          fontSize: "18px",
          direction: "rtl",
        }}
      >
        טוען נתונים...
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "60px auto",
        padding: "24px",
        textAlign: "center",
        direction: "rtl",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2>קביעת סיסמה חדשה</h2>
      <p style={{ color: "#555", marginBottom: "16px" }}>{message}</p>

      {tokenValid && (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="הקלד סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "12px",
              textAlign: "center",
            }}
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#111",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              width: "100%",
              fontWeight: "bold",
            }}
          >
            שמור סיסמה
          </button>
        </form>
      )}
    </div>
  );
}
