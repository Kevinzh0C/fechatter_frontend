/**
 * Simple YAML Parser for basic configuration
 * Extracted from yamlConfigLoader for modularity
 */

export function parseSimpleYAML(text) {
  const lines = text.split('\n');
  const result = {};
  let currentObj = result;
  const stack = [result];
  
  for (let line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) continue;
    
    // Calculate indentation level
    const indent = line.length - line.trimStart().length;
    const indentLevel = Math.floor(indent / 2);
    
    // Adjust stack based on indentation
    while (stack.length > indentLevel + 1) {
      stack.pop();
    }
    currentObj = stack[stack.length - 1];
    
    line = line.trim();
    
    if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (value) {
        // Parse value
        let parsedValue = value;
        if (value.startsWith('"') && value.endsWith('"')) {
          parsedValue = value.slice(1, -1);
        } else if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (!isNaN(value) && value !== '') {
          parsedValue = Number(value);
        }
        
        currentObj[key.trim()] = parsedValue;
      } else {
        // This is a parent key
        currentObj[key.trim()] = {};
        stack.push(currentObj[key.trim()]);
      }
    } else if (line.startsWith('- ')) {
      // Array item
      const lastKey = Object.keys(currentObj).pop();
      if (!Array.isArray(currentObj[lastKey])) {
        currentObj[lastKey] = [];
      }
      const value = line.substring(2).trim();
      let parsedValue = value;
      if (value.startsWith('"') && value.endsWith('"')) {
        parsedValue = value.slice(1, -1);
      }
      currentObj[lastKey].push(parsedValue);
    }
  }
  
  return result;
} 