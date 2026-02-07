import React from 'react';
import { Star, Crown, Lock } from 'lucide-react';

const ToolPaneItem = React.memo(({ tool, onOpen, isFavorite, onToggleFavorite, isPremium, isLocked }) => {
  const Icon = tool.icon;

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(tool.id);
  };

  return (
    <button
      className={`pane-item ${isLocked ? 'opacity-75' : ''} relative group`}
      data-category={tool.category}
      onClick={() => onOpen(tool)}
      data-testid={`tool-pane-item-${tool.id}`}
      title={tool.description || tool.name}
    >
      <div className="pane-item-icon">
        <Icon className="w-6 h-6" />
      </div>
      <div className="pane-item-content">
        <div className="pane-item-name flex items-center justify-center gap-1">
          <span>{tool.name}</span>
          {isPremium && (
            <Crown className="w-3 h-3 text-amber-500" />
          )}
          {isLocked && (
            <Lock className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </div>
      <button
        onClick={handleFavoriteClick}
        className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors z-10"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        data-testid={`favorite-btn-${tool.id}`}
      >
        <Star
          className={`w-3.5 h-3.5 transition-all ${
            isFavorite
              ? 'text-amber-500'
              : 'text-gray-400 group-hover:text-amber-400'
          }`}
          fill={isFavorite ? 'currentColor' : 'none'}
        />
      </button>
    </button>
  );
});

export default ToolPaneItem;
