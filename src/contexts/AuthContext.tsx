import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { preloadAdminChunks } from "@/utils/preloadAdminChunks";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "employer" | "candidate" | "admin" | "owner" | "freelancer" | "hr" | "hr_manager";
  mobile?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  profile_picture?: string;
  resume_url?: string;
  experience_level?: string;
  preferred_role?: string;
  company_name?: string;
  company_description?: string;
  date_of_birth?: string;
  gender?: string;
  languages?: string[];
  current_state?: string;
  current_district?: string;
  alternate_number?: string;
  highest_qualification?: string;
  office_type?: string;
  preferred_state?: string;
  preferred_district?: string;
  preferred_state_2?: string;
  preferred_district_2?: string;
  segment?: string;
  program?: string;
  classes_handled?: string;
  batch?: string;
  primary_subject?: string;
  registration_number?: string;
  category?: string;
  current_salary?: number;
  expected_salary?: number;
  available_from?: string;
  govt_id_type?: string;
  govt_id_number?: string;
  govt_id_url?: string;
  govt_id_verified?: boolean;
  govt_id_submitted_at?: string;
  govt_id_verified_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Default value prevents HMR boundary errors during Fast Refresh
const defaultAuthValue: AuthContextType = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 3) => {
    console.log("Fetching profile for user:", userId);
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          const isNetworkError = profileError.message?.includes("Failed to fetch") || profileError.message?.includes("NetworkError");
          if (isNetworkError && attempt < retries - 1) {
            console.warn(`Profile fetch attempt ${attempt + 1} failed (network), retrying...`);
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          console.error("Error fetching profile:", profileError);
          return;
        }

        // Also check user_roles table for admin/owner roles
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (roleError) {
          console.error("Error fetching user role:", roleError);
        }

        if (profileData) {
          const actualRole = roleData?.role || profileData.role;
          console.log("Profile fetched successfully, role:", actualRole);
          setProfile({ ...profileData, role: actualRole } as Profile);
          // Warm admin route chunks once we know the user is an admin/owner
          if (actualRole === "admin" || actualRole === "owner") {
            preloadAdminChunks();
          }
        } else {
          console.log("No profile found for user");
          setProfile(null);
        }
        return; // Success, exit retry loop
      } catch (err: any) {
        const isNetworkError = err.name === "TypeError" || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
        if (isNetworkError && attempt < retries - 1) {
          console.warn(`Profile fetch attempt ${attempt + 1} failed (exception), retrying...`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        console.error("Exception fetching profile:", err);
      }
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let lastFetchedUserId: string | null = null;
    let initialSessionHandled = false;

    const handleSession = (session: Session | null, source: string) => {
      console.log(`[Auth] ${source}:`, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Dedupe: don't refetch profile for the same user
        if (lastFetchedUserId === session.user.id) {
          setIsLoading(false);
          return;
        }
        lastFetchedUserId = session.user.id;
        // setTimeout to prevent deadlock inside auth callback
        setTimeout(() => {
          fetchProfile(session.user.id).finally(() => {
            setIsLoading(false);
          });
        }, 0);
      } else {
        lastFetchedUserId = null;
        setProfile(null);
        setIsLoading(false);
      }
    };

    try {
      // Set up auth state listener FIRST
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        // Skip INITIAL_SESSION if we've already handled it via getSession
        if (event === "INITIAL_SESSION" && initialSessionHandled) return;
        if (event === "INITIAL_SESSION") initialSessionHandled = true;
        handleSession(session, `event:${event}`);
      });
      subscription = data.subscription;
    } catch (err) {
      console.warn("Auth state listener failed (likely iframe security restriction):", err);
      setIsLoading(false);
    }

    // THEN check for existing session
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        initialSessionHandled = true;
        handleSession(session, "getSession");
      }).catch((err) => {
        console.warn("getSession failed:", err);
        setIsLoading(false);
      });
    } catch (err) {
      console.warn("getSession call failed (likely iframe security restriction):", err);
      setIsLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      console.warn("signOut failed, clearing local state anyway:", err);
    }
    // Clear any stale Supabase session keys from storage
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isAuthenticated: !!session,
        isLoading,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};