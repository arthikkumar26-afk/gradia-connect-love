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
      { name: "Programming & Development", path: "https://skillory.in/courses/programming", count: 124 },
      { name: "Data Science & Analytics", path: "https://skillory.in/courses/data-science", count: 87 },
      { name: "AI & LLMs", path: "https://skillory.in/courses/ai-llm", count: 56 },
      { name: "Cloud & DevOps", path: "https://skillory.in/courses/cloud-devops", count: 64 },
      { name: "Cybersecurity & Networking", path: "https://skillory.in/courses/cybersecurity", count: 42 },
      { name: "Automation & Tools", path: "https://skillory.in/courses/automation", count: 38 },
    ],
  },
  {
    name: "Non-Tech Learning",
    icon: "📚",
    subcategories: [
      { name: "Business & Management", path: "https://skillory.in/courses/business-management", count: 92 },
      { name: "Communication & Leadership", path: "https://skillory.in/courses/communication", count: 76 },
      { name: "Design & Creativity", path: "https://skillory.in/courses/design", count: 65 },
      { name: "Finance & Entrepreneurship", path: "https://skillory.in/courses/finance", count: 54 },
      { name: "Marketing & Branding", path: "https://skillory.in/courses/marketing", count: 68 },
    ],
  },
  {
    name: "Education & Teaching",
    icon: "🎓",
    subcategories: [
      { name: "Teaching Methodologies", path: "https://skillory.in/courses/teaching-methods", count: 34 },
      { name: "Classroom Management", path: "https://skillory.in/courses/classroom-management", count: 28 },
      { name: "Educational Technology", path: "https://skillory.in/courses/edtech", count: 42 },
      { name: "Curriculum & Lesson Planning", path: "https://skillory.in/courses/curriculum-planning", count: 31 },
      { name: "Assessment & Evaluation", path: "https://skillory.in/courses/assessment", count: 25 },
      { name: "Inclusive & Special Education", path: "https://skillory.in/courses/special-education", count: 22 },
    ],
  },
  {
    name: "Languages & Communication",
    icon: "🌍",
    subcategories: [
      { name: "English Language Skills", path: "https://skillory.in/courses/english", count: 89 },
      { name: "Foreign Languages", path: "https://skillory.in/courses/foreign-languages", count: 156 },
      { name: "Business Communication", path: "https://skillory.in/courses/business-communication", count: 47 },
      { name: "Academic Writing", path: "https://skillory.in/courses/academic-writing", count: 38 },
      { name: "Translation & Interpretation", path: "https://skillory.in/courses/translation", count: 29 },
    ],
  },
];
