/**
 * Fluxer Polls - Type Definitions
 * Supports Simple Polls, Multiple Choice, and Ranked Choice Voting (Instant-Runoff Voting).
 */

export type PollType = 'single_choice' | 'multiple_choice' | 'ranked_choice';

export type PollStatus = 'active' | 'closed' | 'deleted';

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  orderIndex: number;
  creatorId: string; // tracked for moderation even if poll is anonymous
  isCustom: boolean;
  voteCount: number;
}

export interface PollVote {
  pollId: string;
  optionId: string;
  userId: string;
  rank?: number | null; // 1-based rank for ranked_choice
  votedAt: string; // ISO 8601
}

export interface RankedChoiceBallot {
  userId: string;
  rankedOptionIds: string[]; // [1st choice optionId, 2nd choice optionId, ...]
  submittedAt: string;
}

export interface RankedChoiceRoundResult {
  roundNumber: number;
  tallies: Record<string, number>; // optionId -> vote count
  eliminatedOptionId?: string | null;
  transferredVotes?: number;
  exhaustedVotes: number;
  winnerOptionId?: string | null;
  isMajorityReached: boolean;
}

export interface PollResults {
  pollId: string;
  totalVoters: number;
  totalVotesCast: number;
  isClosed: boolean;
  options: Array<{
    option: PollOption;
    voteCount: number;
    percentage: number;
    voters?: Array<{
      userId: string;
      username: string;
      avatarUrl?: string | null;
    }>; // omitted if isAnonymous && !isModerator
  }>;
  rankedChoiceRounds?: RankedChoiceRoundResult[];
  winningOptionId?: string | null;
}

export interface Poll {
  id: string;
  messageId: string;
  channelId: string;
  communityId?: string | null;
  creatorId: string;
  creatorUsername: string;
  creatorAvatarUrl?: string | null;
  question: string;
  pollType: PollType;
  isAnonymous: boolean;
  allowCustomResponses: boolean;
  maxCustomResponses?: number;
  maxRankedChoices?: number;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
  expiresAt: string;
  closedAt?: string | null;
  closedBy?: string | null;
  totalVoters: number;
  hasVoted?: boolean;
  userVotes?: string[]; // optionIds user voted for
  userRankedBallot?: string[]; // optionIds in rank order
}

export interface PollAuditLogEntry {
  id: string;
  pollId: string;
  channelId: string;
  communityId?: string | null;
  action: 'create_poll' | 'add_custom_option' | 'vote' | 'retract_vote' | 'close_poll' | 'delete_poll';
  actorId: string;
  actorUsername: string;
  targetOptionId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface CreatePollInput {
  channelId: string;
  question: string;
  pollType: PollType;
  options: Array<{
    text: string;
    imageUrl?: string;
  }>;
  durationMinutes: number; // e.g. 60, 1440, 10080 (7d)
  isAnonymous?: boolean;
  allowCustomResponses?: boolean;
  maxCustomResponses?: number;
  maxRankedChoices?: number;
}
