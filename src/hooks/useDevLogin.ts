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
      
      // Try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

      if (signInError) {
        // If user doesn't exist, create it
        const { error: signUpError } = await supabase.auth.signUp({
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
        await supabase.auth.signInWithPassword({
          email: devEmail,
          password: devPassword,
        });
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
