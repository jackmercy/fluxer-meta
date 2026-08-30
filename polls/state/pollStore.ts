/**
 * Fluxer Polls - Reactive State Management Store
 */

import { Poll, PollResults, RankedChoiceBallot } from '../types';
import { computeRankedChoiceResults } from '../ranked-choice';

export interface PollState {
  polls: Record<string, Poll>;
  results: Record<string, PollResults>;
  userSelections: Record<string, string[]>; // pollId -> selected option IDs
  rankedSelections: Record<string, string[]>; // pollId -> ranked option IDs in order
  activeCarouselIndex: Record<string, number>;
  activeResultRound: Record<string, number>;
}

export class PollStore {
  private state: PollState = {
    polls: {},
    results: {},
    userSelections: {},
    rankedSelections: {},
    activeCarouselIndex: {},
    activeResultRound: {},
  };

  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  setPoll(poll: Poll) {
    this.state.polls[poll.id] = poll;
    if (poll.userVotes) {
      this.state.userSelections[poll.id] = [...poll.userVotes];
    }
    if (poll.userRankedBallot) {
      this.state.rankedSelections[poll.id] = [...poll.userRankedBallot];
    }
    this.notify();
  }

  toggleSelection(pollId: string, optionId: string) {
    const poll = this.state.polls[pollId];
    if (!poll || poll.status !== 'active') return;

    if (poll.pollType === 'single_choice') {
      const current = this.state.userSelections[pollId] || [];
      if (current.includes(optionId)) {
        this.state.userSelections[pollId] = [];
      } else {
        this.state.userSelections[pollId] = [optionId];
      }
    } else if (poll.pollType === 'multiple_choice') {
      const current = new Set(this.state.userSelections[pollId] || []);
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
      this.state.userSelections[pollId] = Array.from(current);
    }
    this.notify();
  }

  toggleRankedChoice(pollId: string, optionId: string) {
    const poll = this.state.polls[pollId];
    if (!poll || poll.status !== 'active') return;

    const current = [...(this.state.rankedSelections[pollId] || [])];
    const index = current.indexOf(optionId);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      const maxChoices = poll.maxRankedChoices || 5;
      if (current.length < maxChoices) {
        current.push(optionId);
      }
    }
    this.state.rankedSelections[pollId] = current;
    this.notify();
  }

  setCarouselIndex(pollId: string, index: number) {
    this.state.activeCarouselIndex[pollId] = index;
    this.notify();
  }

  setResultRound(pollId: string, round: number) {
    this.state.activeResultRound[pollId] = round;
    this.notify();
  }

  getState(): PollState {
    return this.state;
  }
}
