import { LogOut, LogIn, Shield } from "lucide-react";
import Logo from "@/components/Logo";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const navLinks = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Explore", path: "/explore" },
  { label: "Library", path: "/library" },
];

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="border-b border-border/40 px-4 md:px-6 py-3 flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <BookOpen className="h-5 w-5 text-accent" />
          <span className="text-lg font-serif font-bold tracking-wide text-foreground">
            BibleLands
          </span>
        </button>

        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => (
            <Button
              key={link.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(link.path)}
              className={
                location.pathname === link.path
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }
            >
              {link.label}
            </Button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="text-muted-foreground gap-1"
          >
            <Shield size={14} />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        )}

        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground gap-1"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-muted-foreground gap-1"
            >
              <LogIn size={14} />
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")}>
              Sign Up
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
