import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Globe, Linkedin, User, Briefcase, GraduationCap, Star } from "lucide-react";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  year: string;
}

interface Project {
  name: string;
  technologies: string;
  duration: string;
  description: string;
}

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects?: Project[];
  photoUrl?: string;
  photoPosition?: "left" | "right" | "none";
}

// Reusable photo chip rendered inside template headers.
// Returns null when there's no photo or when user hid it.
function ResumePhoto({ data, scale, ringClass = "ring-2 ring-white/70" }: { data: ResumeData; scale?: boolean; ringClass?: string }) {
  if (!data.photoUrl || data.photoPosition === "none") return null;
  const size = scale ? "h-3 w-3" : "h-14 w-14";
  return (
    <img
      src={data.photoUrl}
      alt={data.fullName || "Profile"}
      className={`${size} rounded-full object-cover ${ringClass} shadow-sm shrink-0`}
    />
  );
}

interface ResumeTemplateProps {
  data: ResumeData;
  scale?: boolean;
}

// ─── Template 1: Professional Blue Header ───────────────────────────
export function ExecutiveTemplate({ data, scale }: ResumeTemplateProps) {
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1.5">
      <div className={`bg-[#1e3a5f] text-white ${scale ? 'text-[6px] px-1 py-0.5' : 'text-[10px] px-2 py-1'} font-bold uppercase tracking-wider`}>
        {children}
      </div>
    </div>
  );

  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} p-4 min-h-[400px]`}>
      {/* Header - Name & Summary */}
      <div className="mb-3">
        <h1 className={`${scale ? 'text-[12px]' : 'text-xl'} font-bold text-[#1e3a5f]`}>{data.fullName || "Your Name"}</h1>
        {data.summary && (
          <p className="text-[#555] mt-1 leading-relaxed">{data.summary}</p>
        )}
      </div>

      <div className="h-[1px] bg-[#1e3a5f] mb-3" />

      {/* Two Column Layout */}
      <div className="grid grid-cols-[60%_40%] gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {data.experience.some(e => e.title || e.company) && (
            <div>
              <SectionTitle>Work Experience</SectionTitle>
              <div className="space-y-2">
                {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                  <div key={i}>
                    <p className="font-bold text-[#1e3a5f]">{exp.title}</p>
                    <p className="text-[#555]">{exp.company}</p>
                    <p className="text-[#999]">{exp.duration}</p>
                    {exp.description && (
                      <ul className="mt-0.5 text-[#555] list-disc list-inside">
                        {exp.description.split('\n').filter(Boolean).map((line, j) => (
                          <li key={j}>{line.replace(/^[-•]\s*/, '')}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projects && data.projects.some(p => p.name || p.description) && (
            <div>
              <SectionTitle>Projects</SectionTitle>
              <div className="space-y-2">
                {data.projects.filter(p => p.name || p.description).map((proj, i) => (
                  <div key={i}>
                    <p className="font-bold text-[#1e3a5f]">{proj.name}</p>
                    {proj.technologies && <p className="text-[#555]">{proj.technologies}</p>}
                    {proj.duration && <p className="text-[#999]">{proj.duration}</p>}
                    {proj.description && <p className="text-[#555] mt-0.5">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education.some(e => e.degree || e.school) && (
            <div>
              <SectionTitle>Educational Background</SectionTitle>
              {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                <div key={i} className="mb-1.5">
                  <p className="font-bold text-[#1e3a5f]">{edu.degree}</p>
                  <p className="text-[#555]">{edu.school}</p>
                  {edu.year && <p className="text-[#999]">{edu.year}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          <div>
            <SectionTitle>Contact</SectionTitle>
            <div className="space-y-0.5 text-[#555]">
              {data.location && <p className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0 text-[#1e3a5f]" />{data.location}</p>}
              {data.phone && <p className="flex items-center gap-1"><Phone className="h-2.5 w-2.5 shrink-0 text-[#1e3a5f]" />{data.phone}</p>}
              {data.email && <p className="flex items-center gap-1"><Mail className="h-2.5 w-2.5 shrink-0 text-[#1e3a5f]" />{data.email}</p>}
            </div>
          </div>

          {data.skills.length > 0 && (
            <div>
              <SectionTitle>Skills</SectionTitle>
              <div className="space-y-0.5">
                {data.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-1 text-[#555]">
                    <div className="h-1 w-1 rounded-full bg-[#1e3a5f] shrink-0" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 2: Professional Clean ─────────────────────────────────
export function ProfessionalTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} p-4 min-h-[400px]`}>
      {/* Header */}
      <div className="border-b-2 border-[#2563eb] pb-3 mb-3">
        <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-bold text-[#1e293b]`}>{data.fullName || "Your Name"}</h1>
        <p className="text-[#2563eb] font-medium">{data.experience[0]?.title || "Professional"}</p>
        <div className="flex flex-wrap gap-2 mt-1 text-[#64748b]">
          {data.email && <span className="flex items-center gap-0.5"><Mail className="h-2 w-2" />{data.email}</span>}
          {data.phone && <span className="flex items-center gap-0.5"><Phone className="h-2 w-2" />{data.phone}</span>}
          {data.location && <span className="flex items-center gap-0.5"><MapPin className="h-2 w-2" />{data.location}</span>}
        </div>
      </div>

      {data.summary && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#2563eb] uppercase mb-1.5`}>Summary</h3>
          <p className="text-[#475569]">{data.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-[60%_40%] gap-3">
        <div className="space-y-3">
          {data.experience.some(e => e.title || e.company) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#2563eb] uppercase mb-1.5`}>Experience</h3>
              <div className="space-y-2">
                {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                  <div key={i}>
                    <div className="flex justify-between">
                      <p className="font-bold text-[#1e293b]">{exp.title}</p>
                      <span className="text-[#94a3b8]">{exp.duration}</span>
                    </div>
                    <p className="text-[#2563eb]">{exp.company}</p>
                    {exp.description && <p className="text-[#64748b] mt-0.5">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projects && data.projects.some(p => p.name || p.description) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#2563eb] uppercase mb-1.5`}>Projects</h3>
              <div className="space-y-2">
                {data.projects.filter(p => p.name || p.description).map((proj, i) => (
                  <div key={i}>
                    <p className="font-bold text-[#1e293b]">{proj.name}</p>
                    <p className="text-[#2563eb]">{proj.technologies} {proj.duration && <span className="text-[#94a3b8]">| {proj.duration}</span>}</p>
                    {proj.description && <p className="text-[#64748b] mt-0.5">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {data.education.some(e => e.degree || e.school) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#2563eb] uppercase mb-1.5`}>Education</h3>
              {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                <div key={i} className="mb-1">
                  <p className="font-bold text-[#1e293b]">{edu.degree}</p>
                  <p className="text-[#64748b]">{edu.school}</p>
                  {edu.year && <p className="text-[#94a3b8]">{edu.year}</p>}
                </div>
              ))}
            </div>
          )}

          {data.skills.length > 0 && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#2563eb] uppercase mb-1.5`}>Skills</h3>
              <div className="flex flex-wrap gap-0.5">
                {data.skills.map((skill, i) => (
                  <span key={i} className="bg-[#eff6ff] text-[#2563eb] px-1 py-0.5 rounded">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 3: Modern Accent ──────────────────────────────────────
export function ModernAccentTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} min-h-[400px]`}>
      {/* Header with accent */}
      <div className="bg-gradient-to-r from-[#0f766e] to-[#14b8a6] text-white p-3">
        <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-bold`}>{data.fullName || "Your Name"}</h1>
        <p className="opacity-90">{data.experience[0]?.title || "Professional"}</p>
        <div className="flex flex-wrap gap-2 mt-1 opacity-80">
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>• {data.phone}</span>}
          {data.location && <span>• {data.location}</span>}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {data.summary && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f766e] border-b border-[#0f766e] pb-1 mb-2`}>ABOUT ME</h3>
            <p className="text-[#475569]">{data.summary}</p>
          </div>
        )}

        {data.experience.some(e => e.title || e.company) && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f766e] border-b border-[#0f766e] pb-1 mb-2`}>EXPERIENCE</h3>
            <div className="space-y-2">
              {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{exp.title}</p>
                      <p className="text-[#0f766e]">{exp.company}</p>
                    </div>
                    <span className="text-[#94a3b8] whitespace-nowrap">{exp.duration}</span>
                  </div>
                  {exp.description && <p className="text-[#64748b] mt-0.5">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects && data.projects.some(p => p.name || p.description) && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f766e] border-b border-[#0f766e] pb-1 mb-2`}>PROJECTS</h3>
            <div className="space-y-2">
              {data.projects.filter(p => p.name || p.description).map((proj, i) => (
                <div key={i}>
                  <p className="font-bold">{proj.name}</p>
                  <p className="text-[#0f766e]">{proj.technologies} {proj.duration && <span className="text-[#94a3b8]">| {proj.duration}</span>}</p>
                  {proj.description && <p className="text-[#64748b] mt-0.5">{proj.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {data.education.some(e => e.degree || e.school) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f766e] border-b border-[#0f766e] pb-1 mb-2`}>EDUCATION</h3>
              {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                <div key={i} className="mb-1">
                  <p className="font-bold">{edu.degree}</p>
                  <p className="text-[#64748b]">{edu.school} {edu.year && `| ${edu.year}`}</p>
                </div>
              ))}
            </div>
          )}

          {data.skills.length > 0 && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f766e] border-b border-[#0f766e] pb-1 mb-2`}>SKILLS</h3>
              <div className="flex flex-wrap gap-0.5">
                {data.skills.map((skill, i) => (
                  <span key={i} className="bg-[#f0fdfa] text-[#0f766e] px-1 py-0.5 rounded border border-[#99f6e4]">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 4: Bold Split ─────────────────────────────────────────
export function BoldSplitTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} min-h-[400px]`}>
      <div className="flex">
        {/* Left accent bar */}
        <div className="w-1 bg-gradient-to-b from-[#7c3aed] to-[#ec4899]" />
        <div className="flex-1 p-3">
          {/* Name header */}
          <div className="mb-3">
            <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-black text-[#1e1b4b]`}>{(data.fullName || "Your Name").toUpperCase()}</h1>
            <p className="text-[#7c3aed] font-semibold">{data.experience[0]?.title || "Professional"}</p>
            <div className="flex flex-wrap gap-2 mt-1 text-[#6b7280]">
              {data.email && <span>{data.email}</span>}
              {data.phone && <span>| {data.phone}</span>}
              {data.location && <span>| {data.location}</span>}
            </div>
          </div>

          {data.summary && (
            <div className="mb-3 bg-[#f5f3ff] p-2 rounded">
              <p className="text-[#374151]">{data.summary}</p>
            </div>
          )}

          {data.experience.some(e => e.title || e.company) && (
            <div className="mb-3">
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#7c3aed] uppercase tracking-widest mb-1`}>Experience</h3>
              <div className="space-y-2">
                {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                  <div key={i} className="border-l-2 border-[#c4b5fd] pl-2">
                    <p className="font-bold text-[#1e1b4b]">{exp.title}</p>
                    <p className="text-[#7c3aed]">{exp.company} <span className="text-[#9ca3af]">| {exp.duration}</span></p>
                    {exp.description && <p className="text-[#6b7280] mt-0.5">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projects && data.projects.some(p => p.name || p.description) && (
            <div className="mb-3">
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#7c3aed] uppercase tracking-widest mb-1`}>Projects</h3>
              <div className="space-y-2">
                {data.projects.filter(p => p.name || p.description).map((proj, i) => (
                  <div key={i} className="border-l-2 border-[#c4b5fd] pl-2">
                    <p className="font-bold text-[#1e1b4b]">{proj.name}</p>
                    <p className="text-[#7c3aed]">{proj.technologies} <span className="text-[#9ca3af]">| {proj.duration}</span></p>
                    {proj.description && <p className="text-[#6b7280] mt-0.5">{proj.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {data.education.some(e => e.degree || e.school) && (
              <div>
                <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#7c3aed] uppercase tracking-widest mb-1`}>Education</h3>
                {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                  <div key={i} className="mb-1">
                    <p className="font-bold text-[#1e1b4b]">{edu.degree}</p>
                    <p className="text-[#6b7280]">{edu.school}</p>
                    {edu.year && <p className="text-[#9ca3af]">{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}

            {data.skills.length > 0 && (
              <div>
                <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#7c3aed] uppercase tracking-widest mb-1`}>Skills</h3>
                <div className="flex flex-wrap gap-0.5">
                  {data.skills.map((skill, i) => (
                    <span key={i} className="bg-[#f5f3ff] text-[#7c3aed] px-1 py-0.5 rounded text-center">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template 5: Minimalist Elegant ─────────────────────────────────
export function MinimalistTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} p-4 min-h-[400px]`}>
      <div className="text-center mb-3">
        <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-light tracking-[0.3em] text-[#111827] uppercase`}>{data.fullName || "Your Name"}</h1>
        <div className="w-12 h-px bg-[#d1d5db] mx-auto my-1.5" />
        <p className="text-[#6b7280] tracking-wider">{data.experience[0]?.title || "Professional"}</p>
        <div className="flex justify-center gap-3 mt-1 text-[#9ca3af]">
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
        </div>
      </div>

      {data.summary && (
        <div className="mb-3 text-center">
          <p className="text-[#4b5563] max-w-[80%] mx-auto leading-relaxed">{data.summary}</p>
        </div>
      )}

      {data.experience.some(e => e.title || e.company) && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} tracking-[0.2em] text-[#374151] uppercase text-center mb-2`}>Experience</h3>
          <div className="space-y-2">
            {data.experience.filter(e => e.title || e.company).map((exp, i) => (
              <div key={i} className="text-center">
                <p className="font-medium text-[#111827]">{exp.title}</p>
                <p className="text-[#6b7280]">{exp.company} · {exp.duration}</p>
                {exp.description && <p className="text-[#9ca3af]">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.education.some(e => e.degree || e.school) && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} tracking-[0.2em] text-[#374151] uppercase text-center mb-2`}>Education</h3>
          {data.education.filter(e => e.degree || e.school).map((edu, i) => (
            <div key={i} className="text-center mb-1">
              <p className="font-medium text-[#111827]">{edu.degree}</p>
              <p className="text-[#6b7280]">{edu.school} {edu.year && `· ${edu.year}`}</p>
            </div>
          ))}
        </div>
      )}

      {data.skills.length > 0 && (
        <div>
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} tracking-[0.2em] text-[#374151] uppercase text-center mb-1`}>Skills</h3>
          <p className="text-center text-[#6b7280]">{data.skills.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Template 6: Corporate Navy ─────────────────────────────────────
export function CorporateTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} flex min-h-[400px]`}>
      {/* Right sidebar */}
      <div className="w-[65%] p-3 space-y-3">
        <div>
          <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-bold text-[#0f172a]`}>{data.fullName || "Your Name"}</h1>
          <p className="text-[#ea580c] font-medium">{data.experience[0]?.title || "Professional"}</p>
        </div>

        {data.summary && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f172a] uppercase border-b-2 border-[#ea580c] pb-1 mb-2 inline-block`}>About</h3>
            <p className="text-[#475569]">{data.summary}</p>
          </div>
        )}

        {data.experience.some(e => e.title || e.company) && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#0f172a] uppercase border-b-2 border-[#ea580c] pb-1 mb-2 inline-block`}>Experience</h3>
            <div className="space-y-2">
              {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                <div key={i}>
                  <p className="font-bold text-[#0f172a]">{exp.title}</p>
                  <p className="text-[#ea580c]">{exp.company}</p>
                  <p className="text-[#94a3b8]">{exp.duration}</p>
                  {exp.description && <p className="text-[#64748b] mt-0.5">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-[35%] bg-[#0f172a] text-white p-3 space-y-3">
        <div className="space-y-1">
          <h3 className={`${scale ? 'text-[6px]' : 'text-[10px]'} font-semibold text-[#ea580c] uppercase`}>Contact</h3>
          {data.email && <p className="opacity-80">{data.email}</p>}
          {data.phone && <p className="opacity-80">{data.phone}</p>}
          {data.location && <p className="opacity-80">{data.location}</p>}
        </div>

        {data.skills.length > 0 && (
          <div className="space-y-1">
            <h3 className={`${scale ? 'text-[6px]' : 'text-[10px]'} font-semibold text-[#ea580c] uppercase`}>Skills</h3>
            {data.skills.map((skill, i) => (
              <p key={i} className="opacity-80">• {skill}</p>
            ))}
          </div>
        )}

        {data.education.some(e => e.degree || e.school) && (
          <div className="space-y-1">
            <h3 className={`${scale ? 'text-[6px]' : 'text-[10px]'} font-semibold text-[#ea580c] uppercase`}>Education</h3>
            {data.education.filter(e => e.degree || e.school).map((edu, i) => (
              <div key={i}>
                <p className="font-semibold">{edu.degree}</p>
                <p className="opacity-70">{edu.school}</p>
                {edu.year && <p className="opacity-50">{edu.year}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template 7: Two-Column Modern ──────────────────────────────────
export function TwoColumnTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} min-h-[400px]`}>
      <div className="bg-[#1e40af] text-white p-3 flex items-end gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <User className={`${scale ? 'h-3 w-3' : 'h-5 w-5'}`} />
        </div>
        <div>
          <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-bold`}>{data.fullName || "Your Name"}</h1>
          <p className="opacity-80">{data.experience[0]?.title || "Professional"}</p>
        </div>
      </div>

      <div className="grid grid-cols-[55%_45%] gap-0">
        <div className="p-3 space-y-3">
          {data.summary && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1e40af] mb-1`}>SUMMARY</h3>
              <p className="text-[#475569]">{data.summary}</p>
            </div>
          )}

          {data.experience.some(e => e.title || e.company) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1e40af] mb-1`}>EXPERIENCE</h3>
              <div className="space-y-2">
                {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                  <div key={i}>
                    <p className="font-bold">{exp.title}</p>
                    <p className="text-[#1e40af]">{exp.company}</p>
                    <p className="text-[#9ca3af]">{exp.duration}</p>
                    {exp.description && <p className="text-[#64748b]">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#f1f5f9] p-3 space-y-3">
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1e40af] mb-1`}>CONTACT</h3>
            {data.email && <p className="text-[#475569]">{data.email}</p>}
            {data.phone && <p className="text-[#475569]">{data.phone}</p>}
            {data.location && <p className="text-[#475569]">{data.location}</p>}
          </div>

          {data.education.some(e => e.degree || e.school) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1e40af] mb-1`}>EDUCATION</h3>
              {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                <div key={i} className="mb-1">
                  <p className="font-bold">{edu.degree}</p>
                  <p className="text-[#64748b]">{edu.school}</p>
                  {edu.year && <p className="text-[#9ca3af]">{edu.year}</p>}
                </div>
              ))}
            </div>
          )}

          {data.skills.length > 0 && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1e40af] mb-1`}>SKILLS</h3>
              <div className="flex flex-wrap gap-0.5">
                {data.skills.map((skill, i) => (
                  <span key={i} className="bg-[#dbeafe] text-[#1e40af] px-1 py-0.5 rounded">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 8: Warm Sidebar ───────────────────────────────────────
export function WarmSidebarTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} flex min-h-[400px]`}>
      <div className="w-[35%] bg-[#fef3c7] p-3 space-y-3">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#d97706] flex items-center justify-center mb-1">
            <User className={`${scale ? 'h-3 w-3' : 'h-4 w-4'} text-white`} />
          </div>
          <h2 className={`${scale ? 'text-[8px]' : 'text-sm'} font-bold text-[#78350f]`}>{data.fullName || "Your Name"}</h2>
          <p className="text-[#92400e]">{data.experience[0]?.title || "Professional"}</p>
        </div>

        <div>
          <h3 className={`${scale ? 'text-[6px]' : 'text-[10px]'} font-bold text-[#78350f] uppercase mb-0.5`}>Contact</h3>
          {data.email && <p className="text-[#92400e]">{data.email}</p>}
          {data.phone && <p className="text-[#92400e]">{data.phone}</p>}
          {data.location && <p className="text-[#92400e]">{data.location}</p>}
        </div>

        {data.skills.length > 0 && (
          <div>
            <h3 className={`${scale ? 'text-[6px]' : 'text-[10px]'} font-bold text-[#78350f] uppercase mb-0.5`}>Skills</h3>
            <div className="space-y-0.5">
              {data.skills.map((skill, i) => (
                <div key={i} className="bg-white/60 rounded px-1 py-0.5 text-[#78350f]">{skill}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-[65%] p-3 space-y-3">
        {data.summary && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#78350f] mb-1`}>PROFILE</h3>
            <p className="text-[#4b5563]">{data.summary}</p>
          </div>
        )}

        {data.experience.some(e => e.title || e.company) && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#78350f] mb-1`}>EXPERIENCE</h3>
            <div className="space-y-2">
              {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                <div key={i} className="border-l-2 border-[#d97706] pl-2">
                  <p className="font-bold">{exp.title}</p>
                  <p className="text-[#d97706]">{exp.company}</p>
                  <p className="text-[#9ca3af]">{exp.duration}</p>
                  {exp.description && <p className="text-[#6b7280]">{exp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.education.some(e => e.degree || e.school) && (
          <div>
            <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#78350f] mb-1`}>EDUCATION</h3>
            {data.education.filter(e => e.degree || e.school).map((edu, i) => (
              <div key={i} className="mb-1">
                <p className="font-bold">{edu.degree}</p>
                <p className="text-[#6b7280]">{edu.school} {edu.year && `(${edu.year})`}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Template 9: Tech Grid ──────────────────────────────────────────
export function TechGridTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-[#fafafa] ${scale ? 'text-[6px]' : 'text-xs'} p-3 min-h-[400px]`}>
      <div className="flex items-center gap-3 mb-3 pb-2 border-b-2 border-[#18181b]">
        <div>
          <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-black text-[#18181b] tracking-tight`}>{data.fullName || "Your Name"}</h1>
          <p className="text-[#a1a1aa] uppercase tracking-widest font-medium">{data.experience[0]?.title || "Professional"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-[#71717a]">
        {data.email && <span className="bg-[#f4f4f5] px-1.5 py-0.5 rounded">{data.email}</span>}
        {data.phone && <span className="bg-[#f4f4f5] px-1.5 py-0.5 rounded">{data.phone}</span>}
        {data.location && <span className="bg-[#f4f4f5] px-1.5 py-0.5 rounded">{data.location}</span>}
      </div>

      {data.summary && (
        <div className="mb-3 bg-white p-2 rounded border border-[#e4e4e7]">
          <p className="text-[#3f3f46]">{data.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          {data.experience.some(e => e.title || e.company) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#18181b] mb-1 flex items-center gap-1`}>
                <Briefcase className="h-2.5 w-2.5" /> EXPERIENCE
              </h3>
              <div className="space-y-2">
                {data.experience.filter(e => e.title || e.company).map((exp, i) => (
                  <div key={i} className="bg-white p-1.5 rounded border border-[#e4e4e7]">
                    <p className="font-bold text-[#18181b]">{exp.title}</p>
                    <p className="text-[#71717a]">{exp.company} · {exp.duration}</p>
                    {exp.description && <p className="text-[#a1a1aa] mt-0.5">{exp.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {data.education.some(e => e.degree || e.school) && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#18181b] mb-1 flex items-center gap-1`}>
                <GraduationCap className="h-2.5 w-2.5" /> EDUCATION
              </h3>
              {data.education.filter(e => e.degree || e.school).map((edu, i) => (
                <div key={i} className="bg-white p-1.5 rounded border border-[#e4e4e7] mb-1">
                  <p className="font-bold text-[#18181b]">{edu.degree}</p>
                  <p className="text-[#71717a]">{edu.school}</p>
                  {edu.year && <p className="text-[#a1a1aa]">{edu.year}</p>}
                </div>
              ))}
            </div>
          )}

          {data.skills.length > 0 && (
            <div>
              <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#18181b] mb-1 flex items-center gap-1`}>
                <Star className="h-2.5 w-2.5" /> SKILLS
              </h3>
              <div className="flex flex-wrap gap-0.5">
                {data.skills.map((skill, i) => (
                  <span key={i} className="bg-[#18181b] text-white px-1.5 py-0.5 rounded">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template 10: Classic Serif ─────────────────────────────────────
export function ClassicSerifTemplate({ data, scale }: ResumeTemplateProps) {
  return (
    <div className={`bg-white ${scale ? 'text-[6px]' : 'text-xs'} p-4 min-h-[400px]`} style={{ fontFamily: 'Georgia, serif' }}>
      <div className="text-center border-b-2 border-[#1f2937] pb-2 mb-3">
        <h1 className={`${scale ? 'text-[10px]' : 'text-lg'} font-bold text-[#1f2937]`}>{data.fullName || "Your Name"}</h1>
        <div className="flex justify-center gap-2 mt-0.5 text-[#6b7280]">
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>| {data.phone}</span>}
          {data.location && <span>| {data.location}</span>}
        </div>
      </div>

      {data.summary && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1f2937] uppercase border-b border-[#d1d5db] pb-0.5 mb-1`}>Professional Summary</h3>
          <p className="text-[#374151] leading-relaxed italic">{data.summary}</p>
        </div>
      )}

      {data.experience.some(e => e.title || e.company) && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1f2937] uppercase border-b border-[#d1d5db] pb-0.5 mb-1`}>Professional Experience</h3>
          <div className="space-y-2">
            {data.experience.filter(e => e.title || e.company).map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <p className="font-bold text-[#1f2937]">{exp.title}</p>
                  <span className="text-[#6b7280] italic">{exp.duration}</span>
                </div>
                <p className="text-[#374151] italic">{exp.company}</p>
                {exp.description && <p className="text-[#6b7280] mt-0.5">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.education.some(e => e.degree || e.school) && (
        <div className="mb-3">
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1f2937] uppercase border-b border-[#d1d5db] pb-0.5 mb-1`}>Education</h3>
          {data.education.filter(e => e.degree || e.school).map((edu, i) => (
            <div key={i} className="flex justify-between mb-1">
              <div>
                <p className="font-bold text-[#1f2937]">{edu.degree}</p>
                <p className="text-[#6b7280] italic">{edu.school}</p>
              </div>
              {edu.year && <span className="text-[#9ca3af]">{edu.year}</span>}
            </div>
          ))}
        </div>
      )}

      {data.skills.length > 0 && (
        <div>
          <h3 className={`${scale ? 'text-[7px]' : 'text-xs'} font-bold text-[#1f2937] uppercase border-b border-[#d1d5db] pb-0.5 mb-1`}>Skills</h3>
          <p className="text-[#374151]">{data.skills.join(" • ")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Template Map ───────────────────────────────────────────────────
export const TEMPLATE_CONFIG = [
  { id: "executive", name: "Executive", description: "Professional blue header", component: ExecutiveTemplate, preview: "bg-gradient-to-r from-[#1e3a5f] to-[#3b6cb0]" },
  { id: "professional", name: "Professional", description: "Clean & corporate", component: ProfessionalTemplate, preview: "bg-gradient-to-r from-[#2563eb] to-[#3b82f6]" },
  { id: "modern-accent", name: "Modern", description: "Teal accent design", component: ModernAccentTemplate, preview: "bg-gradient-to-r from-[#0f766e] to-[#14b8a6]" },
  { id: "bold-split", name: "Bold Split", description: "Purple gradient bar", component: BoldSplitTemplate, preview: "bg-gradient-to-r from-[#7c3aed] to-[#ec4899]" },
  { id: "minimalist", name: "Minimalist", description: "Elegant & simple", component: MinimalistTemplate, preview: "bg-gradient-to-r from-[#d1d5db] to-[#f3f4f6]" },
  { id: "corporate", name: "Corporate", description: "Navy & orange", component: CorporateTemplate, preview: "bg-gradient-to-r from-[#0f172a] to-[#ea580c]" },
  { id: "two-column", name: "Two Column", description: "Blue header split", component: TwoColumnTemplate, preview: "bg-gradient-to-r from-[#1e40af] to-[#60a5fa]" },
  { id: "warm-sidebar", name: "Warm", description: "Amber sidebar", component: WarmSidebarTemplate, preview: "bg-gradient-to-r from-[#fef3c7] to-[#d97706]" },
  { id: "tech-grid", name: "Tech Grid", description: "Developer style", component: TechGridTemplate, preview: "bg-gradient-to-r from-[#18181b] to-[#3f3f46]" },
  { id: "classic-serif", name: "Classic", description: "Traditional serif", component: ClassicSerifTemplate, preview: "bg-gradient-to-r from-[#1f2937] to-[#6b7280]" },
];

export function getTemplateComponent(templateId: string) {
  return TEMPLATE_CONFIG.find(t => t.id === templateId)?.component || ExecutiveTemplate;
}
