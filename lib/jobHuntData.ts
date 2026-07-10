import { fetchRepoFileSafe, getLatestDigest, type LatestDigest } from './githubRepo';
import { parseCsv } from './csv';

export interface EvaluatedJob {
  date_seen: string;
  company: string;
  title: string;
  url: string;
  score: string;
  status: string;
  reason: string;
  gap_flags: string;
  applied: string;
  application_date: string;
}

export interface NetworkingContact {
  contact: string;
  company: string;
  channel: string;
  message_sent: string;
  date: string;
  follow_up_due: string;
}

export interface FunnelSummary {
  seen: number;
  strong: number;
  applyWithHonesty: number;
  applied: number;
}

export async function getEvaluatedJobs(): Promise<EvaluatedJob[]> {
  const text = await fetchRepoFileSafe('data/evaluated_jobs.csv');
  if (!text) return [];
  return parseCsv(text) as unknown as EvaluatedJob[];
}

export async function getNetworkingContacts(): Promise<NetworkingContact[]> {
  const text = await fetchRepoFileSafe('data/networking.csv');
  if (!text) return [];
  return parseCsv(text) as unknown as NetworkingContact[];
}

export function computeFunnel(jobs: EvaluatedJob[]): FunnelSummary {
  return {
    seen: jobs.length,
    strong: jobs.filter((job) => job.status === 'strong').length,
    applyWithHonesty: jobs.filter((job) => job.status === 'apply_with_honesty').length,
    applied: jobs.filter((job) => job.applied?.trim().toLowerCase() === 'y').length,
  };
}

export function getOverdueFollowups(contacts: NetworkingContact[]): NetworkingContact[] {
  const today = new Date().toISOString().slice(0, 10);
  return contacts.filter((contact) => contact.follow_up_due && contact.follow_up_due <= today);
}

export { getLatestDigest };
export type { LatestDigest };
