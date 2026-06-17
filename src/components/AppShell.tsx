import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getConsoles } from "@/lib/user-data";
import { SearchBar } from "./SearchBar";
import { ConsoleSwitcher } from "./ConsoleSwitcher";

const NAV = [
  { href: "/search", label: "Browse" },
  { href: "/recommendations", label: "For You" },
  { href: "/consoles", label: "My Consoles" },
  { href: "/dashboard", label: "Library" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const consoles = session?.user ? await getConsoles() : [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-primary text-lg shadow-soft">
              🕹️
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight sm:block">
              Game<span className="text-primary">Checker</span>
            </span>
          </Link>

          <div className="hidden max-w-md flex-1 md:block">
            <SearchBar />
          </div>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-bold text-ink-soft transition hover:bg-primary-soft hover:text-primary-strong"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {consoles.length > 0 && <ConsoleSwitcher consoles={consoles} />}
            {session?.user ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-primary"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/signin"
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-primary-strong"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search row */}
        <div className="px-4 pb-3 md:hidden">
          <SearchBar />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-ink-soft">
        Compatibility data from{" "}
        <a
          href="https://www.emuready.com"
          className="font-bold text-primary-strong hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          EmuReady
        </a>{" "}
        &{" "}
        <a
          href="https://gamenative.app"
          className="font-bold text-primary-strong hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          GameNative
        </a>
        . Not affiliated.
      </footer>
    </div>
  );
}
