/**
 * JSON Diff Utility
 * Deep structural comparison of JSON objects
 */

/**
 * Deep compare two JSON objects and return detailed differences
 * @param {any} left - Left object
 * @param {any} right - Right object
 * @param {string} path - Current path in the object tree
 * @returns {Object} - Diff result with added, removed, modified keys
 */
export const deepCompare = (left, right, path = '$') => {
  const diff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  // Handle null/undefined cases
  if (left === null && right === null) {
    diff.unchanged.push({ path, value: null });
    return diff;
  }
  
  if (left === undefined && right === undefined) {
    diff.unchanged.push({ path, value: undefined });
    return diff;
  }

  if (left === null || left === undefined) {
    diff.added.push({ path, leftValue: left, rightValue: right });
    return diff;
  }

  if (right === null || right === undefined) {
    diff.removed.push({ path, leftValue: left, rightValue: right });
    return diff;
  }

  // Get types
  const leftType = Array.isArray(left) ? 'array' : typeof left;
  const rightType = Array.isArray(right) ? 'array' : typeof right;

  // Type mismatch
  if (leftType !== rightType) {
    diff.modified.push({ 
      path, 
      leftValue: left, 
      rightValue: right,
      leftType,
      rightType 
    });
    return diff;
  }

  // Primitive types
  if (leftType !== 'object' && leftType !== 'array') {
    if (left === right) {
      diff.unchanged.push({ path, value: left });
    } else {
      diff.modified.push({ path, leftValue: left, rightValue: right });
    }
    return diff;
  }

  // Arrays
  if (leftType === 'array') {
    const maxLen = Math.max(left.length, right.length);
    
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      
      if (i >= left.length) {
        diff.added.push({ path: itemPath, leftValue: undefined, rightValue: right[i] });
      } else if (i >= right.length) {
        diff.removed.push({ path: itemPath, leftValue: left[i], rightValue: undefined });
      } else {
        const itemDiff = deepCompare(left[i], right[i], itemPath);
        diff.added.push(...itemDiff.added);
        diff.removed.push(...itemDiff.removed);
        diff.modified.push(...itemDiff.modified);
        diff.unchanged.push(...itemDiff.unchanged);
      }
    }
    
    return diff;
  }

  // Objects
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  const allKeys = new Set([...leftKeys, ...rightKeys]);

  for (const key of allKeys) {
    const keyPath = path === '$' ? `$.${key}` : `${path}.${key}`;
    
    if (!(key in left)) {
      diff.added.push({ path: keyPath, leftValue: undefined, rightValue: right[key] });
    } else if (!(key in right)) {
      diff.removed.push({ path: keyPath, leftValue: left[key], rightValue: undefined });
    } else {
      const valueDiff = deepCompare(left[key], right[key], keyPath);
      diff.added.push(...valueDiff.added);
      diff.removed.push(...valueDiff.removed);
      diff.modified.push(...valueDiff.modified);
      diff.unchanged.push(...valueDiff.unchanged);
    }
  }

  return diff;
};

/**
 * Compare arrays ignoring order
 * @param {Array} left - Left array
 * @param {Array} right - Right array
 * @param {string} path - Current path
 * @returns {Object} - Diff result
 */
export const compareArraysOrderAgnostic = (left, right, path = '$') => {
  const diff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  if (!Array.isArray(left) || !Array.isArray(right)) {
    return deepCompare(left, right, path);
  }

  // Create copies to avoid mutation
  const leftCopy = [...left];
  const rightCopy = [...right];
  const matched = new Set();

  // Find matches
  for (let i = 0; i < leftCopy.length; i++) {
    let found = false;
    for (let j = 0; j < rightCopy.length; j++) {
      if (matched.has(j)) continue;
      
      if (JSON.stringify(leftCopy[i]) === JSON.stringify(rightCopy[j])) {
        matched.add(j);
        diff.unchanged.push({ 
          path: `${path}[${i}]`, 
          value: leftCopy[i] 
        });
        found = true;
        break;
      }
    }
    
    if (!found) {
      diff.removed.push({ 
        path: `${path}[${i}]`, 
        leftValue: leftCopy[i], 
        rightValue: undefined 
      });
    }
  }

  // Find added items
  for (let j = 0; j < rightCopy.length; j++) {
    if (!matched.has(j)) {
      diff.added.push({ 
        path: `${path}[${j}]`, 
        leftValue: undefined, 
        rightValue: rightCopy[j] 
      });
    }
  }

  return diff;
};

/**
 * Sort JSON object keys recursively
 * @param {any} obj - Object to sort
 * @returns {any} - Sorted object
 */
export const sortJSON = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortJSON(item));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortJSON(obj[key]);
  }

  return sorted;
};

/**
 * Sort arrays within JSON (for order-agnostic comparison)
 * @param {any} obj - Object to sort
 * @returns {any} - Object with sorted arrays
 */
export const sortArraysInJSON = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Sort array items by their JSON string representation
    const sorted = obj.map(item => sortArraysInJSON(item));
    return sorted.sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result = {};
  for (const key of Object.keys(obj)) {
    result[key] = sortArraysInJSON(obj[key]);
  }

  return result;
};

/**
 * Generate a summary of differences
 * @param {Object} diff - Diff result from deepCompare
 * @returns {Object} - Summary statistics
 */
export const getDiffSummary = (diff) => {
  return {
    totalChanges: diff.added.length + diff.removed.length + diff.modified.length,
    added: diff.added.length,
    removed: diff.removed.length,
    modified: diff.modified.length,
    unchanged: diff.unchanged.length,
    hasChanges: diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0,
  };
};

/**
 * Format diff for display
 * @param {Object} diff - Diff result
 * @returns {string} - Formatted diff report
 */
export const formatDiffReport = (diff) => {
  const lines = [];
  
  lines.push('=== JSON Comparison Report ===\n');
  
  const summary = getDiffSummary(diff);
  lines.push(`Total Changes: ${summary.totalChanges}`);
  lines.push(`  Added: ${summary.added}`);
  lines.push(`  Removed: ${summary.removed}`);
  lines.push(`  Modified: ${summary.modified}`);
  lines.push(`  Unchanged: ${summary.unchanged}\n`);
  
  if (diff.added.length > 0) {
    lines.push('\n--- ADDED ---');
    diff.added.forEach(item => {
      lines.push(`  ${item.path}`);
      lines.push(`    Value: ${JSON.stringify(item.rightValue)}`);
    });
  }
  
  if (diff.removed.length > 0) {
    lines.push('\n--- REMOVED ---');
    diff.removed.forEach(item => {
      lines.push(`  ${item.path}`);
      lines.push(`    Value: ${JSON.stringify(item.leftValue)}`);
    });
  }
  
  if (diff.modified.length > 0) {
    lines.push('\n--- MODIFIED ---');
    diff.modified.forEach(item => {
      lines.push(`  ${item.path}`);
      lines.push(`    Left:  ${JSON.stringify(item.leftValue)}`);
      lines.push(`    Right: ${JSON.stringify(item.rightValue)}`);
    });
  }
  
  return lines.join('\n');
};
