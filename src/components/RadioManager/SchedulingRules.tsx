import { useState } from 'react';
import type { SchedulingRule } from '../../types/radio';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  rules: SchedulingRule[];
  onChange: (rules: SchedulingRule[]) => void;
}

export function SchedulingRules({ rules, onChange }: Props) {
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<SchedulingRule>>({
    type: 'maxPlays',
    value: 1,
    timeUnit: 'hour'
  });

  const handleAddRule = () => {
    const rule: SchedulingRule = {
      id: crypto.randomUUID(),
      type: newRule.type!,
      value: newRule.value!,
      timeUnit: newRule.timeUnit,
      startTime: newRule.startTime,
      endTime: newRule.endTime,
      daysOfWeek: newRule.daysOfWeek,
      genres: newRule.genres,
      minPercentage: newRule.minPercentage,
      maxPercentage: newRule.maxPercentage
    };

    onChange([...rules, rule]);
    setShowAddRule(false);
    setNewRule({
      type: 'maxPlays',
      value: 1,
      timeUnit: 'hour'
    });
  };

  const handleRemoveRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
  };

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <div key={rule.id} className="p-3 bg-primary-700 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-primary-50">
              {rule.type === 'maxPlays' && 'Maximum Plays'}
              {rule.type === 'artistSpacing' && 'Artist Spacing'}
              {rule.type === 'songSpacing' && 'Song Spacing'}
              {rule.type === 'genreMix' && 'Genre Mix'}
              {rule.type === 'daypart' && 'Daypart'}
            </h3>
            <button
              onClick={() => handleRemoveRule(rule.id)}
              className="text-primary-400 hover:text-status-error transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 text-sm text-primary-300">
            {rule.type === 'maxPlays' && (
              <p>Max {rule.value} plays per {rule.timeUnit}</p>
            )}
            {rule.type === 'artistSpacing' && (
              <p>Minimum {rule.value} minutes between same artist</p>
            )}
            {rule.type === 'genreMix' && (
              <p>{rule.genres?.join(', ')} - {rule.minPercentage}% to {rule.maxPercentage}%</p>
            )}
            {rule.type === 'daypart' && (
              <p>{rule.startTime} to {rule.endTime}{rule.daysOfWeek?.length ? ' on selected days' : ''}</p>
            )}
          </div>
        </div>
      ))}

      {showAddRule ? (
        <div className="p-4 bg-primary-700 rounded-lg">
          <select
            value={newRule.type}
            onChange={(e) => setNewRule({ ...newRule, type: e.target.value as SchedulingRule['type'] })}
            className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
          >
            <option value="maxPlays">Maximum Plays</option>
            <option value="artistSpacing">Artist Spacing</option>
            <option value="songSpacing">Song Spacing</option>
            <option value="genreMix">Genre Mix</option>
            <option value="daypart">Daypart</option>
          </select>

          {newRule.type === 'maxPlays' && (
            <>
              <input
                type="number"
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: parseInt(e.target.value) })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
                placeholder="Number of plays"
                min="1"
              />
              <select
                value={newRule.timeUnit}
                onChange={(e) => setNewRule({ ...newRule, timeUnit: e.target.value as 'hour' | 'day' })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
              >
                <option value="hour">Per Hour</option>
                <option value="day">Per Day</option>
              </select>
            </>
          )}

          {(newRule.type === 'artistSpacing' || newRule.type === 'songSpacing') && (
            <input
              type="number"
              value={newRule.value}
              onChange={(e) => setNewRule({ ...newRule, value: parseInt(e.target.value) })}
              className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
              placeholder="Minutes between plays"
              min="1"
            />
          )}

          {newRule.type === 'genreMix' && (
            <>
              <input
                type="number"
                value={newRule.minPercentage}
                onChange={(e) => setNewRule({ ...newRule, minPercentage: parseInt(e.target.value) })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
                placeholder="Minimum percentage"
                min="0"
                max="100"
              />
              <input
                type="number"
                value={newRule.maxPercentage}
                onChange={(e) => setNewRule({ ...newRule, maxPercentage: parseInt(e.target.value) })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
                placeholder="Maximum percentage"
                min="0"
                max="100"
              />
            </>
          )}

          {newRule.type === 'daypart' && (
            <>
              <input
                type="time"
                value={newRule.startTime}
                onChange={(e) => setNewRule({ ...newRule, startTime: e.target.value })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
              />
              <input
                type="time"
                value={newRule.endTime}
                onChange={(e) => setNewRule({ ...newRule, endTime: e.target.value })}
                className="w-full mb-3 bg-primary-800 border border-primary-600 rounded-lg p-2 text-primary-50"
              />
            </>
          )}

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddRule(false)}
              className="px-3 py-1 text-primary-400 hover:text-primary-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRule}
              className="px-3 py-1 bg-primary-600 text-primary-50 rounded hover:bg-primary-500"
            >
              Add Rule
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddRule(true)}
          className="flex items-center justify-center w-full p-2 border border-dashed border-primary-600 rounded-lg text-primary-400 hover:text-primary-300 hover:border-primary-500"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Rule
        </button>
      )}
    </div>
  );
}

export default SchedulingRules;
