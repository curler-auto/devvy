import React, { Suspense } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getToolComponent } from '@/tools';

/**
 * Tool Wrapper Component
 * Dynamically loads and renders tool components
 * Handles errors and missing tools gracefully
 */
function ToolWrapper({ toolId, tab, tabs, setTabs, editorTheme }) {
  // Get the tool component from registry
  const ToolComponent = getToolComponent(toolId);

  // Handle tool not found
  if (!ToolComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Tool Not Found</h3>
        <p className="text-sm text-gray-400 mb-4">
          The tool "{toolId}" is not available or hasn't been implemented yet.
        </p>
        <p className="text-xs text-gray-500">
          Check the tool registry in <code>src/tools/index.js</code>
        </p>
      </div>
    );
  }

  // Render the tool component with all necessary props
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
        <p>Loading tool...</p>
      </div>
    }>
      <ToolComponent
        toolId={toolId}
        tab={tab}
        tabs={tabs}
        setTabs={setTabs}
        editorTheme={editorTheme}
      />
    </Suspense>
  );
}

export default ToolWrapper;
