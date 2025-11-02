import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email");
  const groupName = searchParams.get("group");

  useEffect(() => {
    // בדוק אם המשתמש כבר מחובר (במקרה שאימת מייל)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // אם יש session - המייל אומת, נווט ל-dashboard
        navigate("/dashboard");
      }
    };

    checkAuth();

    // האזן לשינויים באימות
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* אייקון מייל */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* כותרת */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          📧 אמת את כתובת המייל שלך
        </h1>

        {/* הודעה */}
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            שלחנו הודעת אימות לכתובת:
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-4">
            {email}
          </p>
          <p className="text-gray-600 mb-2">
            לחץ על הקישור בהודעה כדי להשלים את ההרשמה ולהצטרף לקבוצה:
          </p>
          <p className="text-lg font-semibold text-gray-800">
            {groupName}
          </p>
        </div>

        {/* הוראות */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-right">
          <p className="text-sm text-yellow-800 font-medium mb-2">
            💡 טיפ חשוב:
          </p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• בדוק גם בתיקיית הספאם/דואר זבל</li>
            <li>• ההודעה עשויה לקחת מספר דקות להגיע</li>
            <li>• הקישור תקף למשך 24 שעות</li>
          </ul>
        </div>

        {/* כפתור חזרה */}
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          חזרה למסך התחברות
        </button>

        {/* הערה */}
        <p className="mt-6 text-xs text-gray-500">
          לא קיבלת את ההודעה? בדוק את תיקיית הספאם או פנה לתמיכה
        </p>
      </div>
    </div>
  );
}