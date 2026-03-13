export function getTintVar(c: string): string {
  if (c === "var(--admin-blue)") return "var(--admin-blue-10)";
  if (c === "var(--admin-pink)") return "var(--admin-pink-10)";
  if (c === "var(--admin-cyan)") return "var(--admin-cyan-10)";
  if (c === "var(--admin-teal)") return "var(--admin-teal-10)";
  if (c === "var(--admin-deep-purple)") return "var(--admin-deep-purple-10)";
  return "rgba(0,0,0,0.05)";
}
