import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Github, Linkedin, Twitter, ExternalLink, Loader2, Code, Mail, Phone, MapPin } from "lucide-react";

const ensureUrl = (url: string) => {
  if (!url) return url;
  if (url.match(/^https?:\/\//i)) return url;
  return `https://${url}`;
};

const PublicPortfolio = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!userId) { setNotFound(true); setLoading(false); return; }

      const { data: pData } = await supabase
        .from("freelancer_portfolios")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .maybeSingle();

      if (!pData) { setNotFound(true); setLoading(false); return; }

      setPortfolio(pData);

      const [{ data: projData }, { data: profData }] = await Promise.all([
        supabase.from("freelancer_portfolio_projects").select("*").eq("portfolio_id", pData.id).order("display_order"),
        supabase.from("profiles").select("full_name, email, mobile, location, profile_picture, experience_level, highest_qualification").eq("id", userId).maybeSingle(),
      ]);

      setProjects(projData || []);
      setProfile(profData);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio Not Found</h1>
        <p className="text-muted-foreground">This portfolio doesn't exist or is private.</p>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Freelancer Portfolio - Gradia</title>
        <meta name="description" content="View this freelancer's public portfolio, projects, and skills on Gradia." />
        <link rel="canonical" href="https://gradiaa.com/portfolio" />
      </Helmet>
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          {profile?.profile_picture ? (
            <img src={profile.profile_picture} alt="" className="h-28 w-28 rounded-full object-cover mx-auto mb-4 border-4 border-accent/20" />
          ) : (
            <div className="h-28 w-28 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Code className="h-12 w-12 text-accent" />
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground">{profile?.full_name || "Freelancer"}</h1>
          {portfolio.tagline && <p className="text-lg text-muted-foreground mt-2">{portfolio.tagline}</p>}
          
          {(profile?.experience_level || profile?.highest_qualification) && (
            <p className="text-sm text-muted-foreground mt-1">
              {profile.highest_qualification}{profile.experience_level ? ` • ${profile.experience_level}` : ""}
            </p>
          )}

          <div className="flex justify-center gap-4 mt-4">
            {portfolio.website && <a href={ensureUrl(portfolio.website)} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" /></a>}
            {portfolio.github && <a href={ensureUrl(portfolio.github)} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" /></a>}
            {portfolio.linkedin && <a href={ensureUrl(portfolio.linkedin)} target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" /></a>}
            {portfolio.twitter && <a href={ensureUrl(portfolio.twitter)} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-accent transition-colors" /></a>}
          </div>
        </div>

        {/* Bio */}
        {portfolio.bio && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">About Me</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{portfolio.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {portfolio.skills?.length > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {portfolio.skills.map((s: string) => (
                  <Badge key={s} className="bg-accent/10 text-accent border-accent/20 px-3 py-1">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p: any) => (
                <Card key={p.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-44 object-cover" />}
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-semibold text-foreground text-lg">{p.title}</h3>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {p.tech_stack?.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                    {p.project_url && (
                      <a href={p.project_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline mt-2">
                        <ExternalLink className="h-3 w-3" /> View Project
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contact Footer */}
        <Card>
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-3">Get In Touch</h2>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              {profile?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.email}</span>}
              {profile?.mobile && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {profile.mobile}</span>}
              {profile?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location}</span>}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by Gradia
        </p>
      </div>
    </div>
    </>
  );
};

export default PublicPortfolio;
