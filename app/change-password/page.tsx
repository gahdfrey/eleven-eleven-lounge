import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { Card, Logo } from "@/components/ui";
import { ForcedPasswordChange } from "./ForcedPasswordChange";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/account");
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-xl"><Logo /></div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-white">Welcome, {user.firstname}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">
            You&apos;re signed in as <span className="font-mono text-accent">{user.username}</span>. Set your own password to continue.
          </p>
          <ForcedPasswordChange />
        </Card>
      </div>
    </main>
  );
}
