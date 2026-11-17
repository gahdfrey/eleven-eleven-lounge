import { MANAGERS, requirePageUser } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(MANAGERS);
  return children;
}
