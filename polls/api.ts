/**
 * Fluxer Polls - API Client and Router Handler
 */

import { CreatePollInput, Poll, PollResults, RankedChoiceBallot } from './types';
import { computeRankedChoiceResults } from './ranked-choice';

export class PollsApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async createPoll(input: CreatePollInput): Promise<Poll> {
    return this.request<Poll>('/api/v1/polls', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getPoll(pollId: string): Promise<Poll> {
    return this.request<Poll>(`/api/v1/polls/${pollId}`);
  }

  async vote(pollId: string, optionIds: string[]): Promise<PollResults> {
    return this.request<PollResults>(`/api/v1/polls/${pollId}/votes`, {
      method: 'POST',
      body: JSON.stringify({ optionIds }),
    });
  }

  async submitRankedChoice(pollId: string, rankedOptionIds: string[]): Promise<PollResults> {
    return this.request<PollResults>(`/api/v1/polls/${pollId}/ranked-votes`, {
      method: 'POST',
      body: JSON.stringify({ rankedOptionIds }),
    });
  }

  async addCustomOption(pollId: string, text: string, imageUrl?: string): Promise<Poll> {
    return this.request<Poll>(`/api/v1/polls/${pollId}/options`, {
      method: 'POST',
      body: JSON.stringify({ text, imageUrl }),
    });
  }

  async closePoll(pollId: string): Promise<Poll> {
    return this.request<Poll>(`/api/v1/polls/${pollId}/close`, {
      method: 'POST',
    });
  }

  async deletePoll(pollId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/v1/polls/${pollId}`, {
      method: 'DELETE',
    });
  }

  async getResults(pollId: string): Promise<PollResults> {
    return this.request<PollResults>(`/api/v1/polls/${pollId}/results`);
  }
}
