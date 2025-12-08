// src/components/KidActionModal.jsx
import React, { useState } from "react";

export default function KidActionModal({ mode, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const isAdd = mode === "add";

  function handleSubmit(e) {
    e.preventDefault();

    const val = Number(amount);
    if (!val) return;

    const finalAmount = isAdd ? val : -val;

    onSubmit(finalAmount, note);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl w-80">

        <h2 className="text-lg font-semibold mb-4">
          {isAdd ? "הוסף כסף" : "הורד כסף"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">

          <div>
            <label className="text-sm">סכום</label>
            <input
              type="number"
              className="w-full border rounded-xl p-2 mt-1 bg-zinc-50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm">הערה (לא חובה)</label>
            <input
              type="text"
              className="w-full border rounded-xl p-2 mt-1 bg-zinc-50"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300"
            >
              ביטול
            </button>

            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-white shadow ${
                isAdd
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              שמירה
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
