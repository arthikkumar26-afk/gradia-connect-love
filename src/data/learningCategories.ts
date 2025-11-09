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
      { name: "Programming & Development", path: "/learning/tech", count: 124 },
      { name: "Data Science & Analytics", path: "/learning/tech", count: 87 },
      { name: "AI & LLMs", path: "/learning/tech", count: 56 },
      { name: "Cloud & DevOps", path: "/learning/tech", count: 64 },
      { name: "Cybersecurity & Networking", path: "/learning/tech", count: 42 },
      { name: "Automation & Tools", path: "/learning/tech", count: 38 },
    ],
  },
  {
    name: "Non-Tech Learning",
    icon: "📚",
    subcategories: [
      { name: "Business & Management", path: "/learning/non-tech", count: 92 },
      { name: "Communication & Leadership", path: "/learning/non-tech", count: 76 },
      { name: "Design & Creativity", path: "/learning/non-tech", count: 65 },
      { name: "Finance & Entrepreneurship", path: "/learning/non-tech", count: 54 },
      { name: "Marketing & Branding", path: "/learning/non-tech", count: 68 },
    ],
  },
  {
    name: "Education & Teaching",
    icon: "🎓",
    subcategories: [
      { name: "Teaching Methodologies", path: "/learning/education", count: 34 },
      { name: "Classroom Management", path: "/learning/education", count: 28 },
      { name: "Educational Technology", path: "/learning/education", count: 42 },
      { name: "Curriculum & Lesson Planning", path: "/learning/education", count: 31 },
      { name: "Assessment & Evaluation", path: "/learning/education", count: 25 },
      { name: "Inclusive & Special Education", path: "/learning/education", count: 22 },
    ],
  },
  {
    name: "Languages & Communication",
    icon: "🌍",
    subcategories: [
      { name: "English Language Skills", path: "/learning/languages", count: 89 },
      { name: "Foreign Languages", path: "/learning/languages", count: 156 },
      { name: "Business Communication", path: "/learning/languages", count: 47 },
      { name: "Academic Writing", path: "/learning/languages", count: 38 },
      { name: "Translation & Interpretation", path: "/learning/languages", count: 29 },
    ],
  },
];
