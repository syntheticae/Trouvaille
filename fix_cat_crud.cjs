const fs = require("fs");

let cContent = fs.readFileSync("src/hooks/useCategories.ts", "utf8").replace(/\r\n/g, "\n");

// 1. Fix useEnsureDefaultCategories to not re-insert deleted categories
const oldEnsureCategories = `      if (existing && existing.length > 0) {
        // Upsert: add any categories that might be missing
        const existingNames = new Set(existing.map((c: { name: string }) => c.name))
        const missing = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name))
        if (missing.length === 0) return
        await supabase.from("categories").insert(
          missing.map(c => ({ ...c, user_id: user.id }))
        )
      } else {`;

const newEnsureCategories = `      if (existing && existing.length > 0) {
        // Categories already exist for user, do NOT re-insert deleted categories
        return
      } else {`;

cContent = cContent.replace(oldEnsureCategories, newEnsureCategories);

// 2. Fix useDeleteCategory with safe transaction unlinking
const oldDeleteCategoryRegex = /export function useDeleteCategory\(\) \{[\s\S]*?\}\n\}/;

const newDeleteCategoryCode = `export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await supabase.from("transactions").update({ category_id: null }).eq("category_id", id)
      } catch (e) {
        console.warn("Unlinking category failed:", e)
      }
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] })
      qc.invalidateQueries({ queryKey: ["transactions"] })
      qc.invalidateQueries({ queryKey: ["all-transactions"] })
    },
  })
}`;

cContent = cContent.replace(oldDeleteCategoryRegex, newDeleteCategoryCode);

fs.writeFileSync("src/hooks/useCategories.ts", cContent, "utf8");
console.log("Updated useCategories.ts: respect deletions and add safe cascade deletion");
