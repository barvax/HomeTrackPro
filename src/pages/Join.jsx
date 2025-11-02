import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Join() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        setError("קישור לא תקין - חסר טוקן.");
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching invitation with token:", token);
        
        // שלוף את ההזמנה לפי הטוקן
        const { data, error } = await supabase
          .from("group_invitations")
          .select(`
            *,
            groups (
              id,
              name,
              is_premium
            )
          `)
          .eq("token", token)
          .single();

        console.log("📥 Invitation data:", data);
        console.log("❌ Invitation error:", error);

        if (error || !data) {
          setError("ההזמנה לא נמצאה. ייתכן שהקישור שגוי.");
          setLoading(false);
          return;
        }

        // בדוק אם ההזמנה פגה
        if (new Date(data.expires_at) < new Date()) {
          setError("ההזמנה פגה תוקף. אנא בקש הזמנה חדשה.");
          setLoading(false);
          return;
        }

        // בדוק אם ההזמנה כבר התקבלה
        if (data.status === "accepted") {
          setError("ההזמנה כבר שומשה. אם כבר נרשמת, נסה להתחבר.");
          setLoading(false);
          return;
        }

        if (data.status === "cancelled") {
          setError("ההזמנה בוטלה על ידי בעל הקבוצה.");
          setLoading(false);
          return;
        }

        setInvitation(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("שגיאה בטעינת ההזמנה: " + err.message);
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ולידציה
    if (!password) {
      setError("יש להזין סיסמה.");
      return;
    }

    if (password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = searchParams.get("token");
      
      console.log("🚀 Starting signup for:", invitation.email);

      // הרשם עם המייל וסיסמה
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/complete-signup?token=${token}`,
          data: {
            invitation_token: token,
          },
        },
      });

      console.log("📝 Signup result:", authData);
      console.log("❌ Signup error:", signUpError);

      if (signUpError) {
        setError("שגיאה בהרשמה: " + signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError("לא נוצר משתמש. נסה שוב.");
        setIsSubmitting(false);
        return;
      }

      console.log("✅ User created:", authData.user.id);

      // התנתק מיד אחרי ההרשמה (כדי שלא יכנס אוטומטית)
      await supabase.auth.signOut();
      
      console.log("🔓 Signed out, redirecting to verify email...");

      // העבר למסך אימות מייל
      navigate(`/verify-email?email=${encodeURIComponent(invitation.email)}&group=${encodeURIComponent(invitation.groups.name)}&token=${token}`);
      
    } catch (err) {
      console.error("💥 Signup error:", err);
      setError("שגיאה לא צפויה: " + err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">שגיאה</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎉 הוזמנת להצטרף!
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-600 mb-1">קבוצה:</p>
            <p className="text-xl font-bold text-blue-600">
              {invitation?.groups?.name || "טוען..."}
            </p>
            {invitation?.groups?.is_premium && (
              <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                ✨ PREMIUM
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* הצגת המייל */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              המייל שלך
            </label>
            <input
              type="email"
              value={invitation?.email || ""}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* סיסמה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              בחר סיסמה
            </label>
            <input
              type="password"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* אימות סיסמה */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              אמת סיסמה
            </label>
            <input
              type="password"
              placeholder="הקלד שוב את הסיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* הצגת שגיאות */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* כפתור שליחה */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? "מצטרף..." : "הצטרף לקבוצה"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>כבר יש לך חשבון?</p>
          <button
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            התחבר כאן
          </button>
        </div>
      </div>
    </div>
  );
}