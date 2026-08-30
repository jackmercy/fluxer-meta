/**
 * Fluxer Polls - PollCard UI Component (Desktop & Mobile Responsive)
 */

import React, { useState } from 'react';
import { Poll, PollOption } from '../types';

export interface PollCardProps {
  poll: Poll;
  currentUserId: string;
  onVote: (optionIds: string[]) => void;
  onRankedVote: (rankedOptionIds: string[]) => void;
  onClosePoll?: (pollId: string) => void;
  canManagePoll?: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  currentUserId,
  onVote,
  onRankedVote,
  onClosePoll,
  canManagePoll = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(poll.userVotes || []);
  const [rankedChoices, setRankedChoices] = useState<string[]>(poll.userRankedBallot || []);
  const [showResults, setShowResults] = useState(Boolean(poll.hasVoted || poll.status === 'closed'));
  const [carouselIndex, setCarouselIndex] = useState(0);

  const isClosed = poll.status === 'closed';
  const isRanked = poll.pollType === 'ranked_choice';

  const handleOptionClick = (optionId: string) => {
    if (isClosed) return;

    if (isRanked) {
      const current = [...rankedChoices];
      const idx = current.indexOf(optionId);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else if (current.length < (poll.maxRankedChoices || 5)) {
        current.push(optionId);
      }
      setRankedChoices(current);
    } else if (poll.pollType === 'single_choice') {
      setSelectedIds(selectedIds.includes(optionId) ? [] : [optionId]);
    } else {
      setSelectedIds(
        selectedIds.includes(optionId)
          ? selectedIds.filter((id) => id !== optionId)
          : [...selectedIds, optionId]
      );
    }
  };

  const handleSubmit = () => {
    if (isRanked) {
      if (rankedChoices.length > 0) {
        onRankedVote(rankedChoices);
        setShowResults(true);
      }
    } else {
      if (selectedIds.length > 0) {
        onVote(selectedIds);
        setShowResults(true);
      }
    }
  };

  return (
    <div className="fluxer-poll-card border border-primary/20 rounded-xl p-4 bg-background-secondary max-w-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {poll.creatorAvatarUrl && (
            <img
              src={poll.creatorAvatarUrl}
              alt={poll.creatorUsername}
              className="w-7 h-7 rounded-full"
            />
          )}
          <div>
            <span className="font-semibold text-sm">{poll.creatorUsername}</span>
            <span className="text-xs text-muted ml-2">
              {isRanked ? 'Ranked Choice Poll' : 'Poll'}
              {poll.isAnonymous && ' • Anonymous'}
            </span>
          </div>
        </div>

        {canManagePoll && !isClosed && onClosePoll && (
          <button
            onClick={() => onClosePoll(poll.id)}
            className="text-xs text-danger hover:underline"
          >
            End Poll
          </button>
        )}
      </div>

      {/* Question */}
      <h3 className="font-bold text-base mb-4 text-foreground">{poll.question}</h3>

      {/* Options List */}
      <div className="space-y-2 mb-4">
        {poll.options.map((opt: PollOption, idx: number) => {
          const isSelected = selectedIds.includes(opt.id);
          const rankIndex = rankedChoices.indexOf(opt.id);
          const percentage = poll.totalVoters > 0 ? Math.round((opt.voteCount / poll.totalVoters) * 100) : 0;

          return (
            <div
              key={opt.id}
              onClick={() => handleOptionClick(opt.id)}
              className={`relative overflow-hidden cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected || rankIndex >= 0
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-background-tertiary'
              }`}
            >
              {/* Progress fill bar if results visible */}
              {showResults && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-primary/20 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {isRanked && (
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        rankIndex >= 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-border text-muted'
                      }`}
                    >
                      {rankIndex >= 0 ? rankIndex + 1 : idx + 1}
                    </span>
                  )}
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={opt.text}
                      className="w-10 h-10 object-cover rounded-md"
                    />
                  )}
                  <span className="text-sm font-medium">{opt.text}</span>
                </div>

                {showResults && (
                  <span className="text-xs font-bold text-muted ml-2">
                    {opt.voteCount} ({percentage}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border">
        <span>{poll.totalVoters} {poll.totalVoters === 1 ? 'vote' : 'votes'} • {isClosed ? 'Closed' : 'Active'}</span>

        {!isClosed && (
          <div className="flex gap-2">
            {!showResults && (
              <button
                onClick={handleSubmit}
                disabled={isRanked ? rankedChoices.length === 0 : selectedIds.length === 0}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
              >
                Submit Vote
              </button>
            )}
            <button
              onClick={() => setShowResults(!showResults)}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-background-tertiary"
            >
              {showResults ? 'Hide Results' : 'View Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
