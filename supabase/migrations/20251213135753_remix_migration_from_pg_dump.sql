CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'employer',
    'candidate',
    'sponsor'
);


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insert role from metadata into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


--
-- Name: is_employer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_employer(u_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(u_id, 'employer');
$$;


SET default_table_access_method = heap;

--
-- Name: agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    admin_name text NOT NULL,
    admin_email text NOT NULL,
    company_name text,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    cover_letter text,
    applied_date timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'shortlisted'::text, 'rejected'::text, 'accepted'::text])))
);


--
-- Name: branding_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size integer,
    category text,
    is_public boolean DEFAULT false,
    download_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    job_title text NOT NULL,
    department text,
    description text,
    requirements text,
    experience_required text,
    skills text[],
    job_type text,
    location text,
    salary_range text,
    status text DEFAULT 'active'::text,
    posted_date timestamp with time zone DEFAULT now(),
    closing_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jobs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'draft'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    mobile text,
    role text NOT NULL,
    location text,
    linkedin text,
    profile_picture text,
    resume_url text,
    experience_level text,
    preferred_role text,
    company_name text,
    company_description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    website text,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['candidate'::text, 'employer'::text])))
);


--
-- Name: sponsor_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsor_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    date date NOT NULL,
    page_views integer DEFAULT 0,
    logo_impressions integer DEFAULT 0,
    link_clicks integer DEFAULT 0,
    profile_visits integer DEFAULT 0,
    leads_generated integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    company_description text,
    website text,
    logo_url text,
    tier text DEFAULT 'bronze'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    joined_date timestamp with time zone DEFAULT now(),
    contract_end_date timestamp with time zone,
    contact_name text,
    contact_email text,
    contact_phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sponsorships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sponsorships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sponsor_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    amount numeric(10,2),
    currency text DEFAULT 'USD'::text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    type text NOT NULL,
    benefits text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    plan_id text NOT NULL,
    plan_name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    auto_renew boolean DEFAULT true,
    payment_method text,
    stripe_subscription_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    "position" text,
    department text,
    work_status text DEFAULT 'active'::text,
    profile_picture text,
    joined_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_work_status_check CHECK ((work_status = ANY (ARRAY['active'::text, 'on_leave'::text, 'busy'::text, 'offline'::text])))
);


--
-- Name: team_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_member_id uuid NOT NULL,
    employer_id uuid NOT NULL,
    post_type text NOT NULL,
    title text NOT NULL,
    content text,
    file_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_posts_post_type_check CHECK ((post_type = ANY (ARRAY['upload'::text, 'status'::text, 'announcement'::text, 'task'::text])))
);


--
-- Name: terms_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employer_id uuid NOT NULL,
    admin_name text NOT NULL,
    admin_email text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agreements agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);


--
-- Name: applications applications_job_id_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_candidate_id_key UNIQUE (job_id, candidate_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: branding_resources branding_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_resources
    ADD CONSTRAINT branding_resources_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sponsor_analytics sponsor_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_analytics
    ADD CONSTRAINT sponsor_analytics_pkey PRIMARY KEY (id);


--
-- Name: sponsor_analytics sponsor_analytics_sponsor_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_analytics
    ADD CONSTRAINT sponsor_analytics_sponsor_id_date_key UNIQUE (sponsor_id, date);


--
-- Name: sponsors sponsors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_pkey PRIMARY KEY (id);


--
-- Name: sponsors sponsors_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_user_id_key UNIQUE (user_id);


--
-- Name: sponsorships sponsorships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_employer_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_employer_id_email_key UNIQUE (employer_id, email);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_posts team_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_posts
    ADD CONSTRAINT team_posts_pkey PRIMARY KEY (id);


--
-- Name: terms_acceptances terms_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_agreements_employer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agreements_employer_id ON public.agreements USING btree (employer_id);


--
-- Name: idx_subscriptions_employer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_employer_id ON public.subscriptions USING btree (employer_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_team_members_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_employer ON public.team_members USING btree (employer_id);


--
-- Name: idx_team_posts_employer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_posts_employer ON public.team_posts USING btree (employer_id);


--
-- Name: idx_team_posts_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_posts_member ON public.team_posts USING btree (team_member_id);


--
-- Name: idx_terms_acceptances_employer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_terms_acceptances_employer_id ON public.terms_acceptances USING btree (employer_id);


--
-- Name: applications applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: jobs jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles on_profile_created_set_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_set_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: branding_resources update_branding_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branding_resources_updated_at BEFORE UPDATE ON public.branding_resources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: sponsors update_sponsors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: sponsorships update_sponsorships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sponsorships_updated_at BEFORE UPDATE ON public.sponsorships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: team_posts update_team_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_posts_updated_at BEFORE UPDATE ON public.team_posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: agreements agreements_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agreements
    ADD CONSTRAINT agreements_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: applications applications_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: branding_resources branding_resources_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_resources
    ADD CONSTRAINT branding_resources_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sponsor_analytics sponsor_analytics_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsor_analytics
    ADD CONSTRAINT sponsor_analytics_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;


--
-- Name: sponsors sponsors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsors
    ADD CONSTRAINT sponsors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sponsorships sponsorships_sponsor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sponsorships
    ADD CONSTRAINT sponsorships_sponsor_id_fkey FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_posts team_posts_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_posts
    ADD CONSTRAINT team_posts_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;


--
-- Name: terms_acceptances terms_acceptances_employer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: applications Candidates can create applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidates can create applications" ON public.applications FOR INSERT WITH CHECK ((auth.uid() = candidate_id));


--
-- Name: jobs Candidates can view active jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidates can view active jobs" ON public.jobs FOR SELECT USING (((status = 'active'::text) AND public.has_role(auth.uid(), 'candidate'::public.app_role)));


--
-- Name: applications Candidates can view their own applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidates can view their own applications" ON public.applications FOR SELECT USING ((auth.uid() = candidate_id));


--
-- Name: profiles Employer profiles viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employer profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING ((role = 'employer'::text));


--
-- Name: agreements Employers can insert their own agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can insert their own agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK ((auth.uid() = employer_id));


--
-- Name: subscriptions Employers can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can insert their own subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = employer_id));


