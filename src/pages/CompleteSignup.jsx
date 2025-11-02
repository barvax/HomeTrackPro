import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function CompleteSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("מצטרף לקבוצה...");

useEffect(() => {
  const completeSignup = async () => {
    try {
      console.log("🔍 Step 1: Checking session...");
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log("📝 Session:", session ? "EXISTS" : "MISSING");
      console.log("📝 User ID:", session?.user?.id);
      
      if (!session) {
        setStatus("error");
        setMessage("לא נמצא משתמש מחובר. נסה להתחבר שוב.");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      const token = searchParams.get("token");
      console.log("🎫 Token from URL:", token);
      
      if (!token) {
        setStatus("error");
        setMessage("חסר טוקן הזמנה.");
        return;
      }

      console.log("🚀 Step 2: Calling API to join group...");
      console.log("📤 Sending:", { token, user_id: session.user.id });

      const response = await fetch('/api/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          user_id: session.user.id,
        })
      });

      console.log("📥 Response status:", response.status);
      const result = await response.json();
      console.log("📥 Response data:", result);

      if (result.success) {
        console.log("✅ Successfully joined group:", result.group_id);
        setStatus("success");
        setMessage("הצטרפת בהצלחה לקבוצה! 🎉");
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } else {
        console.error("❌ API returned error:", result.error);
        setStatus("error");
        setMessage("שגיאה בהצטרפות לקבוצה: " + result.error);
      }

    } catch (error) {
      console.error("💥 Unexpected error:", error);
      setStatus("error");
      setMessage("שגיאה לא צפויה: " + error.message);
    }
  };

  completeSignup();
}, [searchParams, navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {status === "processing" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">מצטרף לקבוצה...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">הצלחה!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">מעביר אותך ל-Dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">שגיאה</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              חזור להתחברות
            </button>
          </>
        )}
      </div>
    </div>
  );
}