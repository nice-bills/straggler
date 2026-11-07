import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";

const NAV = [
  { to: "/", label: "Latency Lab" },
  { to: "/compare", label: "Compare" },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-mono text-[13px] font-semibold tracking-[0.25em]">
              <span className="h-2 w-2 rounded-full bg-primary" />
              STRAGGLER
            </Link>
            <nav className="flex gap-1 text-[13px]">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeOptions={{ exact: true }}
                  className="rounded px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "bg-secondary !text-foreground" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <button onClick={() => logout()} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}