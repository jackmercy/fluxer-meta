/**
 * Fluxer Polls - PollCreateModal Component
 */

import React, { useState } from 'react';
import { CreatePollInput, PollType } from '../types';

export interface PollCreateModalProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreatePollInput) => void;
}

export const PollCreateModal: React.FC<PollCreateModalProps> = ({
  channelId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<PollType>('single_choice');
  const [durationHours, setDurationHours] = useState(24);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowCustom, setAllowCustom] = useState(false);
  const [options, setOptions] = useState<Array<{ text: string; imageUrl?: string }>>([
    { text: '' },
    { text: '' },
  ]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, { text: '' }]);
    }
  };

  const handleOptionChange = (idx: number, text: string) => {
    const next = [...options];
    next[idx].text = text;
    setOptions(next);
  };

  const handleCreate = () => {
    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    onSubmit({
      channelId,
      question: question.trim(),
      pollType,
      options: validOptions,
      durationMinutes: durationHours * 60,
      isAnonymous,
      allowCustomResponses: allowCustom,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background-secondary border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Create a Poll</h2>

        {/* Question */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full p-2.5 rounded-lg bg-background-tertiary border border-border text-sm"
          />
        </div>

        {/* Poll Type */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Voting Mode
          </label>
          <select
            value={pollType}
            onChange={(e) => setPollType(e.target.value as PollType)}
            className="w-full p-2.5 rounded-lg bg-background-tertiary border border-border text-sm"
          >
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="ranked_choice">Ranked Choice (Instant-Runoff Voting)</option>
          </select>
        </div>

        {/* Options */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase text-muted mb-1">
            Options
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {options.map((opt, i) => (
              <input
                key={i}
                type="text"
                value={opt.text}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="w-full p-2 rounded-lg bg-background-tertiary border border-border text-sm"
              />
            ))}
          </div>
          {options.length < 10 && (
            <button
              onClick={handleAddOption}
              className="text-xs text-primary font-semibold mt-2 hover:underline"
            >
              + Add Option
            </button>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-2 mb-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <span>Anonymous Voting</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCustom}
              onChange={(e) => setAllowCustom(e.target.checked)}
              className="rounded"
            />
            <span>Allow Custom Community Answers</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-background-tertiary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Create Poll
          </button>
        </div>
      </div>
    </div>
  );
};
