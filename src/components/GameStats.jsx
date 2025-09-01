/**
 * Game Statistics Components
 * Displays production stats, results, and analysis
 */

import { memo } from 'react';

export const QuickStats = memo(function QuickStats({ production }) {
  const total = Object.values(production).reduce((a, b) => a + b, 0);
  const resourceEntries = ["wood", "brick", "sheep", "wheat", "ore"].map(resource => [
    resource, 
    production[resource] || 0
  ]);
  
  // Calculate resource diversity using entropy
  const entropy = total > 0 ? -resourceEntries.reduce((sum, [, value]) => {
    if (value > 0) {
      const probability = value / total;
      return sum + probability * Math.log2(probability);
    }
    return sum;
  }, 0) : 0;

  return (
    <div className="text-xs text-slate-700">
      <div className="grid grid-cols-5 gap-2 mb-1">
        {resourceEntries.map(([resource, value]) => (
          <div key={resource} className="flex flex-col items-center">
            <div className="font-mono">{value.toFixed(3)}</div>
            <div className="uppercase tracking-wide text-[10px] text-slate-500">
              {resource}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">
        Diversity: {entropy.toFixed(2)} • Total: {total.toFixed(3)}
      </div>
    </div>
  );
});

export function ResultsCard({ results, players }) {
  if (!results || !results.probs) {
    return (
      <div className="mt-3 border rounded p-3 text-sm text-red-600">
        Invalid results data
      </div>
    );
  }

  const { probs, ci, runs } = results;
  
  return (
    <div className="mt-3 border rounded p-3 text-sm">
      <div className="mb-2 text-slate-600">
        Simulations: {runs.toLocaleString()}
      </div>
      
      {players.map((player, index) => (
        <div key={player.id} className="flex items-center gap-2 mb-1">
          <span 
            className="inline-block w-3 h-3 rounded-full" 
            style={{ backgroundColor: player.color }} 
          />
          <div className="w-28">Player {index + 1}</div>
          <div className="font-mono w-20">
            {(probs[index] * 100).toFixed(1)}%
          </div>
          {ci && ci[index] && (
            <div className="text-xs text-slate-500">
              CI95: {(ci[index][0] * 100).toFixed(1)}% – {(ci[index][1] * 100).toFixed(1)}%
            </div>
          )}
        </div>
      ))}
      
      {/* Additional statistics */}
      <div className="mt-2 pt-2 border-t text-xs text-slate-500">
        <div>Winner spread: {((Math.max(...probs) - Math.min(...probs)) * 100).toFixed(1)}%</div>
        <div>Most balanced: {probs.every(p => Math.abs(p - 0.25) < 0.1) ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}

export function BoardValidationStatus({ tiles }) {
  const resourceCounts = tiles.reduce((acc, tile) => {
    acc[tile.resource] = (acc[tile.resource] || 0) + 1;
    return acc;
  }, {});

  const expectedCounts = { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3, desert: 1 };
  const isValid = Object.entries(expectedCounts).every(([resource, expected]) => 
    resourceCounts[resource] === expected
  );

  return (
    <div className={`p-2 rounded text-xs ${isValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {isValid ? '✅ Valid Catan board' : '❌ Invalid board configuration'}
      {!isValid && (
        <div className="mt-1">
          {Object.entries(expectedCounts).map(([resource, expected]) => {
            const actual = resourceCounts[resource] || 0;
            if (actual !== expected) {
              return (
                <div key={resource}>
                  {resource}: {actual}/{expected}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}