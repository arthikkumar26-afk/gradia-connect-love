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

      const normalizedEmail = String(targetEmail).trim().toLowerCase();

      // Prevent duplicate registration: check profiles first
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        return new Response(
          JSON.stringify({ error: `This email is already registered. Please use a different email or manage the existing user.`, code: "already_registered" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also check auth.users (in case profile row was deleted but auth user remains)
      try {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const dup = authList?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
        if (dup) {
          return new Response(
            JSON.stringify({ error: `This email is already registered. Please use a different email or manage the existing user.`, code: "already_registered" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (_) { /* ignore lookup failure and fall through to createUser */ }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName || normalizedEmail, role },
      });

      if (createError) {
        const msg = (createError.message || "").toLowerCase();
        const isDup = msg.includes("already") && (msg.includes("registered") || msg.includes("exist"));
        return new Response(
          JSON.stringify({ error: isDup ? "This email is already registered. Please use a different email or manage the existing user." : createError.message, code: isDup ? "already_registered" : "create_failed" }),
          { status: isDup ? 409 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("profiles").upsert({
        id: newUser.user.id,
        email: normalizedEmail,
        full_name: fullName || normalizedEmail,
        role,
      });

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: newUser.user.id, role },
        { onConflict: "user_id,role" }
      );

      // Store the initial password for admin reference
      if (userPassword) {
        await supabaseAdmin.from("user_credentials").upsert(
          { user_id: newUser.user.id, initial_password: userPassword },
          { onConflict: "user_id" }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `User ${targetEmail} created with role ${role}`, userId: newUser.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-users") {
      // Get all users with their roles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, mobile, role, location, company_name, experience_level, created_at")
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

      const { data: credentials, error: credentialsError } = await supabaseAdmin
        .from("user_credentials")
        .select("user_id, initial_password");

      if (credentialsError) {
        throw credentialsError;
      }

      const credentialMap = new Map(
        (credentials || []).map((credential) => [credential.user_id, credential.initial_password])
      );

      // Combine profiles with their roles
      const usersWithRoles = profiles?.map((profile) => ({
        ...profile,
        initial_password: credentialMap.get(profile.id) ?? null,
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
      const validRoles = ["admin", "owner", "employer", "candidate", "sponsor", "edutech", "freelancer"];
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

    if (action === "reset-password") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newPassword = reqBody.newPassword;
      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "newPassword is required and must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (resetError) {
        throw resetError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Password reset successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-user-details") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId);

      const { data: credentials } = await supabaseAdmin
        .from("user_credentials")
        .select("initial_password")
        .eq("user_id", targetUserId)
        .maybeSingle();

      // Check subscriptions
      let subscription = null;
      if (profile?.role === "candidate") {
        const { data } = await supabaseAdmin
          .from("candidate_subscriptions")
          .select("*")
          .eq("candidate_id", targetUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);
        subscription = data?.[0] || null;
      } else {
        const { data } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("employer_id", targetUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);
        subscription = data?.[0] || null;
      }

      return new Response(
        JSON.stringify({
          profile,
          authUser: authUser?.user ? {
            email: authUser.user.email,
            created_at: authUser.user.created_at,
            last_sign_in_at: authUser.user.last_sign_in_at,
            email_confirmed_at: authUser.user.email_confirmed_at,
            banned_until: authUser.user.banned_until,
          } : null,
          initialPassword: credentials?.initial_password ?? null,
          roles: roles?.map(r => r.role) || [],
          subscription,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update-subscription") {
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: "targetUserId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { plan, billingCycle, planAction, targetRole } = reqBody;

      if (planAction === "cancel") {
        // Cancel active subscription
        if (targetRole === "candidate") {
          await supabaseAdmin
            .from("candidate_subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("candidate_id", targetUserId)
            .eq("status", "active");
        } else {
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("employer_id", targetUserId)
            .eq("status", "active");
        }
        return new Response(
          JSON.stringify({ success: true, message: "Subscription cancelled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create or update subscription
      const now = new Date();
      const endsAt = new Date(now);
      if (billingCycle === "annual") {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

      if (targetRole === "candidate") {
        // Cancel existing active
        await supabaseAdmin
          .from("candidate_subscriptions")
          .update({ status: "cancelled" })
          .eq("candidate_id", targetUserId)
          .eq("status", "active");

        await supabaseAdmin.from("candidate_subscriptions").insert({
          candidate_id: targetUserId,
          plan: plan.toLowerCase(),
          status: "active",
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        });
      } else {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("employer_id", targetUserId)
          .eq("status", "active");

        await supabaseAdmin.from("subscriptions").insert({
          employer_id: targetUserId,
          plan_id: plan.toLowerCase(),
          plan_name: plan,
          amount: 0,
          status: "active",
          billing_cycle: billingCycle || "monthly",
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          payment_method: "owner_assigned",
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: `Subscription updated to ${plan}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "credit-wallet-points") {
      const { points, description } = reqBody;
      if (!targetUserId || !points || Number(points) <= 0) {
        return new Response(
          JSON.stringify({ error: "targetUserId and positive points are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const pts = Math.floor(Number(points));

      // Ensure wallet exists
      const { data: existingWallet } = await supabaseAdmin
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", targetUserId)
        .maybeSingle();

      let walletId = existingWallet?.id as string | undefined;
      if (!walletId) {
        const { data: newWallet, error: wErr } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: targetUserId, points_balance: pts })
          .select("id")
          .single();
        if (wErr) {
          return new Response(
            JSON.stringify({ error: wErr.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        walletId = newWallet!.id;
      } else {
        await supabaseAdmin
          .from("wallets")
          .update({ points_balance: (existingWallet!.points_balance || 0) + pts, updated_at: new Date().toISOString() })
          .eq("id", walletId);
      }

      await supabaseAdmin.from("wallet_transactions").insert({
        wallet_id: walletId,
        transaction_type: "credit",
        category: "admin_grant",
        amount: 0,
        points: pts,
        rewards: 0,
        description: description || `Admin credited ${pts} points`,
      });

      return new Response(
        JSON.stringify({ success: true, message: `Credited ${pts} points` }),
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
