import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "moderator" | "user";

interface Profile {
  displayName: string | null;
  role: AppRole | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ displayName: null, role: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile({ displayName: null, role: null });
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
      ]);

      setProfile({
        displayName: profileRes.data?.display_name ?? user.email ?? null,
        role: (roleRes.data?.role as AppRole) ?? null,
      });
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const isAdmin = profile.role === "admin";

  return { ...profile, isAdmin, loading };
}
