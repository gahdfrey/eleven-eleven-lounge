import { countUsers } from "@/lib/users";
import { Card, ButtonLink, Logo } from "@/components/ui";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

/** First-run owner setup. Closed as soon as one account exists. */
export default async function SignupPage() {
  const closed = (await countUsers()) > 0;
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-xl"><Logo /></div>
        <Card className="p-6">
          {closed ? (
            <>
              <h1 className="text-lg font-semibold text-white">Sign-up is closed</h1>
              <p className="mb-6 mt-1 text-sm text-muted">Staff accounts are created by an admin. Ask them for your username.</p>
              <ButtonLink href="/login" className="w-full">Go to sign in</ButtonLink>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-white">Set up the owner account</h1>
              <p className="mb-6 mt-1 text-sm text-muted">This first account becomes the admin (11:11/1).</p>
              <SignupForm />
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
