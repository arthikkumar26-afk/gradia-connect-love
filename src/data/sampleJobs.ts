export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "internship" | "fresher" | "experienced";
  category: "software" | "education";
  salary?: string;
  experience: string;
  posted: string;
  description: string;
  skills: string[];
  applicants?: number;
  featured?: boolean;
  requirements?: string[];
  benefits?: string[];
  companyDescription?: string;
  tags?: string[];
}

export const sampleJobs: Job[] = [
  {
    id: "1",
    title: "School Principal",
    company: "MDN Edify Education",
    location: "Hyderabad",
    type: "full-time",
    category: "education",
    salary: "₹1,00,000-₹1,50,000 /month",
    experience: "10+ yrs exp",
    posted: "2 days ago",
    description: "Lead our school with vision and dedication. Responsible for overall school administration, staff management, curriculum oversight, and student development programs. Create a positive learning environment that fosters academic excellence and character development.",
    skills: ["Leadership", "Education Management", "Curriculum Development", "Staff Management", "Student Relations"],
    applicants: 23,
    featured: true,
    tags: ["Urgent", "Leadership Role"],
    requirements: [
      "10+ years of educational leadership experience",
      "Master's in Education Administration",
      "Strong leadership and communication skills",
      "Experience in curriculum development"
    ],
    benefits: [
      "Competitive salary package",
      "Health insurance",
      "Professional development opportunities",
      "Flexible working hours"
    ],
    companyDescription: "MDN Edify Education is a leading educational institution committed to providing quality education and holistic development."
  },
  {
    id: "2",
    title: "Hiring School Clusters Principal",
    company: "Education Group",
    location: "Kompally",
    type: "full-time",
    category: "education",
    salary: "₹90,000-₹1,40,000 /month",
    experience: "Day shift",
    posted: "1 day ago",
    description: "Oversee multiple school clusters and ensure consistent quality education across all institutions. Develop strategic plans, monitor performance, and drive educational excellence across the network.",
    skills: ["Multi-site Management", "Strategic Planning", "Quality Assurance", "Team Leadership", "Educational Administration"],
    applicants: 15,
    featured: false,
    tags: ["Easy Apply"],
    requirements: [
      "8+ years in educational leadership",
      "Experience managing multiple locations",
      "Strong analytical skills",
      "Proven track record in education"
    ],
    benefits: [
      "Attractive compensation",
      "Travel allowances",
      "Performance bonuses",
      "Career growth opportunities"
    ],
    companyDescription: "A network of educational institutions focused on delivering excellence across multiple locations."
  },
  {
    id: "3",
    title: "Math Teacher (High School)",
    company: "Oakridge International",
    location: "Gachibowli",
    type: "full-time",
    category: "education",
    salary: "₹35,000-₹50,000 /month",
    experience: "3-5 yrs exp",
    posted: "3 days ago",
    description: "Inspire high school students in mathematics. Create engaging lesson plans, conduct assessments, and help students excel in mathematical concepts. Foster critical thinking and problem-solving skills.",
    skills: ["Mathematics", "Teaching", "Curriculum Planning", "Student Assessment", "Classroom Management"],
    applicants: 45,
    featured: false,
    tags: ["Easy Apply"],
    requirements: [
      "Bachelor's in Mathematics or related field",
      "3-5 years high school teaching experience",
      "Strong subject knowledge",
      "Excellent communication skills"
    ],
    benefits: [
      "Competitive salary",
      "Professional development",
      "Health benefits",
      "Performance incentives"
    ],
    companyDescription: "Oakridge International is renowned for academic excellence and innovative teaching methodologies."
  },
  {
    id: "4",
    title: "Science Teacher (CBSE)",
    company: "Academic Heights",
    location: "Hyderabad",
    type: "full-time",
    category: "education",
    salary: "₹30,000-₹45,000 /month",
    experience: "2-4 yrs exp",
    posted: "4 days ago",
    description: "Teach CBSE curriculum science subjects with hands-on laboratory experience. Develop practical learning approaches and prepare students for competitive examinations.",
    skills: ["Science Teaching", "CBSE Curriculum", "Laboratory Skills", "Exam Preparation", "Student Mentoring"],
    applicants: 38,
    featured: false,
    tags: ["CBSE", "Laboratory"],
    requirements: [
      "M.Sc in relevant science subject",
      "CBSE teaching experience",
      "Laboratory management skills",
      "Strong academic background"
    ],
    benefits: [
      "Salary as per experience",
      "Teaching resources support",
      "Professional growth",
      "Health insurance"
    ],
    companyDescription: "Academic Heights focuses on comprehensive education with strong emphasis on science and mathematics."
  },
  {
    id: "5",
    title: "English Teacher (Middle School)",
    company: "Delhi Public School",
    location: "Secunderabad",
    type: "full-time",
    category: "education",
    salary: "₹28,000-₹40,000 /month",
    experience: "2+ yrs exp",
    posted: "5 days ago",
    description: "Foster language skills and literary appreciation in middle school students. Design creative lesson plans, conduct reading programs, and develop communication skills.",
    skills: ["English Literature", "Language Teaching", "Creative Writing", "Reading Programs", "Communication Skills"],
    applicants: 52,
    featured: true,
    tags: ["DPS Brand", "Creative"],
    requirements: [
      "Master's in English Literature",
      "2+ years teaching experience",
      "Creative teaching methods",
      "Strong language skills"
    ],
    benefits: [
      "Prestigious institution",
      "Professional development",
      "Library access",
      "Performance bonuses"
    ],
    companyDescription: "Delhi Public School is one of India's most prestigious educational institutions with a legacy of excellence."
  },
  {
    id: "6",
    title: "Hiring School Director (Hyd)",
    company: "MDN Edify Education",
    location: "Hyderabad",
    type: "full-time",
    category: "education",
    salary: "₹1,00,000-₹1,50,000 /month",
    experience: "12+ yrs exp",
    posted: "1 day ago",
    description: "Lead strategic vision and operational excellence for our Hyderabad school. Drive growth, ensure quality education, and build strong community relationships.",
    skills: ["Strategic Leadership", "Educational Vision", "Operations Management", "Community Relations", "Growth Strategy"],
    applicants: 12,
    featured: true,
    tags: ["Executive Role", "Strategic"],
    requirements: [
      "12+ years educational leadership",
      "Proven track record in school growth",
      "Strategic planning experience",
      "Strong business acumen"
    ],
    benefits: [
      "Executive compensation",
      "Equity participation",
      "Leadership development",
      "Comprehensive benefits"
    ],
    companyDescription: "MDN Edify Education is expanding rapidly with a focus on innovative educational approaches."
  },
  {
    id: "7",
    title: "Software Developer (Fresher)",
    company: "TCS",
    location: "Hyderabad",
    type: "fresher",
    category: "software",
    salary: "₹3.5-5 LPA",
    experience: "Fresher",
    posted: "2 days ago",
    description: "Join India's leading IT services company as a software developer. Work on cutting-edge projects, receive comprehensive training, and build a strong foundation in software development.",
    skills: ["Programming", "Software Development", "Problem Solving", "Team Collaboration", "Learning Agility"],
    applicants: 156,
    featured: true,
    tags: ["Fresher", "Training Provided", "MNC"],
    requirements: [
      "Bachelor's in Computer Science or related field",
      "Strong programming fundamentals",
      "Good analytical skills",
      "Willingness to learn"
    ],
    benefits: [
      "Comprehensive training program",
      "Career growth opportunities",
      "Health insurance",
      "Employee benefits"
    ],
    companyDescription: "TCS is a global leader in IT services, consulting and business solutions with a focus on innovation and employee development."
  },
  {
    id: "8",
    title: "Java Full-Stack Developer",
    company: "Infosys",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹6-9 LPA",
    experience: "2-4 yrs exp",
    posted: "3 days ago",
    description: "Develop end-to-end applications using Java technologies. Work with modern frameworks, databases, and cloud platforms to deliver scalable solutions.",
    skills: ["Java", "Spring Boot", "React", "MySQL", "REST APIs", "Cloud Computing"],
    applicants: 89,
    featured: false,
    tags: ["Full-Stack", "Java"],
    requirements: [
      "2-4 years Java development experience",
      "Full-stack development skills",
      "Experience with modern frameworks",
      "Database knowledge"
    ],
    benefits: [
      "Competitive salary",
      "Flexible working",
      "Learning opportunities",
      "Global exposure"
    ],
    companyDescription: "Infosys is a global leader in next-generation digital services and consulting, helping clients navigate digital transformation."
  },
  {
    id: "9",
    title: "Frontend React Developer",
    company: "Tech Solutions",
    location: "Remote",
    type: "full-time",
    category: "software",
    salary: "₹5-7 LPA",
    experience: "1-3 yrs exp",
    posted: "1 day ago",
    description: "Build modern, responsive web applications using React and related technologies. Work in a collaborative environment with design and backend teams.",
    skills: ["React", "JavaScript", "HTML/CSS", "Redux", "TypeScript", "Git"],
    applicants: 67,
    featured: true,
    tags: ["Remote", "React", "Frontend"],
    requirements: [
      "1-3 years React development experience",
      "Strong JavaScript knowledge",
      "Experience with modern development tools",
      "Portfolio of projects"
    ],
    benefits: [
      "Remote work flexibility",
      "Competitive package",
      "Learning budget",
      "Health benefits"
    ],
    companyDescription: "Tech Solutions specializes in creating innovative web applications for startups and enterprises."
  },
  {
    id: "10",
    title: "Python Backend Developer",
    company: "Wipro",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹7-11 LPA",
    experience: "3-5 yrs exp",
    posted: "4 days ago",
    description: "Design and develop robust backend systems using Python. Work with databases, APIs, and cloud services to build scalable applications.",
    skills: ["Python", "Django", "Flask", "PostgreSQL", "Docker", "AWS"],
    applicants: 43,
    featured: false,
    tags: ["Backend", "Python", "Cloud"],
    requirements: [
      "3-5 years Python development",
      "Backend development expertise",
      "Database design experience",
      "Cloud platform knowledge"
    ],
    benefits: [
      "Excellent compensation",
      "Skill development programs",
      "Health insurance",
      "Career advancement"
    ],
    companyDescription: "Wipro is a leading global information technology, consulting and business process services company."
  },
  {
    id: "11",
    title: "Data Analyst (Fresher)",
    company: "Accenture",
    location: "Hyderabad",
    type: "fresher",
    category: "software",
    salary: "₹3-4.5 LPA",
    experience: "Fresher",
    posted: "2 days ago",
    description: "Analyze data to drive business insights and decision-making. Learn advanced analytics tools and techniques while working on real client projects.",
    skills: ["Data Analysis", "Excel", "SQL", "Python", "Statistics", "Visualization"],
    applicants: 134,
    featured: false,
    tags: ["Fresher", "Data", "Analytics"],
    requirements: [
      "Bachelor's degree in relevant field",
      "Strong analytical skills",
      "Basic knowledge of statistics",
      "Eagerness to learn"
    ],
    benefits: [
      "Training and certification",
      "Global opportunities",
      "Mentorship program",
      "Competitive benefits"
    ],
    companyDescription: "Accenture is a global professional services company with leading capabilities in digital, cloud and security."
  },
  {
    id: "12",
    title: "AI/ML Engineer",
    company: "Cognizant",
    location: "Bengaluru (Remote option)",
    type: "full-time",
    category: "software",
    salary: "₹8-12 LPA",
    experience: "2-5 yrs exp",
    posted: "3 days ago",
    description: "Develop and deploy machine learning models and AI solutions. Work with cutting-edge technologies to solve complex business problems.",
    skills: ["Machine Learning", "Python", "TensorFlow", "PyTorch", "Data Science", "Deep Learning"],
    applicants: 78,
    featured: true,
    tags: ["AI/ML", "Remote Option", "Cutting-edge"],
    requirements: [
      "2-5 years ML/AI experience",
      "Strong programming skills",
      "Experience with ML frameworks",
      "Mathematical background"
    ],
    benefits: [
      "Premium salary package",
      "Remote work options",
      "Learning opportunities",
      "Innovation projects"
    ],
    companyDescription: "Cognizant is one of the world's leading professional services companies, transforming clients' business through AI and digital technologies."
  },
  {
    id: "13",
    title: "HR Executive (Fresher)",
    company: "HCL",
    location: "Hyderabad",
    type: "fresher",
    category: "software",
    salary: "₹2.5-3.5 LPA",
    experience: "Fresher",
    posted: "5 days ago",
    description: "Support HR operations including recruitment, employee engagement, and administrative tasks. Learn HR best practices in a technology environment.",
    skills: ["HR Operations", "Recruitment", "Communication", "MS Office", "Employee Relations", "Documentation"],
    applicants: 98,
    featured: false,
    tags: ["Fresher", "HR", "Entry-Level"],
    requirements: [
      "Bachelor's in HR or related field",
      "Strong communication skills",
      "Organizational abilities",
      "Fresh graduate welcome"
    ],
    benefits: [
      "Entry-level opportunity",
      "HR certification support",
      "Career development",
      "Employee benefits"
    ],
    companyDescription: "HCL Technologies is a leading global technology company that helps enterprises reimagine their businesses for the digital age."
  },
  {
    id: "14",
    title: "Customer Support Associate",
    company: "Amazon",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹2.8-3.6 LPA",
    experience: "Entry-Level",
    posted: "1 day ago",
    description: "Provide excellent customer service to Amazon customers through various channels. Resolve queries, process orders, and ensure customer satisfaction.",
    skills: ["Customer Service", "Communication", "Problem Solving", "Multitasking", "Computer Skills", "Patience"],
    applicants: 187,
    featured: true,
    tags: ["Entry-Level", "Customer Service", "Amazon"],
    requirements: [
      "Good communication skills",
      "Customer service orientation",
      "Basic computer knowledge",
      "Flexible with shifts"
    ],
    benefits: [
      "Amazon employee benefits",
      "Health insurance",
      "Performance bonuses",
      "Career growth opportunities"
    ],
    companyDescription: "Amazon is a global technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence."
  },
  {
    id: "15",
    title: "DevOps Engineer",
    company: "Capgemini",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹7-10 LPA",
    experience: "3-6 yrs exp",
    posted: "4 days ago",
    description: "Build and maintain CI/CD pipelines, automate deployment processes, and ensure system reliability. Work with cloud platforms and modern DevOps tools.",
    skills: ["DevOps", "Docker", "Kubernetes", "Jenkins", "AWS", "Linux"],
    applicants: 56,
    featured: false,
    tags: ["DevOps", "Cloud", "Automation"],
    requirements: [
      "3-6 years DevOps experience",
      "Container orchestration knowledge",
      "Cloud platform expertise",
      "Automation scripting skills"
    ],
    benefits: [
      "Competitive compensation",
      "Cloud certifications",
      "Technical training",
      "Global projects"
    ],
    companyDescription: "Capgemini is a global leader in partnering with companies to transform and manage their business by harnessing technology."
  },
  {
    id: "16",
    title: "Graphic Designer (Junior)",
    company: "Creative Labs",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹3-4 LPA",
    experience: "1-2 yrs exp",
    posted: "6 days ago",
    description: "Create visual content for digital and print media. Work on branding, marketing materials, and user interface designs for various clients.",
    skills: ["Graphic Design", "Adobe Creative Suite", "UI Design", "Branding", "Typography", "Creativity"],
    applicants: 89,
    featured: false,
    tags: ["Design", "Creative", "Junior"],
    requirements: [
      "1-2 years design experience",
      "Proficiency in design software",
      "Portfolio of work",
      "Creative mindset"
    ],
    benefits: [
      "Creative work environment",
      "Skill development",
      "Flexible hours",
      "Health benefits"
    ],
    companyDescription: "Creative Labs is a design agency specializing in branding, digital marketing, and user experience design."
  },
  {
    id: "17",
    title: "Project Manager (IT)",
    company: "Deloitte",
    location: "Hyderabad",
    type: "full-time",
    category: "software",
    salary: "₹12-18 LPA",
    experience: "6+ yrs exp",
    posted: "3 days ago",
    description: "Lead IT projects from conception to delivery. Manage cross-functional teams, ensure project timelines, and deliver quality solutions to clients.",
    skills: ["Project Management", "Agile", "Scrum", "Leadership", "Risk Management", "Stakeholder Management"],
    applicants: 34,
    featured: true,
    tags: ["Leadership", "Project Management", "Senior"],
    requirements: [
      "6+ years project management experience",
      "PMP certification preferred",
      "IT project experience",
      "Strong leadership skills"
    ],
    benefits: [
      "Executive compensation",
      "Leadership development",
      "Global opportunities",
      "Comprehensive benefits"
    ],
    companyDescription: "Deloitte is a leading global provider of audit and assurance, consulting, financial advisory, risk advisory, tax, and related services."
  }
];

export const getJobById = (id: string): Job | undefined => {
  return sampleJobs.find(job => job.id === id);
};

export const getJobsByCategory = (category: "software" | "education"): Job[] => {
  return sampleJobs.filter(job => job.category === category);
};

export const getFeaturedJobs = (): Job[] => {
  return sampleJobs.filter(job => job.featured);
};