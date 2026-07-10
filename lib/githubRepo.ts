/**
 * Server-only client for reading files out of the private carson-job-hunt repo via GitHub's
 * Contents API. JOB_HUNT_GH_TOKEN must be a fine-grained PAT scoped to that repo with
 * Contents: Read-only access, set as a Vercel env var — never exposed to the client.
 */

const REPO_OWNER = 'CarsonCowan22';
const REPO_NAME = 'carson-job-hunt';

interface RepoContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

function requireToken(): string {
  const token = process.env.JOB_HUNT_GH_TOKEN;
  if (!token) {
    throw new Error('JOB_HUNT_GH_TOKEN is not set');
  }
  return token;
}

async function fetchRepoFile(path: string): Promise<string> {
  const token = requireToken();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GitHub API error fetching ${path}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function listRepoDir(path: string): Promise<RepoContentEntry[]> {
  const token = requireToken();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GitHub API error listing ${path}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** Returns null instead of throwing so a missing token or a transient API error degrades to an
 * empty section on the dashboard rather than a hard 500. */
export async function fetchRepoFileSafe(path: string): Promise<string | null> {
  try {
    return await fetchRepoFile(path);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export interface LatestDigest {
  date: string;
  content: string;
}

export async function getLatestDigest(): Promise<LatestDigest | null> {
  try {
    const entries = await listRepoDir('digests');
    const digestFiles = entries
      .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
      .sort((a, b) => b.name.localeCompare(a.name));

    const latest = digestFiles[0];
    if (!latest) return null;

    const content = await fetchRepoFile(`digests/${latest.name}`);
    return { date: latest.name.replace(/\.md$/, ''), content };
  } catch (error) {
    console.error(error);
    return null;
  }
}
