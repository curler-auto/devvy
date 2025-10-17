import React, { useState, useRef } from 'react';
import { FileText, Copy, Eye, Code, Maximize2, Minimize2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Markdown Visualizer Tool
 * Preview and edit Markdown with live rendering
 */
function MarkdownVisualizer({ tab, tabs, setTabs }) {
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState('split'); // 'split', 'preview', 'editor'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfFilename] = useState('markdown-export');
  const previewRef = useRef(null);

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      // Switch to preview mode when going fullscreen
      setViewMode('preview');
    }
  };

  // Export to PDF directly
  const exportPDF = async () => {
    if (!markdown) {
      toast.error('No content to export');
      return;
    }

    try {
      // Dynamically import html2pdf
      const html2pdf = await import('html2pdf.js').then(module => module.default);
      
      const element = previewRef.current;
      if (!element) {
        toast.error('Preview not available');
        return;
      }

      // Store original styles
      const originalBg = element.style.backgroundColor;
      const originalColor = element.style.color;
      
      // Temporarily modify styles for PDF
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#000000';
      
      // Override all text colors to black for PDF
      const allElements = element.querySelectorAll('*');
      const originalStyles = [];
      allElements.forEach(el => {
        originalStyles.push({
          element: el,
          color: el.style.color,
          backgroundColor: el.style.backgroundColor
        });
        el.style.color = '#000000';
        el.style.backgroundColor = 'transparent';
      });
      
      // Style code blocks
      const codeBlocks = element.querySelectorAll('pre, code');
      codeBlocks.forEach(el => {
        el.style.backgroundColor = '#f5f5f5';
        el.style.color = '#000000';
        el.style.border = '1px solid #ddd';
      });
      
      // Style links
      const links = element.querySelectorAll('a');
      links.forEach(el => {
        el.style.color = '#0066cc';
      });
      
      // Style headings
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(el => {
        el.style.color = '#000000';
        el.style.fontWeight = 'bold';
      });

      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'markdown-export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generate PDF as blob to get the file
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'markdown-export.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restore original styles
      element.style.backgroundColor = originalBg;
      element.style.color = originalColor;
      originalStyles.forEach(({ element: el, color, backgroundColor }) => {
        el.style.color = color;
        el.style.backgroundColor = backgroundColor;
      });
      
      // Show success with view link
      toast.success('PDF downloaded!', {
        duration: 5000,
        action: {
          label: 'Open',
          onClick: () => {
            // Create a temporary iframe to view the PDF
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.zIndex = '9999';
            iframe.style.border = 'none';
            iframe.src = url;
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕ Close';
            closeBtn.style.position = 'fixed';
            closeBtn.style.top = '10px';
            closeBtn.style.right = '10px';
            closeBtn.style.zIndex = '10000';
            closeBtn.style.padding = '10px 20px';
            closeBtn.style.backgroundColor = '#ef4444';
            closeBtn.style.color = 'white';
            closeBtn.style.border = 'none';
            closeBtn.style.borderRadius = '6px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.style.fontSize = '14px';
            closeBtn.style.fontWeight = '600';
            closeBtn.onclick = () => {
              document.body.removeChild(iframe);
              document.body.removeChild(closeBtn);
            };
            
            document.body.appendChild(iframe);
            document.body.appendChild(closeBtn);
          }
        }
      });
      
      // Clean up URL after longer delay to ensure button works
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(`Failed to export PDF: ${err.message}`);
    }
  };

  // Sample markdown
  const loadSample = () => {
    const sample = `# Markdown Preview

## Features

This is a **live Markdown editor** with support for:

- **Bold** and *italic* text
- [Links](https://example.com)
- \`Inline code\`
- Lists (ordered and unordered)

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Tables

| Feature | Supported |
|---------|-----------|
| Headers | ✅ |
| Lists | ✅ |
| Code | ✅ |
| Tables | ✅ |

### Blockquotes

> This is a blockquote.
> It can span multiple lines.

### Task Lists

- [x] Completed task
- [ ] Pending task
- [ ] Another task

---

**Try editing this markdown!**
`;
    setMarkdown(sample);
    toast.success('Sample markdown loaded!');
  };

  return (
    <div 
      className={`markdown-visualizer flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[var(--bg-primary)]' : 'h-full'}`} 
      data-testid="markdown-visualizer"
    >
      {/* Header */}
      <div className="border-b p-4 bg-[var(--bg-secondary)] flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
            Markdown Visualizer
            {isFullscreen && (
              <span className="text-xs text-[var(--text-secondary)] ml-2">(Fullscreen)</span>
            )}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* View Mode Buttons */}
            {!isFullscreen && (
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    viewMode === 'editor'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                  title="Editor only"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 text-sm transition-colors border-x border-[var(--border-primary)] ${
                    viewMode === 'split'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="Split view"
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                title="Preview only"
              >
                <Eye className="w-4 h-4" />
              </button>
              </div>
            )}

            <Button
              onClick={loadSample}
              size="sm"
              variant="outline"
            >
              Load Sample
            </Button>

            <Button
              onClick={() => copyToClipboard(markdown, 'Markdown')}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Copy markdown"
              disabled={!markdown}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r border-[var(--border-primary)] flex flex-col`}>
            <div className="p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Editor</h3>
            </div>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Enter markdown here..."
              className="flex-1 p-4 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none font-mono text-sm resize-none"
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
            <div className="p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Preview</h3>
              
              {/* Preview Action Buttons */}
              <div className="flex items-center gap-2">
                {/* PDF Export Button */}
                <Button
                  onClick={exportPDF}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Export to PDF"
                  disabled={!markdown}
                >
                  <Printer className="w-4 h-4" />
                </Button>

                {/* Fullscreen Toggle Button */}
                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-[var(--bg-primary)]">
              {markdown ? (
                <div ref={previewRef} className="markdown-preview prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center text-[var(--text-tertiary)] mt-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Enter markdown to see preview</p>
                  <Button
                    onClick={loadSample}
                    size="sm"
                    variant="outline"
                    className="mt-4"
                  >
                    Load Sample
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles for Markdown Preview */}
      <style jsx global>{`
        .markdown-preview {
          color: var(--text-primary);
        }
        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3,
        .markdown-preview h4,
        .markdown-preview h5,
        .markdown-preview h6 {
          color: var(--text-primary);
          font-weight: 600;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .markdown-preview h1 { font-size: 2em; border-bottom: 2px solid var(--border-primary); padding-bottom: 0.3em; }
        .markdown-preview h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-primary); padding-bottom: 0.3em; }
        .markdown-preview h3 { font-size: 1.25em; }
        .markdown-preview p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          line-height: 1.6;
        }
        .markdown-preview a {
          color: var(--accent-primary);
          text-decoration: underline;
        }
        .markdown-preview a:hover {
          opacity: 0.8;
        }
        .markdown-preview code {
          background: var(--bg-tertiary);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
        }
        .markdown-preview pre {
          background: var(--bg-tertiary);
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .markdown-preview pre code {
          background: none;
          padding: 0;
        }
        .markdown-preview blockquote {
          border-left: 4px solid var(--accent-primary);
          padding-left: 1em;
          margin-left: 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .markdown-preview ul,
        .markdown-preview ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        .markdown-preview li {
          margin: 0.25em 0;
        }
        .markdown-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .markdown-preview th,
        .markdown-preview td {
          border: 1px solid var(--border-primary);
          padding: 0.5em;
          text-align: left;
        }
        .markdown-preview th {
          background: var(--bg-secondary);
          font-weight: 600;
        }
        .markdown-preview hr {
          border: none;
          border-top: 2px solid var(--border-primary);
          margin: 2em 0;
        }
        .markdown-preview img {
          max-width: 100%;
          height: auto;
        }
        .markdown-preview input[type="checkbox"] {
          margin-right: 0.5em;
        }
      `}</style>
    </div>
  );
}

// Tool metadata
MarkdownVisualizer.metadata = {
  id: 'markdown-preview',
  name: 'Markdown Visualizer',
  description: 'Preview and edit Markdown with live rendering',
  category: 'text-tools',
  requiresBackend: false,
};

export default MarkdownVisualizer;
