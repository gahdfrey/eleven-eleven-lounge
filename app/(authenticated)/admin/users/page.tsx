import type { Metadata } from "next";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requirePageUser } from "@/lib/authz";
import { DEFAULT_PASSWORD } from "@/lib/users";
import { PageHeader } from "@/components/ui";
import { UsersManager } from "@/components/admin/UsersManager";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePageUser(["admin"]);
  const rows = await db
    .select({ id: users.id, staffNo: users.staffNo, username: users.username, firstname: users.firstname, lastname: users.lastname, phone: users.phone, role: users.role, active: users.active, mustChangePassword: users.mustChangePassword, createdAt: users.createdAt })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.staffNo));
  return (
    <>
      <PageHeader
        title="Users"
        description={<>Usernames are given in order of creation (11:11/1, 11:11/2, …). New accounts start with the password <span className="font-mono text-accent">{DEFAULT_PASSWORD}</span> and must change it at first sign-in.</>}
      />
      <UsersManager users={rows} meId={me.id} />
    </>
  );
}
