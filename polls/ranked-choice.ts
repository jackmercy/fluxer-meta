/**
 * Instant-Runoff Voting (IRV) / Ranked Choice Voting Engine
 * Calculates round-by-round elimination and vote transfers.
 */

import { RankedChoiceBallot, RankedChoiceRoundResult } from './types';

export interface TallyOutcome {
  winnerId: string | null;
  rounds: RankedChoiceRoundResult[];
  eliminatedInOrder: string[];
}

export function computeRankedChoiceResults(
  candidateOptionIds: string[],
  ballots: RankedChoiceBallot[]
): TallyOutcome {
  const activeCandidates = new Set<string>(candidateOptionIds);
  const eliminatedInOrder: string[] = [];
  const rounds: RankedChoiceRoundResult[] = [];

  if (activeCandidates.size === 0 || ballots.length === 0) {
    return { winnerId: null, rounds: [], eliminatedInOrder: [] };
  }

  const activeBallots = ballots.map((b) => ({
    userId: b.userId,
    choices: [...b.rankedOptionIds],
  }));

  let roundNum = 1;
  while (activeCandidates.size > 0) {
    const tallies: Record<string, number> = {};
    for (const cand of activeCandidates) {
      tallies[cand] = 0;
    }

    let exhaustedVotes = 0;

    for (const ballot of activeBallots) {
      while (ballot.choices.length > 0 && !activeCandidates.has(ballot.choices[0])) {
        ballot.choices.shift();
      }

      if (ballot.choices.length > 0) {
        const topChoice = ballot.choices[0];
        tallies[topChoice] = (tallies[topChoice] || 0) + 1;
      } else {
        exhaustedVotes++;
      }
    }

    const totalActiveVotes = Object.values(tallies).reduce((a, b) => a + b, 0);
    const majorityThreshold = Math.floor(totalActiveVotes / 2) + 1;

    let roundWinner: string | null = null;
    for (const [cand, count] of Object.entries(tallies)) {
      if (count >= majorityThreshold && totalActiveVotes > 0) {
        roundWinner = cand;
        break;
      }
    }

    if (activeCandidates.size === 1) {
      roundWinner = Array.from(activeCandidates)[0];
    }

    if (roundWinner) {
      rounds.push({
        roundNumber: roundNum,
        tallies: { ...tallies },
        eliminatedOptionId: null,
        exhaustedVotes,
        winnerOptionId: roundWinner,
        isMajorityReached: true,
      });
      return { winnerId: roundWinner, rounds, eliminatedInOrder };
    }

    const minVotes = Math.min(...Object.values(tallies));
    const candidatesWithMinVotes = Object.keys(tallies).filter((k) => tallies[k] === minVotes);

    if (candidatesWithMinVotes.length === activeCandidates.size) {
      const tiedWinner = candidatesWithMinVotes[0];
      rounds.push({
        roundNumber: roundNum,
        tallies: { ...tallies },
        eliminatedOptionId: null,
        exhaustedVotes,
        winnerOptionId: tiedWinner,
        isMajorityReached: false,
      });
      return { winnerId: tiedWinner, rounds, eliminatedInOrder };
    }

    const toEliminate = candidatesWithMinVotes[0];
    activeCandidates.delete(toEliminate);
    eliminatedInOrder.push(toEliminate);

    rounds.push({
      roundNumber: roundNum,
      tallies: { ...tallies },
      eliminatedOptionId: toEliminate,
      exhaustedVotes,
      winnerOptionId: null,
      isMajorityReached: false,
    });

    roundNum++;
  }

  return { winnerId: null, rounds, eliminatedInOrder };
}
