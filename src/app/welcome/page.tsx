import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getConsoles } from "@/lib/user-data";
import { Onboarding } from "@/components/Onboarding";

export const metadata: Metadata = { title: "Welcome — Game Checker" };

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // Already set up? Skip onboarding.
  const consoles = await getConsoles();
  if (consoles.length > 0) redirect("/dashboard");

  return (
    <div className="py-6">
      <Onboarding userName={session.user.name} />
    </div>
  );
}
