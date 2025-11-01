import FamilySettings from "./Settings/FamilySettings";



export default function Settings() {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">הגדרות</h1>

      {/* חלק קיים שלך */}
      {/* <CategoriesSettings /> */}
      {/* <BudgetSettings /> */}

      {/* החלק החדש */}
      <FamilySettings />
    </div>
  );
}
