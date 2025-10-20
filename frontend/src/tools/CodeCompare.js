import React, { useState, useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { 
  GitBranch, RefreshCw, FolderTree, File, ChevronRight, ChevronDown,
  Folder, FolderOpen, Code, Settings, ArrowLeftRight, Download, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

/**
 * Code Compare Tool
 * Compare code files from different branches/commits
 * Uses Monaco Diff Editor (same as VS Code)
 */
function CodeCompare({ tab, tabs, setTabs, editorTheme = 'vs-dark' }) {
  const [repositories, setRepositories] = useState([]);
  const [leftRepo, setLeftRepo] = useState('');
  const [rightRepo, setRightRepo] = useState('');
  const [leftBranch, setLeftBranch] = useState('');
  const [rightBranch, setRightBranch] = useState('');
  const [leftBranches, setLeftBranches] = useState([]);
  const [rightBranches, setRightBranches] = useState([]);
  const [leftFiles, setLeftFiles] = useState([]);
  const [rightFiles, setRightFiles] = useState([]);
  const [leftFile, setLeftFile] = useState('');
  const [rightFile, setRightFile] = useState('');
  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');
  const [leftLanguage, setLeftLanguage] = useState('plaintext');
  const [rightLanguage, setRightLanguage] = useState('plaintext');
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [leftExpandedFolders, setLeftExpandedFolders] = useState(new Set());
  const [rightExpandedFolders, setRightExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [diffStats, setDiffStats] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const diffEditorRef = useRef(null);

  // Load repositories from environment settings
  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      // Load from localStorage (desktop mode) or API (web mode)
      const stored = localStorage.getItem('git_repositories');
      if (stored) {
        const repos = JSON.parse(stored);
        setRepositories(repos);
        if (repos.length > 0) {
          setLeftRepo(repos[0].id);
          setRightRepo(repos[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  };

  // Fetch branches when repository changes
  useEffect(() => {
    if (leftRepo) {
      fetchBranches(leftRepo, 'left');
    }
  }, [leftRepo]);

  useEffect(() => {
    if (rightRepo) {
      fetchBranches(rightRepo, 'right');
    }
  }, [rightRepo]);

  // Fetch file tree when branch changes
  useEffect(() => {
    if (leftRepo && leftBranch) {
      fetchFileTree(leftRepo, leftBranch, 'left');
    }
  }, [leftRepo, leftBranch]);

  useEffect(() => {
    if (rightRepo && rightBranch) {
      fetchFileTree(rightRepo, rightBranch, 'right');
    }
  }, [rightRepo, rightBranch]);

  const fetchBranches = async (repoId, side) => {
    try {
      setLoading(true);
      const repo = repositories.find(r => r.id === repoId);
      if (!repo) return;

      // Fetch branches using configured API
      const response = await axios.get(`${repo.apiUrl}/repos/${repo.owner}/${repo.name}/branches`, {
        headers: {
          'Authorization': `token ${repo.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      const branches = response.data.map(b => b.name);
      
      if (side === 'left') {
        setLeftBranches(branches);
        if (branches.length > 0 && !leftBranch) {
          setLeftBranch(branches[0]);
        }
      } else {
        setRightBranches(branches);
        if (branches.length > 0 && !rightBranch) {
          setRightBranch(branches[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      toast.error(`Failed to fetch branches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileTree = async (repoId, branch, side) => {
    try {
      setLoading(true);
      const repo = repositories.find(r => r.id === repoId);
      if (!repo) return;

      // Fetch file tree using GitHub API
      const response = await axios.get(
        `${repo.apiUrl}/repos/${repo.owner}/${repo.name}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            'Authorization': `token ${repo.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const files = response.data.tree
        .filter(item => item.type === 'blob')
        .map(item => item.path);

      if (side === 'left') {
        setLeftFiles(buildFileTree(files));
      } else {
        setRightFiles(buildFileTree(files));
      }
    } catch (err) {
      console.error('Failed to fetch file tree:', err);
      toast.error(`Failed to fetch files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (files) => {
    const tree = {};
    files.forEach(path => {
      const parts = path.split('/');
      let current = tree;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          if (!current._files) current._files = [];
          current._files.push({ name: part, path });
        } else {
          // Folder
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      });
    });
    return tree;
  };

  const fetchFileContent = async (repoId, branch, filePath, side) => {
    try {
      setLoading(true);
      const repo = repositories.find(r => r.id === repoId);
      if (!repo) return;

      const response = await axios.get(
        `${repo.apiUrl}/repos/${repo.owner}/${repo.name}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${repo.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const content = atob(response.data.content);
      const language = detectLanguage(filePath);

      if (side === 'left') {
        setLeftContent(content);
        setLeftLanguage(language);
        setLeftFile(filePath);
      } else {
        setRightContent(content);
        setRightLanguage(language);
        setRightFile(filePath);
      }

      toast.success(`Loaded ${filePath}`);
    } catch (err) {
      console.error('Failed to fetch file:', err);
      toast.error(`Failed to load file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const detectLanguage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile',
    };
    return langMap[ext] || 'plaintext';
  };

  const handleFileSelect = (filePath, side) => {
    if (side === 'left') {
      fetchFileContent(leftRepo, leftBranch, filePath, 'left');
    } else {
      fetchFileContent(rightRepo, rightBranch, filePath, 'right');
    }
  };

  const toggleFolder = (path, side) => {
    const folders = side === 'left' ? leftExpandedFolders : rightExpandedFolders;
    const setFolders = side === 'left' ? setLeftExpandedFolders : setRightExpandedFolders;
    
    const newFolders = new Set(folders);
    if (newFolders.has(path)) {
      newFolders.delete(path);
    } else {
      newFolders.add(path);
    }
    setFolders(newFolders);
  };

  const renderFileTree = (tree, side, path = '') => {
    const folders = side === 'left' ? leftExpandedFolders : rightExpandedFolders;
    const items = [];

    // Render folders
    Object.keys(tree).forEach(key => {
      if (key === '_files') return;
      const folderPath = path ? `${path}/${key}` : key;
      const isExpanded = folders.has(folderPath);
      
      items.push(
        <div key={folderPath}>
          <div
            className="flex items-center gap-1 px-2 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer text-sm"
            onClick={() => toggleFolder(folderPath, side)}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />}
            <span>{key}</span>
          </div>
          {isExpanded && (
            <div className="ml-4">
              {renderFileTree(tree[key], side, folderPath)}
            </div>
          )}
        </div>
      );
    });

    // Render files
    if (tree._files) {
      tree._files.forEach(file => {
        items.push(
          <div
            key={file.path}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[var(--bg-tertiary)] cursor-pointer text-sm ml-4"
            onClick={() => handleFileSelect(file.path, side)}
          >
            <File className="w-4 h-4 text-blue-500" />
            <span>{file.name}</span>
          </div>
        );
      });
    }

    return items;
  };

  const swapSides = () => {
    // Swap repositories
    const tempRepo = leftRepo;
    setLeftRepo(rightRepo);
    setRightRepo(tempRepo);

    // Swap branches
    const tempBranch = leftBranch;
    setLeftBranch(rightBranch);
    setRightBranch(tempBranch);

    // Swap files
    const tempFile = leftFile;
    setLeftFile(rightFile);
    setRightFile(tempFile);

    // Swap content
    const tempContent = leftContent;
    setLeftContent(rightContent);
    setRightContent(tempContent);

    // Swap language
    const tempLang = leftLanguage;
    setLeftLanguage(rightLanguage);
    setRightLanguage(tempLang);

    toast.success('Sides swapped');
  };

  const handleDiffEditorMount = (editor) => {
    diffEditorRef.current = editor;
    
    // Calculate diff stats
    const modifiedEditor = editor.getModifiedEditor();
    const originalEditor = editor.getOriginalEditor();
    
    if (modifiedEditor && originalEditor) {
      const lineCount = modifiedEditor.getModel()?.getLineCount() || 0;
      setDiffStats({ lineCount });
    }
  };

  return (
    <div className="tool-container">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          <h2>Code Compare</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={swapSides} size="sm" variant="outline">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Swap Sides
          </Button>
          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="outline">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-4 mb-4">
          <h3 className="text-sm font-semibold mb-2">Repository Configuration</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Configure repositories in Settings → Environment to enable code comparison.
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Required: Repository URL, Owner, Name, API Token (GitHub/GitLab/Bitbucket)
          </p>
        </div>
      )}

      {/* File Browsers - Side by Side */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4">
        {/* Left Side */}
        <div>
          <div className="panel-header">
            <h3>Original</h3>
            <div className="flex items-center gap-2">
              <select
                value={leftRepo}
                onChange={(e) => setLeftRepo(e.target.value)}
                className="px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                disabled={repositories.length === 0}
              >
                <option value="">Select Repository</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>{repo.name}</option>
                ))}
              </select>
              <select
                value={leftBranch}
                onChange={(e) => setLeftBranch(e.target.value)}
                className="px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                disabled={!leftRepo}
              >
                <option value="">Select Branch</option>
                {leftBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <Button
                onClick={() => fetchBranches(leftRepo, 'left')}
                size="sm"
                variant="ghost"
                disabled={!leftRepo || loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* File Browser */}
          <div className="border border-[var(--border-primary)] rounded-md mb-2 h-[200px] overflow-auto">
            <div className="p-2">
              {leftFiles && Object.keys(leftFiles).length > 0 ? (
                renderFileTree(leftFiles, 'left')
              ) : (
                <div className="text-center text-sm text-[var(--text-tertiary)] py-4">
                  {leftRepo && leftBranch ? 'Loading files...' : 'Select repository and branch'}
                </div>
              )}
            </div>
          </div>

          {leftFile && (
            <div className="text-xs text-[var(--text-secondary)] mb-2">
              <File className="w-3 h-3 inline-block mr-1" />
              {leftFile}
            </div>
          )}
        </div>

        {/* Right Side */}
        <div>
          <div className="panel-header">
            <h3>Modified</h3>
            <div className="flex items-center gap-2">
              <select
                value={rightRepo}
                onChange={(e) => setRightRepo(e.target.value)}
                className="px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                disabled={repositories.length === 0}
              >
                <option value="">Select Repository</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>{repo.name}</option>
                ))}
              </select>
              <select
                value={rightBranch}
                onChange={(e) => setRightBranch(e.target.value)}
                className="px-2 py-1 text-xs border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
                disabled={!rightRepo}
              >
                <option value="">Select Branch</option>
                {rightBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <Button
                onClick={() => fetchBranches(rightRepo, 'right')}
                size="sm"
                variant="ghost"
                disabled={!rightRepo || loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* File Browser */}
          <div className="border border-[var(--border-primary)] rounded-md mb-2 h-[200px] overflow-auto">
            <div className="p-2">
              {rightFiles && Object.keys(rightFiles).length > 0 ? (
                renderFileTree(rightFiles, 'right')
              ) : (
                <div className="text-center text-sm text-[var(--text-tertiary)] py-4">
                  {rightRepo && rightBranch ? 'Loading files...' : 'Select repository and branch'}
                </div>
              )}
            </div>
          </div>

          {rightFile && (
            <div className="text-xs text-[var(--text-secondary)] mb-2">
              <File className="w-3 h-3 inline-block mr-1" />
              {rightFile}
            </div>
          )}
        </div>
      </div>

      {/* Diff Editor - Full Width Below */}
      <div className="px-4 pb-4" style={{ height: 'calc(100vh - 450px)', minHeight: '400px' }}>
        <DiffEditor
          height="100%"
          language={leftLanguage}
          original={leftContent}
          modified={rightContent}
          theme={editorTheme}
          onMount={handleDiffEditorMount}
          options={{
            readOnly: true,
            renderSideBySide: true,
            enableSplitViewResizing: true,
            renderOverviewRuler: true,
            minimap: { enabled: true },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            diffWordWrap: 'on',
            ignoreTrimWhitespace: false,
            renderIndicators: true,
            originalEditable: false,
            diffCodeLens: true,
          }}
        />
      </div>
    </div>
  );
}

// Tool metadata
CodeCompare.metadata = {
  id: 'code-compare',
  name: 'Code Compare',
  description: 'Compare code files from different branches/commits using Monaco Diff Editor',
  category: 'utilities',
  requiresBackend: false,
};

export default CodeCompare;
