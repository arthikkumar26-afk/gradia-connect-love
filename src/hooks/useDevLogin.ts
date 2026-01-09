import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Role = 'candidate' | 'employer';

export const useDevLogin = (role: Role) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const devEmail = role === 'candidate' ? "candidate@test.com" : "employer@test.com";
      const devPassword = "test123456";
      const displayName = role === 'candidate' ? 'Test Candidate' : 'Test Employer';
      
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

        if (!existingProfile) {
          // Create profile if it doesn't exist
          await supabase.from("profiles").insert({
            id: signInData.user.id,
            email: devEmail,
            full_name: displayName,
            role: role,
          });
        } else if (existingProfile.role !== role) {
          // Update role if it doesn't match
          await supabase
            .from("profiles")
            .update({ role: role })
            .eq("id", signInData.user.id);
        }
      }

      toast({
        title: "Dev Login Successful",
        description: `Logged in as test ${role}`,
      });

      // Navigate to the appropriate dashboard
      const destination = role === 'candidate' ? '/candidate/dashboard' : '/employer/dashboard';
      navigate(destination);
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
