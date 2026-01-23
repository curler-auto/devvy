import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * ToolHeader Component
 * Reusable header for tools with favorite toggle functionality
 * 
 * @param {string} toolId - The ID of the tool
 * @param {string} toolName - Display name of the tool
 * @param {React.ReactNode} children - Additional header content (buttons, etc.)
 */
function ToolHeader({ toolId, toolName, children }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorite status on mount and when favorites change
  useEffect(() => {
    loadFavoriteStatus();
    
    // Listen for favorites changes from other components
    const handleFavoritesChanged = () => {
      loadFavoriteStatus();
    };
    
    window.addEventListener('favoritesChanged', handleFavoritesChanged);
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged);
    };
  }, [toolId]);

  const loadFavoriteStatus = async () => {
    try {
      const response = await axios.get(`${API}/favorites/list`);
      const favorites = response.data.favorites || [];
      const isFav = favorites.includes(toolId);
      console.log(`ToolHeader: Loading favorite status for ${toolId}:`, isFav, 'All favorites:', favorites);
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Failed to load favorite status:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log(`ToolHeader: Toggling favorite for ${toolId}, current state:`, isFavorite);
      
      if (isFavorite) {
        await axios.post(`${API}/favorites/remove`, { tool_id: toolId });
        setIsFavorite(false);
        console.log(`ToolHeader: Removed ${toolId} from favorites`);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites/add`, { tool_id: toolId });
        setIsFavorite(true);
        console.log(`ToolHeader: Added ${toolId} to favorites`);
        toast.success('Added to favorites');
      }
      
      // Dispatch custom event to notify App.js to reload favorites
      console.log('ToolHeader: Dispatching favoritesChanged event');
      window.dispatchEvent(new CustomEvent('favoritesChanged'));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorites');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {toolName}
        </h2>
        <button
          onClick={toggleFavorite}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          data-testid={`tool-header-favorite-${toolId}`}
        >
          <Star
            className={`w-5 h-5 transition-all ${
              isFavorite
                ? 'text-amber-500'
                : 'text-gray-400 hover:text-amber-400'
            }`}
            fill={isFavorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default ToolHeader;
