/**
 * github.ts — the two headline GitHub numbers, fetched live (cached for an hour):
 *   • total contributions, all time (every year since joining)
 *   • total repositories: owned (public + private) plus other repos he contributed to
 * Needs GITHUB_TOKEN = Yoosha's own read-only token. Because it's HIS token, GitHub counts his
 * private work too (like `count_private=true` on his README stats card).
 * Without a token we return nothing and the page hides the card: public-only numbers are too small.
 */
const LOGIN = 'YooshaMirza';
let cache: { at: number; data: GitHubStats | null } | undefined;

export type GitHubStats = {
  login: string;
  url: string;
  since: number;
  contributions: number;   // all time, incl. private
  repos: number;           // owned (public + private) + contributed to
  owned: number;
  contributedTo: number;
};

const gql = async (token: string, query: string) => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'yoosha-portfolio' },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(`GitHub GraphQL ${r.status} ${JSON.stringify(j.errors ?? j.message ?? '').slice(0, 300)}`);
  return j.data;
};

export async function githubStats(): Promise<GitHubStats | null> {
  if (cache && Date.now() - cache.at < 3_600_000) return cache.data;
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) { cache = { at: Date.now(), data: null }; return null; }

  // `viewer` = the token's owner, so private repos and private contributions are included
  const base = await gql(token, `{ viewer { login createdAt
    repositories(ownerAffiliations: OWNER) { totalCount }
    repositoriesContributedTo(includeUserRepositories: false, contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY, PULL_REQUEST_REVIEW, ISSUE]) { totalCount } } }`);
  const v = base.viewer;
  if (String(v.login).toLowerCase() !== LOGIN.toLowerCase()) throw new Error(`GITHUB_TOKEN belongs to ${v.login}, not ${LOGIN}`);
  const since = new Date(v.createdAt).getFullYear();
  const now = new Date();
  const years = Array.from({ length: now.getFullYear() - since + 1 }, (_, i) => since + i);
  const per = await gql(token, `{ viewer { ${years.map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y === now.getFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`}") { contributionCalendar { totalContributions } restrictedContributionsCount }`).join(' ')} } }`);
  // calendar totals include private work for the token owner; restricted counts cover any that are still hidden
  const contributions = years.reduce((a, y) => {
    const c = per.viewer[`y${y}`];
    return a + c.contributionCalendar.totalContributions;
  }, 0);
  const data: GitHubStats = {
    login: v.login,
    url: `https://github.com/${v.login}`,
    since,
    contributions,
    owned: v.repositories.totalCount,
    contributedTo: v.repositoriesContributedTo.totalCount,
    repos: v.repositories.totalCount + v.repositoriesContributedTo.totalCount,
  };
  cache = { at: Date.now(), data };
  return data;
}
