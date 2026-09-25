export const routes = {
  login: "/login",
  signup: "/signup",
  companySignup: "/company/signup",
  verification: "/verify-email",
  company: "/company",
  challenge: "/student/challenges",
  catalog: "/student/catalog",
  leaderboard: "/student/leaderboard",
  practiced: "/student/practiced",
  invitations: "/student/invitations",
  profile: "/student/profile",
  instructions: "/student/instructions",
};

export function challengeRoute(challengeId) {
  return `${routes.challenge}/${challengeId}`;
}

export function pageFromPath(pathname) {
  if (pathname.startsWith(routes.companySignup)) return "company-signup";
  if (pathname.startsWith(routes.verification)) return "email-verification";
  if (pathname.startsWith(routes.signup)) return "signup";
  if (pathname.startsWith(routes.company)) return "company";
  if (pathname.startsWith(routes.catalog)) return "catalog";
  if (pathname.startsWith(routes.leaderboard)) return "leaderboard";
  if (pathname.startsWith(routes.practiced)) return "practiced";
  if (pathname.startsWith(routes.invitations)) return "invitations";
  if (pathname.startsWith(routes.profile)) return "profile";
  if (pathname.startsWith(routes.instructions)) return "instructions";
  if (pathname.startsWith(routes.challenge)) return "challenge";
if (pathname.startsWith(routes.login)) return "login";
  return "home";
}

export function challengeIdFromPath(pathname) {
  const prefix = `${routes.challenge}/`;
  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) || null : null;
}
