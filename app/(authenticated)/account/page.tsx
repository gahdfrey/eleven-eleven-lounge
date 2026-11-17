import type { Metadata } from "next";
import { requirePageUser } from "@/lib/authz";
import { Card, PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/app/PasswordForm";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <>
      <PageHeader title="My account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-white">Profile</h2>
          <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-sm">
            <dt className="text-muted">Name</dt><dd className="text-white">{user.firstname} {user.lastname}</dd>
            <dt className="text-muted">Username</dt><dd className="font-mono text-accent">{user.username}</dd>
            <dt className="text-muted">Role</dt><dd className="capitalize text-white">{user.role}</dd>
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-white">Change password</h2>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
