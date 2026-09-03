// Phase 1 demo-data boundary. Replace feature by feature when APIs are enabled.
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

export const COURSES = [
  { id: 1, title: "Advanced Machine Learning Specialization", provider: "Coursera", providerLogo: "C", instructor: "Andrew Ng", duration: "12 weeks", rating: 4.9, enrolled: "234K", level: "Advanced", skills: ["Machine Learning", "Deep Learning", "TensorFlow"], price: "Free", accent: "#2563EB" },
  { id: 2, title: "Full Stack Development Bootcamp", provider: "Udemy", providerLogo: "U", instructor: "Colt Steele", duration: "8 weeks", rating: 4.7, enrolled: "189K", level: "Intermediate", skills: ["JavaScript", "React", "Node.js"], price: "$49", accent: "#8B5CF6" },
  { id: 3, title: "AWS Solutions Architect Professional", provider: "A Cloud Guru", providerLogo: "A", instructor: "Ryan Kroonenburg", duration: "6 weeks", rating: 4.8, enrolled: "156K", level: "Advanced", skills: ["AWS", "System Design", "DevOps"], price: "$35/mo", accent: "#F59E0B" },
  { id: 4, title: "Natural Language Processing with Transformers", provider: "Hugging Face", providerLogo: "🤗", instructor: "Sylvain Gugger", duration: "4 weeks", rating: 4.9, enrolled: "87K", level: "Advanced", skills: ["NLP", "PyTorch", "Deep Learning"], price: "Free", accent: "#10B981" },
  { id: 5, title: "Product Management Fundamentals", provider: "Reforge", providerLogo: "R", instructor: "Shreyas Doshi", duration: "6 weeks", rating: 4.6, enrolled: "45K", level: "Intermediate", skills: ["Product Management", "Analytics", "A/B Testing"], price: "$79/mo", accent: "#F43F5E" },
  { id: 6, title: "Cybersecurity Operations & Defense", provider: "SANS", providerLogo: "S", instructor: "Rob Lee", duration: "10 weeks", rating: 4.8, enrolled: "34K", level: "Advanced", skills: ["Network Security", "Incident Response", "SIEM"], price: "$129", accent: "#0EA5E9" },
  { id: 7, title: "Statistics for Data Science", provider: "edX", providerLogo: "E", instructor: "Rafael Irizarry", duration: "8 weeks", rating: 4.7, enrolled: "112K", level: "Beginner", skills: ["Statistics", "Python", "SQL"], price: "Free", accent: "#14B8A6" },
  { id: 8, title: "System Design Interview Mastery", provider: "Educative", providerLogo: "E", instructor: "Alex Xu", duration: "5 weeks", rating: 4.9, enrolled: "67K", level: "Advanced", skills: ["System Design", "DevOps", "AWS"], price: "$59", accent: "#6366F1" },
];

export const ASSESSMENTS = [
  { id: 1, skill: "Python", questions: 30, duration: "45 min", difficulty: "Intermediate", status: "completed", score: 87 },
  { id: 2, skill: "Machine Learning", questions: 25, duration: "40 min", difficulty: "Advanced", status: "completed", score: 72 },
  { id: 3, skill: "SQL", questions: 20, duration: "30 min", difficulty: "Intermediate", status: "available", score: null },
  { id: 4, skill: "System Design", questions: 15, duration: "60 min", difficulty: "Advanced", status: "available", score: null },
  { id: 5, skill: "React", questions: 25, duration: "35 min", difficulty: "Intermediate", status: "locked", score: null },
  { id: 6, skill: "AWS", questions: 30, duration: "50 min", difficulty: "Advanced", status: "locked", score: null },
];

export const EMPLOYEES = [
  { name: "Sarah Chen", role: "ML Engineer", avatar: "SC", skills: 12, assessments: 8, score: 89, trend: "+5", topSkills: ["Python", "ML", "TF"], color: "#2563EB" },
  { name: "Marcus Rivera", role: "Full Stack Dev", avatar: "MR", skills: 10, assessments: 6, score: 82, trend: "+3", topSkills: ["React", "Node", "TS"], color: "#8B5CF6" },
  { name: "Priya Patel", role: "Data Scientist", avatar: "PP", skills: 14, assessments: 10, score: 94, trend: "+8", topSkills: ["Python", "Stats", "NLP"], color: "#10B981" },
  { name: "James Wu", role: "DevOps Engineer", avatar: "JW", skills: 9, assessments: 5, score: 76, trend: "+2", topSkills: ["AWS", "Docker", "K8s"], color: "#F59E0B" },
  { name: "Elena Volkov", role: "Product Manager", avatar: "EV", skills: 8, assessments: 7, score: 88, trend: "+4", topSkills: ["PM", "Analytics", "Agile"], color: "#F43F5E" },
];
