import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Role = 'candidate' | 'employer' | 'admin' | 'owner';

const roleConfig = {
  candidate: {
    email: "candidate@test.com",
    displayName: "Test Candidate",
    dashboard: "/candidate/dashboard",
  },
  employer: {
    email: "employer@test.com",
    displayName: "Test Employer",
    dashboard: "/employer/dashboard",
  },
  admin: {
    email: "admin@test.com",
    displayName: "Test Admin",
    dashboard: "/admin/dashboard",
  },
  owner: {
    email: "owner@test.com",
    displayName: "Test Owner",
    dashboard: "/owner/dashboard",
  },
};

export const useDevLogin = (role: Role) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const config = roleConfig[role];
      const devEmail = config.email;
      const devPassword = "test123456";
      const displayName = config.displayName;
      
      // First sign out any existing session to avoid conflicts
      await supabase.auth.signOut();
      
      // Try to sign in
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

      if (signInError) {
        // If user doesn't exist, create it
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: devEmail,
          password: devPassword,
          options: {
            data: {
              role: role,
              full_name: displayName
            }
          }
        });

        if (signUpError) {
          toast({
            title: "Dev Login Failed",
            description: signUpError.message,
            variant: "destructive",
          });
          return;
        }

        // Try signing in again after signup
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: devEmail,
          password: devPassword,
        });
        
        if (retryError) {
          toast({
            title: "Dev Login Failed",
            description: retryError.message,
            variant: "destructive",
          });
          return;
        }
        
        signInData = retryData;
      }

      // Ensure profile exists with correct role
      if (signInData?.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", signInData.user.id)
          .maybeSingle();

        const baseRole = role === 'admin' || role === 'owner' ? 'employer' : role;

        if (!existingProfile) {
          // Create profile if it doesn't exist
          await supabase.from("profiles").insert({
            id: signInData.user.id,
            email: devEmail,
            full_name: displayName,
            role: baseRole,
          });
        } else if (existingProfile.role !== baseRole) {
          // Update role if it doesn't match
          await supabase
            .from("profiles")
            .update({ role: baseRole })
            .eq("id", signInData.user.id);
        }

        // For admin/owner roles, use edge function to bypass RLS
        if (role === 'admin' || role === 'owner') {
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", signInData.user.id)
            .eq("role", role)
            .maybeSingle();

          if (!existingRole) {
            // Use edge function to assign role (bypasses RLS)
            const { data: session } = await supabase.auth.getSession();
            const response = await supabase.functions.invoke('manage-user-roles', {
              body: {
                action: 'dev-seed-role',
                targetUserId: signInData.user.id,
                role: role,
              },
            });
            
            if (response.error) {
              console.error('Failed to assign role:', response.error);
              // Continue anyway - show warning but don't block
              toast({
                title: "Role Assignment Warning",
                description: "Role may not be assigned. Use /owner/setup first.",
                variant: "destructive",
              });
            }
          }
        }
      }

      toast({
        title: "Dev Login Successful",
        description: `Logged in as test ${role}`,
      });

      // Navigate to the appropriate dashboard
      navigate(config.dashboard);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Dev login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { handleDevLogin, isLoading };
};
