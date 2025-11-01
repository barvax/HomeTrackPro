import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [groupId, setGroupId] = useState(null);

  useEffect(() => {
    const handleInvite = async () => {
      try {
        // 🔥 בדוק אם יש hash ב-URL (Supabase מחזיר את הטוקנים ב-hash)
        const hash = window.location.hash;
        console.log("URL Hash:", hash);

        if (!hash) {
          setMessage("לא נמצא קישור תקין. ייתכן שהקישור פג תוקפו.");
          setLoading(false);
          return;
        }

        // המר את ה-hash ל-URLSearchParams
        const params = new URLSearchParams(hash.replace("#", "?"));
        const type = params.get("type");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        console.log("Type:", type);
        console.log("Access Token:", accessToken ? "exists" : "missing");

        // 🔥 וודא שזו הזמנה (invite) ולא סתם recovery
        if (type !== "invite" && type !== "recovery") {
          setMessage("סוג קישור לא מזוהה.");
          setLoading(false);
          return;
        }

        if (!accessToken || !refreshToken) {
          setMessage("לא נמצאו טוקני גישה. הקישור לא תקין או שפג תוקפו.");
          setLoading(false);
          return;
        }

        // 🔥 צור סשן חדש עם הטוקנים
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

        if (sessionError) {
          console.error("Session error:", sessionError);
          setMessage("שגיאה באימות הקישור. ייתכן שפג תוקפו.");
          setLoading(false);
          return;
        }

        console.log("Session created:", sessionData);

        // 🔥 קבל את המידע על המשתמש
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData?.user) {
          console.error("User error:", userError);
          setMessage("לא ניתן לאמת את המשתמש.");
          setLoading(false);
          return;
        }

        console.log("User data:", userData.user);

        // 🔥 שלוף את group_id מה-metadata (אם הועבר)
        const userGroupId = userData.user.user_metadata?.group_id;
        if (userGroupId) {
          setGroupId(userGroupId);
        }

        setMessage("התחברת בהצלחה! כעת ניתן לקבוע סיסמה חדשה.");
        setTokenValid(true);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setMessage("שגיאה בלתי צפויה: " + err.message);
        setLoading(false);
      }
    };

    handleInvite();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password) {
      setMessage("יש להזין סיסמה חדשה.");
      return;
    }

    if (password.length < 6) {
      setMessage("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("הסיסמאות אינן תואמות.");
      return;
    }

    // 🔥 עדכן את הסיסמה
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("Password update error:", error);
      setMessage("שגיאה בשמירת הסיסמה: " + error.message);
      return;
    }

    setMessage("הסיסמה נשמרה בהצלחה! מעביר אותך...");

    // 🔥 אם יש group_id, הוסף למשתמש הנוכחי
    if (groupId) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from("group_members").upsert({
          group_id: groupId,
          user_id: userData.user.id,
          role: "member",
        });
      }
    }

    setTimeout(() => {
      navigate("/dashboard"); // או לאן שרוצים להעביר
    }, 1500);
  };

  if (loading) {
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
  }

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
      <p style={{ color: message.includes("בהצלחה") ? "green" : "#555", marginBottom: "16px" }}>
        {message}
      </p>

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
          <input
            type="password"
            placeholder="אמת סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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