import React, { useState, useEffect } from 'react';
import { Clock, Copy, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Timestamp Converter Tool
 * Convert between Unix timestamps and human-readable dates
 * Similar to epochconverter.com
 */
function TimestampConverter({ tab, tabs, setTabs }) {
  const [currentTimestamp, setCurrentTimestamp] = useState(Math.floor(Date.now() / 1000));
  const [inputTimestamp, setInputTimestamp] = useState('');
  const [inputDate, setInputDate] = useState('');
  const [inputTime, setInputTime] = useState('');
  const [convertedDate, setConvertedDate] = useState('');
  const [convertedTimestamp, setConvertedTimestamp] = useState('');

  // Update current timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Convert timestamp to date
  const timestampToDate = (timestamp) => {
    try {
      const ts = parseInt(timestamp);
      if (isNaN(ts)) return 'Invalid timestamp';
      
      // Handle both seconds and milliseconds
      const date = ts > 10000000000 ? new Date(ts) : new Date(ts * 1000);
      
      return {
        local: date.toLocaleString(),
        utc: date.toUTCString(),
        iso: date.toISOString(),
        relative: getRelativeTime(date),
      };
    } catch (err) {
      return 'Invalid timestamp';
    }
  };

  // Convert date to timestamp
  const dateToTimestamp = (dateStr, timeStr = '00:00:00') => {
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return {
        seconds: Math.floor(date.getTime() / 1000),
        milliseconds: date.getTime(),
      };
    } catch (err) {
      return 'Invalid date';
    }
  };

  // Get relative time (e.g., "2 hours ago")
  const getRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 30) return `${days} days ago`;
    if (months < 12) return `${months} months ago`;
    return `${years} years ago`;
  };

  // Handle timestamp input
  const handleTimestampConvert = () => {
    if (!inputTimestamp) {
      toast.error('Please enter a timestamp');
      return;
    }
    const result = timestampToDate(inputTimestamp);
    setConvertedDate(result);
  };

  // Handle date input
  const handleDateConvert = () => {
    if (!inputDate) {
      toast.error('Please enter a date');
      return;
    }
    const result = dateToTimestamp(inputDate, inputTime || '00:00:00');
    setConvertedTimestamp(result);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Current time display
  const currentDate = timestampToDate(currentTimestamp);

  return (
    <div className="timestamp-converter p-6" data-testid="timestamp-converter">
      <div className="space-y-6">
        {/* Current Timestamp */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
              Current Timestamp
            </h2>
            <Button
              onClick={() => setCurrentTimestamp(Math.floor(Date.now() / 1000))}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Refresh"
              aria-label="Refresh current timestamp"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Unix Timestamp (seconds)</div>
                <div className="text-2xl font-mono font-bold text-[var(--accent-primary)]">
                  {currentTimestamp}
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard(currentTimestamp.toString())}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Copy timestamp (seconds)"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded">
              <div>
                <div className="text-sm text-[var(--text-secondary)]">Unix Timestamp (milliseconds)</div>
                <div className="text-2xl font-mono font-bold text-[var(--accent-primary)]">
                  {currentTimestamp * 1000}
                </div>
              </div>
              <Button
                onClick={() => copyToClipboard((currentTimestamp * 1000).toString())}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Copy timestamp (milliseconds)"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-3 bg-[var(--bg-tertiary)] rounded space-y-2">
              <div className="text-sm text-[var(--text-secondary)]">Human Readable</div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Local:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{currentDate.local}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">UTC:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{currentDate.utc}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">ISO 8601:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{currentDate.iso}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamp to Date */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--accent-primary)]" />
            Timestamp to Date
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputTimestamp}
                onChange={(e) => setInputTimestamp(e.target.value)}
                placeholder="Enter Unix timestamp (seconds or milliseconds)"
                aria-label="Enter Unix timestamp"
                className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                onKeyPress={(e) => e.key === 'Enter' && handleTimestampConvert()}
              />
              <Button
                onClick={handleTimestampConvert}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                Convert
              </Button>
            </div>

            {convertedDate && typeof convertedDate === 'object' && (
              <div className="p-4 bg-[var(--bg-tertiary)] rounded space-y-2">
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Local Time:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{convertedDate.local}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">UTC:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{convertedDate.utc}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">ISO 8601:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{convertedDate.iso}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Relative:</span>{' '}
                  <span className="font-mono text-[var(--text-primary)]">{convertedDate.relative}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date to Timestamp */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
            Date to Timestamp
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                aria-label="Select date"
                className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
              <input
                type="time"
                value={inputTime}
                onChange={(e) => setInputTime(e.target.value)}
                aria-label="Select time"
                className="px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
              <Button
                onClick={handleDateConvert}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                Convert
              </Button>
            </div>

            {convertedTimestamp && typeof convertedTimestamp === 'object' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded">
                  <div>
                    <div className="text-sm text-[var(--text-secondary)]">Unix Timestamp (seconds)</div>
                    <div className="text-xl font-mono font-bold text-[var(--accent-primary)]">
                      {convertedTimestamp.seconds}
                    </div>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(convertedTimestamp.seconds.toString())}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="Copy timestamp seconds"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded">
                  <div>
                    <div className="text-sm text-[var(--text-secondary)]">Unix Timestamp (milliseconds)</div>
                    <div className="text-xl font-mono font-bold text-[var(--accent-primary)]">
                      {convertedTimestamp.milliseconds}
                    </div>
                  </div>
                  <Button
                    onClick={() => copyToClipboard(convertedTimestamp.milliseconds.toString())}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="Copy timestamp milliseconds"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
TimestampConverter.metadata = {
  id: 'timestamp-converter',
  name: 'Timestamp Converter',
  description: 'Convert between Unix timestamps and human-readable dates',
  category: 'generators',
  requiresBackend: false,
};

export default TimestampConverter;
