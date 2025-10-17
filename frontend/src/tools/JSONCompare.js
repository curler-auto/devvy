import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code, Copy, Check, AlertCircle, ArrowUpDown, FileText, Sparkles, Upload, ArrowLeftRight, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactDiffViewer from 'react-diff-viewer';
import { deepCompare, compareArraysOrderAgnostic, sortJSON, sortArraysInJSON, getDiffSummary, formatDiffReport } from '@/utils/jsonDiff';
import { beautifyJSON } from '@/utils/jsonUtils';

/**
 * JSON Compare Tool
 * Structural JSON comparison with deep diff analysis
 * Supports order-agnostic array comparison and JSON sorting
 */
function JSONCompare({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [leftJSON, setLeftJSON] = useState(tab.data?.actual || tab.data?.left || '');
  const [rightJSON, setRightJSON] = useState(tab.data?.expected || tab.data?.right || '');
  const [diffView, setDiffView] = useState(tab.data?.diffView || '');
  const [diffReport, setDiffReport] = useState(tab.data?.diffReport || '');
  const [leftError, setLeftError] = useState(null);
  const [rightError, setRightError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(tab.data?.compareMode || 'split');
  const [comparisonType, setComparisonType] = useState(tab.data?.comparisonType || 'structural');
  const [arrayOrderAgnostic, setArrayOrderAgnostic] = useState(tab.data?.arrayOrderAgnostic || false);
  const [sortBeforeCompare, setSortBeforeCompare] = useState(tab.data?.sortBeforeCompare || false);
  const [showResultsSidebar, setShowResultsSidebar] = useState(false);
  const [blinkResults, setBlinkResults] = useState(false);

  // Format JSON for better comparison
  const formatJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (err) {
      return jsonString; // Return as-is if not valid JSON
    }
  };

  // Compare JSON documents
  const compareJSON = () => {
    try {
      // Validate left JSON
      let leftParsed;
      try {
        leftParsed = JSON.parse(leftJSON);
        setLeftError(null);
      } catch (err) {
        setLeftError(`Invalid JSON: ${err.message}`);
        toast.error(`Left side: Invalid JSON: ${err.message}`);
        return false;
      }

      // Validate right JSON
      let rightParsed;
      try {
        rightParsed = JSON.parse(rightJSON);
        setRightError(null);
      } catch (err) {
        setRightError(`Invalid JSON: ${err.message}`);
        toast.error(`Right side: Invalid JSON: ${err.message}`);
        return false;
      }

      // Apply sorting if requested
      let leftToCompare = leftParsed;
      let rightToCompare = rightParsed;
      
      if (sortBeforeCompare) {
        leftToCompare = sortJSON(leftParsed);
        rightToCompare = sortJSON(rightParsed);
        
        if (arrayOrderAgnostic) {
          leftToCompare = sortArraysInJSON(leftToCompare);
          rightToCompare = sortArraysInJSON(rightToCompare);
        }
      }

      // Format both sides for display
      const formattedLeft = JSON.stringify(leftToCompare, null, 2);
      const formattedRight = JSON.stringify(rightToCompare, null, 2);
      
      // Update state with formatted JSON
      setLeftJSON(formattedLeft);
      setRightJSON(formattedRight);
      
      // Perform structural comparison
      let diff;
      let reportText = '';
      
      if (comparisonType === 'structural') {
        if (arrayOrderAgnostic) {
          // For order-agnostic comparison, we need to handle arrays specially
          diff = deepCompare(leftToCompare, rightToCompare);
        } else {
          diff = deepCompare(leftToCompare, rightToCompare);
        }
        
        const summary = getDiffSummary(diff);
        reportText = formatDiffReport(diff);
        
        setDiffReport(reportText);
        
        if (summary.hasChanges) {
          toast.success(`Found ${summary.totalChanges} differences`);
        } else {
          toast.success('JSON objects are identical!');
        }
      } else {
        // Text-based comparison
        setDiffReport('');
        toast.success('Text comparison ready');
      }
      
      // Set diff view
      setDiffView('visible');
      
      // Blink the Results button
      setBlinkResults(true);
      setTimeout(() => setBlinkResults(false), 2000);
      
      // Update tab data
      const updatedTabs = tabs.map(t => 
        t.tabId === tab.tabId 
          ? { 
              ...t, 
              data: { 
                actual: formattedLeft, 
                expected: formattedRight,
                left: formattedLeft,
                right: formattedRight, 
                diffView: 'visible', 
                compareMode,
                comparisonType,
                arrayOrderAgnostic,
                sortBeforeCompare,
                diffReport: reportText
              } 
            }
          : t
      );
      setTabs(updatedTabs);
      
      return true;
    } catch (err) {
      console.error('JSON comparison error:', err);
      toast.error(`Comparison error: ${err.message}`);
      return false;
    }
  };

  const copyToClipboard = async (side) => {
    try {
      const content = side === 'actual' ? leftJSON : (side === 'expected' ? rightJSON : diffReport);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${side === 'actual' ? 'Actual' : side === 'expected' ? 'Expected' : 'Report'} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('Failed to copy');
    }
  };

  const loadFromFile = async (side) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target.result;
            // Validate JSON
            JSON.parse(content);
            
            if (side === 'actual') {
              setLeftJSON(content);
              setLeftError(null);
            } else {
              setRightJSON(content);
              setRightError(null);
            }
            toast.success(`${side === 'actual' ? 'Actual' : 'Expected'} JSON loaded from ${file.name}`);
          } catch (err) {
            toast.error(`Invalid JSON file: ${err.message}`);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (err) {
      toast.error(`Failed to load file: ${err.message}`);
    }
  };

  const beautifyLeft = () => {
    const result = beautifyJSON(leftJSON);
    if (result.success) {
      setLeftJSON(result.result);
      toast.success('Left JSON beautified!');
    } else {
      toast.error(result.error);
    }
  };

  const beautifyRight = () => {
    const result = beautifyJSON(rightJSON);
    if (result.success) {
      setRightJSON(result.result);
      toast.success('Right JSON beautified!');
    } else {
      toast.error(result.error);
    }
  };

  const sortLeft = () => {
    try {
      const parsed = JSON.parse(leftJSON);
      const sorted = sortJSON(parsed);
      setLeftJSON(JSON.stringify(sorted, null, 2));
      toast.success('Left JSON sorted!');
    } catch (err) {
      toast.error(`Failed to sort: ${err.message}`);
    }
  };

  const sortRight = () => {
    try {
      const parsed = JSON.parse(rightJSON);
      const sorted = sortJSON(parsed);
      setRightJSON(JSON.stringify(sorted, null, 2));
      toast.success('Right JSON sorted!');
    } catch (err) {
      toast.error(`Failed to sort: ${err.message}`);
    }
  };

  const swapJSON = () => {
    const temp = leftJSON;
    setLeftJSON(rightJSON);
    setRightJSON(temp);
    
    const tempError = leftError;
    setLeftError(rightError);
    setRightError(tempError);
    
    toast.success('Swapped Actual ↔ Expected');
  };

  const screenshotVisualDiff = async () => {
    try {
      const element = document.getElementById('visual-diff-container');
      if (!element) {
        toast.error('Visual diff not found');
        return;
      }

      // Import html2canvas dynamically
      const html2canvas = await import('html2canvas').then(module => module.default).catch(() => null);
      
      if (html2canvas) {
        toast.info('Capturing screenshot...');
        
        const canvas = await html2canvas(element, {
          backgroundColor: '#1e1e1e',
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
        // Try to copy to clipboard first
        canvas.toBlob(async (blob) => {
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            toast.success('Screenshot copied to clipboard!');
          } catch (clipboardErr) {
            // Fallback: download as file
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `json-diff-${Date.now()}.png`;
            link.href = url;
            link.click();
            toast.success('Screenshot downloaded!');
          }
        }, 'image/png');
      } else {
        // Fallback: download the diff as text file
        const diffText = `ACTUAL JSON:\n${leftJSON}\n\n${'='.repeat(80)}\n\nEXPECTED JSON:\n${rightJSON}`;
        const blob = new Blob([diffText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `json-diff-${Date.now()}.txt`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Diff downloaded as text file!');
      }
    } catch (err) {
      console.error('Screenshot error:', err);
      toast.error(`Failed to capture: ${err.message}`);
    }
  };

  // Determine theme for diff viewer based on editor theme
  const isDarkTheme = editorTheme.includes('dark');

  return (
    <div className="json-compare-tool relative" data-testid="json-compare">
      <div className="flex flex-col h-full relative">
        {/* Compare button and options - MOVED TO TOP */}
        <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Comparison Type:</label>
              <select
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors cursor-pointer"
                style={{ minWidth: '180px' }}
              >
                <option value="structural">Structural (Deep Diff)</option>
                <option value="text">Text-based</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">View Mode:</label>
              <select
                value={compareMode}
                onChange={(e) => setCompareMode(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-colors cursor-pointer"
                style={{ minWidth: '140px' }}
              >
                <option value="split">Split View</option>
                <option value="unified">Unified View</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setSortBeforeCompare(!sortBeforeCompare)}
                size="sm"
                variant={sortBeforeCompare ? "default" : "outline"}
                title="Sort keys before comparing - Alphabetically sort all JSON keys before comparison"
                className="h-8 w-8 p-0"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => setArrayOrderAgnostic(!arrayOrderAgnostic)}
                size="sm"
                variant={arrayOrderAgnostic ? "default" : "outline"}
                title="Array order-agnostic - Ignore array element order during comparison"
                className="h-8 w-8 p-0"
              >
                <Code className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={compareJSON} 
              size="sm"
              className="h-10 w-10 p-0 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white shadow-lg"
              title="Compare JSON"
            >
              <Code className="w-5 h-5" />
            </Button>

            {diffView === 'visible' && (
              <Button
                onClick={() => setShowResultsSidebar(!showResultsSidebar)}
                size="sm"
                variant="outline"
                className={`h-10 w-10 p-0 rounded-full shadow-lg ${blinkResults ? 'animate-pulse bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : ''} ${showResultsSidebar ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : ''}`}
                title="View comparison results"
              >
                <FileText className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Input panels */}
        <div className="flex flex-1 gap-4 mb-4 items-stretch">
          {/* Actual JSON */}
          <div className="flex-1 json-panel">
            <div className="panel-header">
              <h3>Actual JSON</h3>
              <div className="flex gap-1">
                <Button 
                  onClick={() => loadFromFile('actual')} 
                  size="sm"
                  variant="ghost"
                  title="Load JSON from file"
                  className="h-8 w-8 p-0"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={beautifyLeft} 
                  size="sm"
                  variant="ghost"
                  disabled={!leftJSON}
                  title="Beautify JSON"
                  className="h-8 w-8 p-0"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={sortLeft} 
                  size="sm"
                  variant="ghost"
                  disabled={!leftJSON}
                  title="Sort keys alphabetically"
                  className="h-8 w-8 p-0"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => copyToClipboard('actual')} 
                  size="sm"
                  variant="ghost"
                  disabled={!leftJSON}
                  title="Copy to clipboard"
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="editor-container">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={leftJSON}
                onChange={(value) => setLeftJSON(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
              {leftError && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  {leftError}
                </div>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex items-center justify-center">
            <Button
              onClick={swapJSON}
              size="sm"
              variant="outline"
              title="Swap Actual ↔ Expected"
              className="h-10 w-10 p-0 rounded-full"
              disabled={!leftJSON && !rightJSON}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Expected JSON */}
          <div className="flex-1 json-panel">
            <div className="panel-header">
              <h3>Expected JSON</h3>
              <div className="flex gap-1">
                <Button 
                  onClick={() => loadFromFile('expected')} 
                  size="sm"
                  variant="ghost"
                  title="Load JSON from file"
                  className="h-8 w-8 p-0"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={beautifyRight} 
                  size="sm"
                  variant="ghost"
                  disabled={!rightJSON}
                  title="Beautify JSON"
                  className="h-8 w-8 p-0"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={sortRight} 
                  size="sm"
                  variant="ghost"
                  disabled={!rightJSON}
                  title="Sort keys alphabetically"
                  className="h-8 w-8 p-0"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => copyToClipboard('expected')} 
                  size="sm"
                  variant="ghost"
                  disabled={!rightJSON}
                  title="Copy to clipboard"
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="editor-container">
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={editorTheme}
                value={rightJSON}
                onChange={(value) => setRightJSON(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
              {rightError && (
                <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  <AlertCircle className="w-3 h-3 inline-block mr-1" />
                  {rightError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overlay when sidebar is open */}
        {showResultsSidebar && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowResultsSidebar(false)}
          />
        )}

        {/* Results Sidebar - Slides from right */}
        <div 
          className={`fixed top-0 right-0 h-full w-[600px] bg-[var(--bg-primary)] border-l-2 border-[var(--border-primary)] shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
            showResultsSidebar ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Collapse Button on Left Edge */}
          {showResultsSidebar && (
            <Button
              onClick={() => setShowResultsSidebar(false)}
              size="sm"
              variant="outline"
              className="absolute -left-10 top-1/2 -translate-y-1/2 h-20 w-10 rounded-l-lg rounded-r-none bg-[var(--bg-secondary)] border-r-0 hover:bg-[var(--bg-hover)]"
              title="Collapse results panel"
            >
              <ArrowLeftRight className="w-5 h-5 rotate-180" />
            </Button>
          )}

          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Comparison Results</h2>
              <Button
                onClick={() => setShowResultsSidebar(false)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                title="Close results panel"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Structural Diff Report */}
              {comparisonType === 'structural' && diffReport && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Structural Analysis</h3>
                    <Button 
                      onClick={() => copyToClipboard('report')} 
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Copy report"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-3 bg-[var(--bg-tertiary)] max-h-[400px] overflow-y-auto">
                    {diffReport.split('\n').map((line, index) => {
                      if (line.includes('===')) {
                        return <div key={index} className="text-lg font-bold text-[var(--accent-primary)] border-b border-[var(--border-primary)] pb-2">{line.replace(/=/g, '')}</div>;
                      } else if (line.includes('Total Changes:')) {
                        return <div key={index} className="text-base font-semibold text-[var(--text-primary)] p-2">{line}</div>;
                      } else if (line.includes('Added:') || line.includes('Removed:') || line.includes('Modified:') || line.includes('Unchanged:')) {
                        const isAdded = line.includes('Added:');
                        const isRemoved = line.includes('Removed:');
                        const isModified = line.includes('Modified:');
                        const color = isAdded ? 'text-green-500' : isRemoved ? 'text-red-500' : isModified ? 'text-yellow-500' : 'text-gray-500';
                        return <div key={index} className={`text-sm font-medium ${color} pl-4`}>{line}</div>;
                      } else if (line.includes('--- ADDED ---')) {
                        return <div key={index} className="text-sm font-bold text-green-500 mt-4 mb-2 border-l-4 border-green-500 pl-2">{line}</div>;
                      } else if (line.includes('--- REMOVED ---')) {
                        return <div key={index} className="text-sm font-bold text-red-500 mt-4 mb-2 border-l-4 border-red-500 pl-2">{line}</div>;
                      } else if (line.includes('--- MODIFIED ---')) {
                        return <div key={index} className="text-sm font-bold text-yellow-500 mt-4 mb-2 border-l-4 border-yellow-500 pl-2">{line}</div>;
                      } else if (line.trim().startsWith('$.')) {
                        return <div key={index} className="text-xs font-mono text-[var(--accent-primary)] p-2 ml-4">{line.trim()}</div>;
                      } else if (line.includes('Value:') || line.includes('Left:') || line.includes('Right:')) {
                        return <div key={index} className="text-xs font-mono text-[var(--text-secondary)] pl-8">{line}</div>;
                      } else if (line.trim()) {
                        return <div key={index} className="text-xs text-[var(--text-secondary)]">{line}</div>;
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Visual Diff View */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{comparisonType === 'structural' ? 'Visual Diff' : 'Text Diff'}</h3>
                  <Button 
                    onClick={screenshotVisualDiff} 
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Screenshot visual diff"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div id="visual-diff-container" className="overflow-auto max-h-[500px]">
                  <ReactDiffViewer
                oldValue={leftJSON}
                newValue={rightJSON}
                splitView={compareMode === 'split'}
                useDarkTheme={isDarkTheme}
                hideLineNumbers={false}
                showDiffOnly={false}
                compareMethod="diffWords"
                styles={{
                  variables: {
                    dark: {
                      diffViewerBackground: '#1e1e1e',
                      diffViewerColor: '#d4d4d4',
                      addedBackground: '#044B53',
                      addedColor: '#d4d4d4',
                      removedBackground: '#5A1E1E',
                      removedColor: '#d4d4d4',
                      wordAddedBackground: '#055d67',
                      wordRemovedBackground: '#7d2727',
                      addedGutterBackground: '#034148',
                      removedGutterBackground: '#4b1818',
                      gutterBackground: '#2a2a2a',
                      gutterBackgroundDark: '#262626',
                      highlightBackground: '#3e3e3e',
                      highlightGutterBackground: '#2d2d2d',
                    },
                    light: {
                      diffViewerBackground: '#ffffff',
                      diffViewerColor: '#333333',
                      addedBackground: '#e6ffed',
                      addedColor: '#24292e',
                      removedBackground: '#ffeef0',
                      removedColor: '#24292e',
                      wordAddedBackground: '#acf2bd',
                      wordRemovedBackground: '#fdb8c0',
                      addedGutterBackground: '#cdffd8',
                      removedGutterBackground: '#ffdce0',
                      gutterBackground: '#f7f7f7',
                      gutterBackgroundDark: '#f3f3f3',
                      highlightBackground: '#fffbdd',
                      highlightGutterBackground: '#fff5b1',
                    },
                  },
                }}
              />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
JSONCompare.metadata = {
  id: 'json-compare',
  name: 'JSON Compare',
  description: 'Compare two JSON documents and highlight differences',
  category: 'json',
  requiresBackend: false, // Client-side implementation
};

export default JSONCompare;
