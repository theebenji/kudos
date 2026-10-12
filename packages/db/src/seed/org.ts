// Static shape of the demo organization. Names and dates are generated; structure is fixed.

export const VALUES = [
  { name: "Teamwork", emoji: "🤝", description: "Made the team stronger together." },
  {
    name: "Customer Obsession",
    emoji: "💙",
    description: "Started with the customer and worked backwards.",
  },
  { name: "Ownership", emoji: "🧭", description: "Took responsibility end to end." },
  { name: "Bias for Action", emoji: "⚡", description: "Moved fast and unblocked others." },
  { name: "Learn & Grow", emoji: "🌱", description: "Shared knowledge or levelled someone up." },
  { name: "Above & Beyond", emoji: "🚀", description: "Went well past what was expected." },
] as const;

/** Archived value: old kudos keep it, new kudos can't use it. */
export const ARCHIVED_VALUE = {
  name: "Hustle",
  emoji: "🏃",
  description: "Retired value from an earlier culture deck.",
};

export const DEPARTMENTS = [
  {
    department: "Engineering",
    teams: ["Platform", "Web", "Mobile"],
    titles: ["Software Engineer", "Senior Software Engineer", "Staff Engineer"],
  },
  {
    department: "Product",
    teams: ["Discovery", "Growth"],
    titles: ["Product Manager", "Senior Product Manager"],
  },
  {
    department: "Design",
    teams: ["Product Design", "Brand"],
    titles: ["Product Designer", "Senior Designer"],
  },
  {
    department: "Customer Success",
    teams: ["Support", "Onboarding"],
    titles: ["Support Specialist", "Customer Success Manager"],
  },
  {
    department: "Sales",
    teams: ["Mid-Market", "Enterprise"],
    titles: ["Account Executive", "Sales Engineer"],
  },
  { department: "People", teams: ["People Ops"], titles: ["People Partner", "Recruiter"] },
] as const;

/** Fixed accounts so the dev sign-in picker always has a known admin and member at the top. */
export const FIXED_USERS = [
  {
    name: "Avery Admin",
    email: "admin@example.com",
    title: "Head of People",
    department: "People",
    team: "People Ops",
    role: "admin" as const,
  },
  {
    name: "Morgan Member",
    email: "member@example.com",
    title: "Software Engineer",
    department: "Engineering",
    team: "Web",
    role: "member" as const,
  },
];

export const REACTION_EMOJI = ["👏", "❤️", "🎉", "🙌", "🔥", "😂", "💯", "🚀", "🙏", "✨"];

export const KUDO_OPENERS = [
  "Huge thanks to",
  "Shout-out to",
  "So grateful for",
  "Big kudos to",
  "Can't say enough about",
  "Thank you",
];

export const KUDO_REASONS = [
  "for jumping on the incident at 2am and getting us back up in record time",
  "for the incredibly clear onboarding doc — it saved the new hires days",
  "for pairing with me all week until the migration finally clicked",
  "for running such a thoughtful customer interview series",
  "for shipping the redesign ahead of schedule without cutting corners",
  "for patiently answering every question in the support channel",
  "for turning a messy spreadsheet into a dashboard everyone actually uses",
  "for the brilliant demo at all-hands",
  "for mentoring the interns with so much care",
  "for catching that edge case in review before it hit production",
  "for organizing the team offsite — it was perfect",
  "for closing the quarter strong and helping the whole team get there",
  "for rewriting the flaky test suite so CI is green again",
  "for championing accessibility in every design review",
];

export const KUDO_EMOJI = ["🎉", "🚀", "❤️", "⭐", "🙌"];

export const COMMENTS = [
  "Couldn't agree more!",
  "This is so well deserved 👏",
  "Seconding this — absolute legend.",
  "Thank you all, this made my week ❤️",
  "Yes!! 🙌",
  "Saw this first-hand, truly impressive.",
  "Team effort, but thank you!",
  "100% 💯",
];
