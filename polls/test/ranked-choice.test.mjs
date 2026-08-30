/**
 * Unit Tests for Instant-Runoff Voting (Ranked Choice) Algorithm
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Inline implementation for standalone Node test runner
function computeRankedChoiceResults(candidateOptionIds, ballots) {
  const activeCandidates = new Set(candidateOptionIds);
  const eliminatedInOrder = [];
  const rounds = [];

  if (activeCandidates.size === 0 || ballots.length === 0) {
    return { winnerId: null, rounds: [], eliminatedInOrder: [] };
  }

  const activeBallots = ballots.map((b) => ({
    userId: b.userId,
    choices: [...b.rankedOptionIds],
  }));

  let roundNum = 1;
  while (activeCandidates.size > 0) {
    const tallies = {};
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

    let roundWinner = null;
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

test('Ranked Choice: Candidate with immediate majority wins in Round 1', () => {
  const candidates = ['opt-a', 'opt-b', 'opt-c'];
  const ballots = [
    { userId: 'u1', rankedOptionIds: ['opt-a', 'opt-b'] },
    { userId: 'u2', rankedOptionIds: ['opt-a', 'opt-c'] },
    { userId: 'u3', rankedOptionIds: ['opt-a'] },
    { userId: 'u4', rankedOptionIds: ['opt-b', 'opt-a'] },
  ];

  const result = computeRankedChoiceResults(candidates, ballots);
  assert.equal(result.winnerId, 'opt-a');
  assert.equal(result.rounds.length, 1);
  assert.equal(result.rounds[0].isMajorityReached, true);
});

test('Ranked Choice: Elimination and redistribution to majority in Round 2', () => {
  const candidates = ['opt-a', 'opt-b', 'opt-c'];
  // Total 5 voters: majority is 3 votes
  // Round 1: opt-a: 2, opt-b: 2, opt-c: 1 (opt-c eliminated, vote transfers to opt-b)
  // Round 2: opt-b: 3 (wins majority)
  const ballots = [
    { userId: 'u1', rankedOptionIds: ['opt-a', 'opt-b'] },
    { userId: 'u2', rankedOptionIds: ['opt-a', 'opt-c'] },
    { userId: 'u3', rankedOptionIds: ['opt-b', 'opt-a'] },
    { userId: 'u4', rankedOptionIds: ['opt-b', 'opt-c'] },
    { userId: 'u5', rankedOptionIds: ['opt-c', 'opt-b', 'opt-a'] },
  ];

  const result = computeRankedChoiceResults(candidates, ballots);
  assert.equal(result.winnerId, 'opt-b');
  assert.equal(result.rounds.length, 2);
  assert.equal(result.rounds[0].eliminatedOptionId, 'opt-c');
  assert.equal(result.rounds[1].tallies['opt-b'], 3);
});

test('Ranked Choice: Handles exhausted ballots gracefully', () => {
  const candidates = ['opt-a', 'opt-b', 'opt-c'];
  const ballots = [
    { userId: 'u1', rankedOptionIds: ['opt-a'] },
    { userId: 'u2', rankedOptionIds: ['opt-a'] },
    { userId: 'u3', rankedOptionIds: ['opt-b'] },
    { userId: 'u4', rankedOptionIds: ['opt-c'] }, // no 2nd choice
  ];

  const result = computeRankedChoiceResults(candidates, ballots);
  assert.equal(result.winnerId, 'opt-a');
});
