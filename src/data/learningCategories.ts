/**
 * Learning Categories Data
 * 
 * This file contains the learning categories structure for the Resources/Learning dropdown.
 * To update course counts or add new categories, modify the data structures below.
 * To add icons, update the icon field with lucide-react icon names or emoji.
 * To change link targets, update the path field for each category/subcategory.
 */

export interface LearningSubcategory {
  name: string;
  path: string;
  count: number;
}

export interface LearningCategory {
  name: string;
  icon: string;
  subcategories: LearningSubcategory[];
}

export const learningCategories: LearningCategory[] = [
  {
    name: "Tech Learning",
    icon: "💻",
    subcategories: [
      { name: "Programming & Development", path: "https://skillory.life/courses/programming", count: 124 },
      { name: "Data Science & Analytics", path: "https://skillory.life/courses/data-science", count: 87 },
      { name: "AI & LLMs", path: "https://skillory.life/courses/ai-llm", count: 56 },
      { name: "Cloud & DevOps", path: "https://skillory.life/courses/cloud-devops", count: 64 },
      { name: "Cybersecurity & Networking", path: "https://skillory.life/courses/cybersecurity", count: 42 },
      { name: "Automation & Tools", path: "https://skillory.life/courses/automation", count: 38 },
    ],
  },
  {
    name: "Non-Tech Learning",
    icon: "📚",
    subcategories: [
      { name: "Business & Management", path: "https://skillory.life/courses/business-management", count: 92 },
      { name: "Communication & Leadership", path: "https://skillory.life/courses/communication", count: 76 },
      { name: "Design & Creativity", path: "https://skillory.life/courses/design", count: 65 },
      { name: "Finance & Entrepreneurship", path: "https://skillory.life/courses/finance", count: 54 },
      { name: "Marketing & Branding", path: "https://skillory.life/courses/marketing", count: 68 },
    ],
  },
  {
    name: "Education & Teaching",
    icon: "🎓",
    subcategories: [
      { name: "Teaching Methodologies", path: "https://skillory.life/courses/teaching-methods", count: 34 },
      { name: "Classroom Management", path: "https://skillory.life/courses/classroom-management", count: 28 },
      { name: "Educational Technology", path: "https://skillory.life/courses/edtech", count: 42 },
      { name: "Curriculum & Lesson Planning", path: "https://skillory.life/courses/curriculum-planning", count: 31 },
      { name: "Assessment & Evaluation", path: "https://skillory.life/courses/assessment", count: 25 },
      { name: "Inclusive & Special Education", path: "https://skillory.life/courses/special-education", count: 22 },
    ],
  },
  {
    name: "Languages & Communication",
    icon: "🌍",
    subcategories: [
      { name: "English Language Skills", path: "https://skillory.life/courses/english", count: 89 },
      { name: "Foreign Languages", path: "https://skillory.life/courses/foreign-languages", count: 156 },
      { name: "Business Communication", path: "https://skillory.life/courses/business-communication", count: 47 },
      { name: "Academic Writing", path: "https://skillory.life/courses/academic-writing", count: 38 },
      { name: "Translation & Interpretation", path: "https://skillory.life/courses/translation", count: 29 },
    ],
  },
];
