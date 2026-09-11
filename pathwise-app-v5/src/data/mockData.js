// Reference taxonomy data for the onboarding form (skill picker, target-role
// dropdown) - not a stand-in for a real API, so this stays even though the
// old demo-mode COURSES/ASSESSMENTS/EMPLOYEES fallbacks have been removed.
export const SKILL_CATEGORIES = {
  "Data & AI": ["Python", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Engineering", "SQL", "Statistics", "TensorFlow", "PyTorch"],
  "Software Engineering": ["JavaScript", "React", "Node.js", "TypeScript", "System Design", "DevOps", "AWS", "Docker", "Kubernetes", "GraphQL"],
  "Product & Design": ["Product Management", "UX Research", "UI Design", "Figma", "A/B Testing", "Analytics", "Agile", "Roadmapping"],
  "Business & Strategy": ["Financial Modeling", "Strategy", "Marketing", "Sales", "Operations", "Project Management", "Leadership", "Communication"],
  "Cybersecurity": ["Network Security", "Ethical Hacking", "Incident Response", "SIEM", "Cloud Security", "Compliance", "Risk Assessment"],
};

export const ROLES = [
  "Data Scientist", "ML Engineer", "Software Engineer", "Product Manager",
  "UX Designer", "DevOps Engineer", "CTO", "Engineering Manager",
  "AI Researcher", "Full Stack Developer", "Cybersecurity Analyst", "Data Engineer",
];
