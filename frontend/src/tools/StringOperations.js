import React, { useState, useEffect } from 'react';
import { Type, Copy, Scissors, ArrowUpDown, Hash, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * String Profiler Tool
 * Comprehensive string analysis and manipulation
 */
function StringOperations({ tab, tabs, setTabs }) {
  const [input, setInput] = useState('');
  const [splitDelimiter, setSplitDelimiter] = useState(',');
  const [sortOrder, setSortOrder] = useState('asc');
  const [results, setResults] = useState({
    stats: {},
    operations: {}
  });

  // Calculate string stats and operations
  useEffect(() => {
    if (!input) {
      setResults({ stats: {}, operations: {} });
      return;
    }

    // Character frequency map
    const charMap = {};
    for (const char of input) {
      charMap[char] = (charMap[char] || 0) + 1;
    }

    // Split string
    const splitResult = input.split(splitDelimiter);

    // Sort characters
    const sortedChars = sortOrder === 'asc' 
      ? input.split('').sort().join('')
      : input.split('').sort().reverse().join('');

    setResults({
      stats: {
        length: input.length,
        wordCount: input.trim() ? input.trim().split(/\s+/).length : 0,
        lineCount: input.split('\n').length,
        letterCount: (input.match(/[a-zA-Z]/g) || []).length,
        digitCount: (input.match(/\d/g) || []).length,
        spaceCount: (input.match(/\s/g) || []).length,
        specialCharCount: (input.match(/[^a-zA-Z0-9\s]/g) || []).length,
        uniqueChars: new Set(input).size,
      },
      operations: {
        split: splitResult,
        reverse: input.split('').reverse().join(''),
        sorted: sortedChars,
        charMap: charMap,
        uppercase: input.toUpperCase(),
        lowercase: input.toLowerCase(),
        titleCase: input.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
        removeSpaces: input.replace(/\s+/g, ''),
        removeDuplicates: [...new Set(input)].join(''),
        base64: btoa(unescape(encodeURIComponent(input))),
        urlEncoded: encodeURIComponent(input),
      }
    });
  }, [input, splitDelimiter, sortOrder]);

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const { stats, operations } = results;

  return (
    <div className="string-operations h-full flex flex-col" data-testid="string-operations">
      {/* Header */}
      <div className="border-b p-4 bg-[var(--bg-secondary)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Type className="w-5 h-5 text-[var(--accent-primary)]" />
          String Profiler
        </h2>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Stats and Input */}
        <div className="w-1/3 border-r border-[var(--border-primary)] flex flex-col overflow-auto">
          {/* Input */}
          <div className="p-4 border-b border-[var(--border-primary)]">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Input String</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to analyze..."
              className="w-full h-32 px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none font-mono text-sm resize-none"
            />
          </div>

          {/* Stats */}
          {stats && Object.keys(stats).length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Length:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Words:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.wordCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Lines:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.lineCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Letters:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.letterCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Digits:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.digitCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Spaces:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.spaceCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Special:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.specialCharCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Unique Chars:</span>
                  <span className="font-mono text-[var(--text-primary)]">{stats.uniqueChars}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Operations */}
        <div className="flex-1 overflow-auto p-4">
          {operations && Object.keys(operations).length > 0 ? (
            <div className="space-y-4">
              {/* Split String */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Split className="w-4 h-4" />
                    Split String
                  </h3>
                  <input
                    type="text"
                    value={splitDelimiter}
                    onChange={(e) => setSplitDelimiter(e.target.value)}
                    placeholder="Delimiter"
                    className="w-20 px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-1">
                  {operations.split?.map((part, i) => (
                    <div key={i} className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                      [{i}]: {part}
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Count Map */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Character Frequency
                </h3>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                  {operations.charMap && Object.entries(operations.charMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([char, count]) => (
                      <div key={char} className="flex justify-between text-sm bg-[var(--bg-tertiary)] px-2 py-1 rounded">
                        <span className="font-mono text-[var(--text-primary)]">
                          {char === ' ' ? '⎵' : char === '\n' ? '↵' : char}
                        </span>
                        <span className="font-semibold text-[var(--text-secondary)]">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Reverse */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Reverse String</h3>
                  <Button
                    onClick={() => copyToClipboard(operations.reverse, 'Reversed')}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded break-all">
                  {operations.reverse}
                </div>
              </div>

              {/* Sort */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Sort Characters
                  </h3>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                  >
                    <option value="asc">A-Z</option>
                    <option value="desc">Z-A</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded break-all flex-1">
                    {operations.sorted}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(operations.sorted, 'Sorted')}
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 ml-2"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Case Transformations */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Case Transformations</h3>
                <div className="space-y-2">
                  {[
                    { label: 'UPPERCASE', value: operations.uppercase },
                    { label: 'lowercase', value: operations.lowercase },
                    { label: 'Title Case', value: operations.titleCase },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
                        <div className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded truncate">
                          {value}
                        </div>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(value, label)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Operations */}
              <div className="border rounded-lg p-4 bg-[var(--bg-secondary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Other Operations</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Remove Spaces', value: operations.removeSpaces },
                    { label: 'Remove Duplicates', value: operations.removeDuplicates },
                    { label: 'Base64 Encode', value: operations.base64 },
                    { label: 'URL Encode', value: operations.urlEncoded },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">{label}</div>
                        <div className="text-sm font-mono text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2 py-1 rounded truncate">
                          {value}
                        </div>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(value, label)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">
              <div className="text-center">
                <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Enter text to see operations</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tool metadata
StringOperations.metadata = {
  id: 'string-operations',
  name: 'String Profiler',
  description: 'Comprehensive string analysis and manipulation tool',
  category: 'text-tools',
  requiresBackend: false,
};

export default StringOperations;
