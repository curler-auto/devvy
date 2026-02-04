import React, { useState, useEffect, useRef } from 'react';
import { X, Bookmark } from 'lucide-react';

const TabItem = React.memo(({ tab, isActive, onActivate, onClose, onRename, onDuplicate, onCloseOthers, onCloseToRight, onSave, hasUnsavedChanges }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditName(tab.customName || tab.name);
    setIsEditing(true);
  };

  const handleRename = () => {
    if (editName.trim()) {
      onRename(tab.tabId, editName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
      <div
        className={`tab ${isActive ? 'active' : ''}`}
        onClick={() => onActivate(tab.tabId)}
        onContextMenu={handleContextMenu}
        data-testid={`tab-${tab.tabId}`}
      >
        <tab.icon className="w-4 h-4 flex-shrink-0" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="tab-name-input"
            onClick={(e) => e.stopPropagation()}
            data-testid={`tab-rename-input-${tab.tabId}`}
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            className="tab-name"
            title={tab.customName || tab.name}
          >
            {hasUnsavedChanges && tab.savedItemId && <span style={{ color: 'var(--accent-primary)', marginRight: '4px' }}>*</span>}
            {tab.customName || tab.name}
          </span>
        )}
        {isActive && onSave && (
          <button
            className="tab-action"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            title="Save to Collection (Cmd+S)"
            data-testid={`save-tab-${tab.tabId}`}
          >
            <Bookmark className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-500" />
          </button>
        )}
        <button
          className="tab-close"
          onClick={(e) => onClose(tab.tabId, e)}
          data-testid={`close-tab-${tab.tabId}`}
          aria-label={`Close ${tab.customName || tab.name}`}
          title="Close tab"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {showContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
            zIndex: 1000
          }}
          data-testid={`context-menu-${tab.tabId}`}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              setEditName(tab.customName || tab.name);
              setIsEditing(true);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-rename"
          >
            Rename Tab
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onDuplicate(tab.tabId);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-duplicate"
          >
            Duplicate Tab
          </button>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={() => {
              onClose(tab.tabId);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close"
          >
            Close
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onCloseOthers(tab.tabId);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close-others"
          >
            Close Others
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onCloseToRight(tab.tabId);
              setShowContextMenu(false);
            }}
            data-testid="context-menu-close-right"
          >
            Close to the Right
          </button>
        </div>
      )}
    </>
  );
});

export default TabItem;
