import { supabase } from "@/integrations/supabase/client";

export interface SponsorSignupData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  companyDescription: string;
  password: string;
}

export const signUpSponsor = async (data: SponsorSignupData) => {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/sponsor/dashboard`,
        data: {
          full_name: data.contactName,
          role: 'sponsor'
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("User creation failed");

    // 2. Create user role entry
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'sponsor'
      });

    if (roleError) throw roleError;

    // 3. Create sponsor profile
    const { error: sponsorError } = await supabase
      .from('sponsors')
      .insert({
        user_id: authData.user.id,
        company_name: data.companyName,
        contact_name: data.contactName,
        contact_email: data.email,
        contact_phone: data.phone,
        website: data.website || null,
        company_description: data.companyDescription,
        status: 'pending',
        tier: 'bronze'
      });

    if (sponsorError) throw sponsorError;

    return { success: true, user: authData.user };
  } catch (error: any) {
    console.error('Sponsor signup error:', error);
    return { 
      success: false, 
      error: error.message || 'An error occurred during signup'
    };
  }
};