--
-- Name: terms_acceptances Employers can insert their own terms acceptances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can insert their own terms acceptances" ON public.terms_acceptances FOR INSERT TO authenticated WITH CHECK ((auth.uid() = employer_id));


--
-- Name: team_posts Employers can manage posts for their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can manage posts for their team" ON public.team_posts USING ((auth.uid() = employer_id));


--
-- Name: jobs Employers can manage their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can manage their own jobs" ON public.jobs USING ((auth.uid() = employer_id));


--
-- Name: team_members Employers can manage their team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can manage their team members" ON public.team_members USING ((auth.uid() = employer_id));


--
-- Name: applications Employers can update applications for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can update applications for their jobs" ON public.applications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.employer_id = auth.uid())))));


--
-- Name: applications Employers can view applications for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can view applications for their jobs" ON public.applications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.employer_id = auth.uid())))));


--
-- Name: profiles Employers can view candidate profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can view candidate profiles" ON public.profiles FOR SELECT USING (((role = 'candidate'::text) AND public.has_role(auth.uid(), 'employer'::public.app_role)));


--
-- Name: agreements Employers can view their own agreements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can view their own agreements" ON public.agreements FOR SELECT TO authenticated USING ((auth.uid() = employer_id));


--
-- Name: subscriptions Employers can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can view their own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING ((auth.uid() = employer_id));


--
-- Name: terms_acceptances Employers can view their own terms acceptances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Employers can view their own terms acceptances" ON public.terms_acceptances FOR SELECT TO authenticated USING ((auth.uid() = employer_id));


--
-- Name: jobs Everyone can view active jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active jobs" ON public.jobs FOR SELECT USING ((status = 'active'::text));


--
-- Name: user_roles Prevent direct role modification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prevent direct role modification" ON public.user_roles USING (false);


--
-- Name: sponsors Public can view active sponsors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active sponsors" ON public.sponsors FOR SELECT USING ((status = 'active'::text));


--
-- Name: branding_resources Public can view public resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view public resources" ON public.branding_resources FOR SELECT USING ((is_public = true));


--
-- Name: sponsors Sponsors can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can insert their own profile" ON public.sponsors FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sponsorships Sponsors can manage their own sponsorships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can manage their own sponsorships" ON public.sponsorships USING ((EXISTS ( SELECT 1
   FROM public.sponsors
  WHERE ((sponsors.id = sponsorships.sponsor_id) AND (sponsors.user_id = auth.uid())))));


--
-- Name: branding_resources Sponsors can manage their resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can manage their resources" ON public.branding_resources USING ((EXISTS ( SELECT 1
   FROM public.sponsors
  WHERE ((sponsors.id = branding_resources.sponsor_id) AND (sponsors.user_id = auth.uid())))));


--
-- Name: sponsors Sponsors can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can update their own profile" ON public.sponsors FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sponsor_analytics Sponsors can view their own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can view their own analytics" ON public.sponsor_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sponsors
  WHERE ((sponsors.id = sponsor_analytics.sponsor_id) AND (sponsors.user_id = auth.uid())))));


--
-- Name: sponsors Sponsors can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can view their own profile" ON public.sponsors FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: branding_resources Sponsors can view their own resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can view their own resources" ON public.branding_resources FOR SELECT USING (((sponsor_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.sponsors
  WHERE ((sponsors.id = branding_resources.sponsor_id) AND (sponsors.user_id = auth.uid()))))));


--
-- Name: sponsorships Sponsors can view their own sponsorships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sponsors can view their own sponsorships" ON public.sponsorships FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sponsors
  WHERE ((sponsors.id = sponsorships.sponsor_id) AND (sponsors.user_id = auth.uid())))));


--
-- Name: team_posts Team members can create posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can create posts" ON public.team_posts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.id = team_posts.team_member_id) AND (team_members.email = (( SELECT users.email
           FROM auth.users
          WHERE (users.id = auth.uid())))::text)))));


--
-- Name: team_members Team members can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their own profile" ON public.team_members FOR SELECT USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: branding_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branding_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsor_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsor_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

--
-- Name: sponsorships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: terms_acceptances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


