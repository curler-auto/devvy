import React, { useState, useEffect } from 'react';
import { Search, Copy, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Regex Tester Tool
 * Test and debug regular expressions
 */
function RegexTester({ tab, tabs, setTabs }) {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false, u: false, y: false });
  const [testString, setTestString] = useState('');
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false);

  // Test regex
  useEffect(() => {
    if (!pattern || !testString) {
      setMatches([]);
      setError(null);
      setIsValid(false);
      return;
    }

    try {
      const flagString = Object.entries(flags)
        .filter(([_, enabled]) => enabled)
        .map(([flag]) => flag)
        .join('');
      
      const regex = new RegExp(pattern, flagString);
      setIsValid(true);
      setError(null);

      // Find all matches
      const allMatches = [];
      let match;
      
      if (flags.g) {
        // Global flag - find all matches
        const globalRegex = new RegExp(pattern, flagString);
        while ((match = globalRegex.exec(testString)) !== null) {
          allMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
            input: match.input,
          });
          
          // Prevent infinite loop
          if (match.index === globalRegex.lastIndex) {
            globalRegex.lastIndex++;
          }
        }
      } else {
        // No global flag - find first match only
        match = regex.exec(testString);
        if (match) {
          allMatches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1),
            input: match.input,
          });
        }
      }

      setMatches(allMatches);
    } catch (err) {
      setError(err.message);
      setIsValid(false);
      setMatches([]);
    }
  }, [pattern, flags, testString]);

  // Toggle flag
  const toggleFlag = (flag) => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Highlight matches in text
  const highlightMatches = () => {
    if (!testString || matches.length === 0) {
      return testString;
    }

    const parts = [];
    let lastIndex = 0;

    matches.forEach((match, i) => {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>
            {testString.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add highlighted match
      parts.push(
        <span
          key={`match-${i}`}
          className="bg-yellow-300 text-black font-semibold"
          title={`Match ${i + 1}`}
        >
          {match.match}
        </span>
      );

      lastIndex = match.index + match.match.length;
    });

    // Add remaining text
    if (lastIndex < testString.length) {
      parts.push(
        <span key="text-end">
          {testString.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const flagOptions = [
    { key: 'g', label: 'Global', description: 'Find all matches' },
    { key: 'i', label: 'Case Insensitive', description: 'Ignore case' },
    { key: 'm', label: 'Multiline', description: '^$ match line breaks' },
    { key: 's', label: 'Dot All', description: '. matches newlines' },
    { key: 'u', label: 'Unicode', description: 'Unicode support' },
    { key: 'y', label: 'Sticky', description: 'Match from lastIndex' },
  ];

  const commonPatterns = [
    { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
    { label: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)' },
    { label: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}' },
    { label: 'IP Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
    { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}' },
    { label: 'Hex Color', pattern: '#[0-9A-Fa-f]{6}\\b' },
  ];

  return (
    <div className="regex-tester p-6" data-testid="regex-tester">
      <div className="space-y-6">
        {/* Pattern Input */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-[var(--accent-primary)]" />
            Regular Expression Pattern
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Enter regex pattern (e.g., \d{3}-\d{3}-\d{4})"
                  className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono"
                />
                {isValid && pattern && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-500">{error}</div>
                </div>
              )}
            </div>

            {/* Flags */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Flags
              </label>
              <div className="flex flex-wrap gap-2">
                {flagOptions.map(({ key, label, description }) => (
                  <button
                    key={key}
                    onClick={() => toggleFlag(key)}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                      flags[key]
                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                    title={description}
                  >
                    <span className="font-mono font-bold">{key}</span> - {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Common Patterns */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Common Patterns
              </label>
              <div className="flex flex-wrap gap-2">
                {commonPatterns.map(({ label, pattern: p }) => (
                  <button
                    key={label}
                    onClick={() => setPattern(p)}
                    className="px-3 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Test String */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Test String
          </h2>
          
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter text to test against the regex pattern..."
            className="w-full h-32 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm resize-none"
          />
        </div>

        {/* Results */}
        {pattern && testString && (
          <>
            {/* Match Summary */}
            <div className={`border-2 rounded-lg p-4 ${
              matches.length > 0
                ? 'bg-green-500/10 border-green-500'
                : 'bg-gray-500/10 border-gray-500'
            }`}>
              <div className="flex items-center gap-2">
                {matches.length > 0 ? (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-semibold text-green-500">
                        {matches.length} Match{matches.length !== 1 ? 'es' : ''} Found
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-semibold text-gray-500">No Matches Found</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Highlighted Text */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                Highlighted Matches
              </h2>
              
              <div className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
                {highlightMatches()}
              </div>
            </div>

            {/* Match Details */}
            {matches.length > 0 && (
              <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                  Match Details
                </h2>
                
                <div className="space-y-3">
                  {matches.map((match, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-[var(--bg-tertiary)]">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="font-semibold text-[var(--text-primary)]">
                          Match {index + 1}
                        </div>
                        <Button
                          onClick={() => copyToClipboard(match.match, `Match ${index + 1}`)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="text-[var(--text-secondary)]">Text:</span>{' '}
                          <span className="font-mono text-[var(--accent-primary)]">{match.match}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)]">Position:</span>{' '}
                          <span className="font-mono text-[var(--text-primary)]">{match.index}</span>
                        </div>
                        {match.groups.length > 0 && (
                          <div>
                            <span className="text-[var(--text-secondary)]">Groups:</span>{' '}
                            <span className="font-mono text-[var(--text-primary)]">
                              {match.groups.map((g, i) => `[${i + 1}]: ${g || 'undefined'}`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Regex Reference */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">Quick Reference</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-semibold text-[var(--text-primary)] mb-1">Character Classes</div>
              <ul className="space-y-0.5 font-mono text-xs">
                <li><code>\d</code> - Digit (0-9)</li>
                <li><code>\w</code> - Word character</li>
                <li><code>\s</code> - Whitespace</li>
                <li><code>.</code> - Any character</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[var(--text-primary)] mb-1">Quantifiers</div>
              <ul className="space-y-0.5 font-mono text-xs">
                <li><code>*</code> - 0 or more</li>
                <li><code>+</code> - 1 or more</li>
                <li><code>?</code> - 0 or 1</li>
                <li><code>{'{n,m}'}</code> - Between n and m</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
RegexTester.metadata = {
  id: 'regex-tester',
  name: 'Regex Tester',
  description: 'Test and debug regular expressions',
  category: 'text-tools',
  requiresBackend: false,
};

export default RegexTester;
