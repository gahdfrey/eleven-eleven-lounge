"use client";

import { useRouter } from "next/navigation";
import { PasswordForm } from "@/components/app/PasswordForm";

export function ForcedPasswordChange() {
  const router = useRouter();
  return (
    <PasswordForm
      submitLabel="Set password and continue"
      onDone={() => {
        router.replace("/dashboard");
        router.refresh();
      }}
    />
  );
}
