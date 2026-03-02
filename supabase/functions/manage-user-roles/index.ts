import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const reqBody = await req.json();
    const { action, targetUserId, targetEmail, role, password: userPassword, fullName } = reqBody;

    // Handle dev-seed-role action BEFORE owner check (for bootstrapping)
    if (action === "dev-seed-role") {
      // Check if there are any owners in the system
      const { data: existingOwners } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("role", "owner");

      // Only allow dev seeding if no owners exist (bootstrap scenario)
      if (existingOwners && existingOwners.length > 0) {
        return new Response(
          JSON.stringify({ error: "System already has owners. Use /owner/setup or owner dashboard." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "targetUserId and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate role for dev seeding
      const validDevRoles = ["admin", "owner"];
      if (!validDevRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: "Only admin and owner roles can be seeded" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert the role
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: targetUserId, role },
          { onConflict: "user_id,role" }
        );

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, message: `Dev role ${role} assigned successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For all other actions, require owner or admin privileges
    const { data: privilegedRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"]);

    const isOwnerOrAdmin = privilegedRoles && privilegedRoles.length > 0;

    if (!isOwnerOrAdmin) {
      return new Response(
        JSON.stringify({ error: "Only owners and admins can manage user roles" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-user") {
      if (!targetEmail || !role) {
        return new Response(
          JSON.stringify({ error: "targetEmail and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName || targetEmail, role },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        email: targetEmail,
        full_name: fullName || targetEmail,
        role,
      });

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newUser.user.id, role },
        { onConflict: "user_id,role" }
      );

      return new Response(
        JSON.stringify({ success: true, message: `User ${targetEmail} created with role ${role}`, userId: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-users") {
      // Get all users with their roles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        throw rolesError;
      }

      // Combine profiles with their roles
      const usersWithRoles = profiles?.map((profile) => ({
        ...profile,
        privilegedRoles: userRoles
          ?.filter((r) => r.user_id === profile.id)
          .map((r) => r.role) || [],
      }));

      return new Response(
        JSON.stringify({ users: usersWithRoles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "assign-role") {
      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "targetUserId and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate role
      const validRoles = ["admin", "owner", "employer", "candidate", "sponsor", "edutech"];
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user exists
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .single();

      if (!targetProfile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert role (upsert to avoid duplicates)
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: targetUserId, role },
          { onConflict: "user_id,role" }
        );

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, message: `Role ${role} assigned successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "remove-role") {
      if (!targetUserId || !role) {
        return new Response(
          JSON.stringify({ error: "targetUserId and role are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent removing own owner role
      if (targetUserId === user.id && role === "owner") {
        return new Response(
          JSON.stringify({ error: "Cannot remove your own owner role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", role);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true, message: `Role ${role} removed successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "seed-initial-owner") {
      // This action can only be used if there are NO owners in the system
      const { data: existingOwners } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("role", "owner");

      if (existingOwners && existingOwners.length > 0) {
        return new Response(
          JSON.stringify({ error: "An owner already exists. Use the owner dashboard to manage roles." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Make the current authenticated user the owner
      const { error: seedError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role: "owner" });

      if (seedError) {
        throw seedError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "You have been assigned as the system owner" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete-user") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUserId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete user roles first
      const { error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (rolesError) {
        console.error("Error deleting user roles:", rolesError);
      }

      // Delete profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUserId);
      if (profileError) {
        console.error("Error deleting profile:", profileError);
      }

      // Delete from auth.users using admin API (may not exist)
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authError) {
        console.error("Error deleting auth user (may already be deleted):", authError);
      }

      return new Response(
        JSON.stringify({ success: true, message: "User deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "block-user") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetUserId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot block your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ban user using admin API
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876600h", // ~100 years
      });

      if (banError) {
        throw banError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "User blocked successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unblock-user") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });

      if (unbanError) {
        throw unbanError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "User unblocked successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
