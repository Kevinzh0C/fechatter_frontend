# Shiki Syntax Highlighting Integration Guide

This guide explains how to integrate the build-time Shiki syntax highlighting into your Vue project.

## Overview

The Shiki integration provides:
- **Build-time syntax highlighting** with zero runtime JavaScript
- **VSCode themes** (One Dark Pro for dark mode, Vitesse Light for light mode)
- **Line numbers and line highlighting**
- **Language detection and aliasing**
- **Code block metadata parsing** (title, highlight lines, etc.)
- **Caching for optimal performance**

## Installation

Shiki is already included in your `package.json`. The integration consists of:

1. **`/src/plugins/shiki.js`** - Core Shiki configuration and highlighter
2. **`/src/utils/codeHighlight.js`** - Utility functions for highlighting
3. **`/vite-plugin-shiki.js`** - Vite plugin for build-time processing
4. **`/src/workers/markdown-shiki.worker.js`** - WebWorker with Shiki support
5. **`/src/composables/useShikiMarkdown.js`** - Vue composable for integration

## Basic Usage

### 1. In Vue Components

```vue
<template>
  <ShikiMarkdownMessage 
    :content="messageContent" 
    :theme="darkMode ? 'dark' : 'light'"
    :line-numbers="true"
  />
</template>

<script setup>
import ShikiMarkdownMessage from '@/components/chat/ShikiMarkdownMessage.vue';
import { ref } from 'vue';

const messageContent = ref(`
\`\`\`javascript {2,4-6} title="example.js"
// This is a highlighted code block
const greeting = 'Hello, World!';
console.log(greeting);

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`
`);
</script>
```

### 2. Direct Code Highlighting

```javascript
import { highlightSingleCodeBlock } from '@/utils/codeHighlight.js';

// Highlight a single code block
const html = await highlightSingleCodeBlock(
  code,
  'javascript',
  '{1,3-5} title="example.js"',
  { theme: 'dark', lineNumbers: true }
);
```

### 3. Process Markdown with Highlighting

```javascript
import { processMarkdownWithHighlight } from '@/utils/codeHighlight.js';

const markdown = `
# My Document

Here's some code:

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`
`;

const html = await processMarkdownWithHighlight(markdown, {
  theme: 'dark',
  lineNumbers: true
});
```

## Code Block Metadata

Code blocks support metadata in the opening fence:

````markdown
```language {highlightLines} title="filename" no-line-numbers start=10
code here
```
````

Examples:
- `{1,3-5}` - Highlight lines 1, 3, 4, and 5
- `title="app.js"` - Add a title to the code block
- `no-line-numbers` - Disable line numbers for this block
- `start=10` - Start line numbering at 10

## Integration with Existing Components

### Update MessageItem Component

To add Shiki highlighting to your existing message components:

```vue
<script setup>
// In MessageItem.vue or similar
import { ref, computed, watch } from 'vue';
import { highlightMarkdownCode } from '@/utils/codeHighlight.js';

const props = defineProps({
  message: Object,
  theme: String
});

const processedContent = ref('');

watch(() => props.message.content, async (content) => {
  if (content && content.includes('```')) {
    // Process with Shiki if code blocks are detected
    processedContent.value = await highlightMarkdownCode(content, {
      theme: props.theme || 'dark'
    });
  } else {
    processedContent.value = content;
  }
}, { immediate: true });
</script>

<template>
  <div v-html="processedContent" class="message-content"></div>
</template>
```

### Using the Composable

For more complex integrations:

```javascript
import { useShikiMarkdown } from '@/composables/useShikiMarkdown.js';

export default {
  setup() {
    const { render, isHighlighting, setTheme } = useShikiMarkdown({
      theme: 'dark',
      lineNumbers: true,
      useWorker: true
    });

    // Render markdown with Shiki
    render('message-1', markdownContent);

    // Change theme dynamically
    setTheme('light');

    return { isHighlighting };
  }
};
```

## Build-Time Optimization

The Vite plugin processes code blocks at build time:

1. Add to `vite.config.js`:
```javascript
import viteShikiPlugin from './vite-plugin-shiki.js';

export default {
  plugins: [
    vue(),
    viteShikiPlugin({
      theme: 'dark',
      lineNumbers: true
    })
  ]
};
```

2. The plugin will:
   - Process `.md` and `.markdown` files
   - Detect code blocks in `.vue` templates
   - Generate static highlighted HTML
   - Emit CSS for syntax highlighting

## Styling

The integration generates CSS automatically. You can customize styles:

```css
/* Override code block styles */
.code-block-wrapper {
  margin: 1.5rem 0;
  border-radius: 0.75rem;
}

.code-title {
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
}

/* Line highlighting */
.line-content.highlighted {
  background-color: rgba(255, 255, 255, 0.15);
}

/* Dark mode adjustments */
.dark .code-block-wrapper {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
```

## Performance Considerations

1. **Caching**: All highlighted code is cached to avoid re-processing
2. **Lazy Loading**: Language grammars are loaded on-demand
3. **Worker Support**: Use WebWorker for non-blocking highlighting
4. **Build-Time Processing**: Static content is highlighted during build

## Language Support

Common languages are bundled by default:
- JavaScript/TypeScript (including JSX/TSX)
- Vue, HTML, CSS/SCSS
- Python, Rust, Go, Java, C/C++
- JSON, YAML, TOML, XML
- Bash/Shell scripts
- SQL, Markdown

Additional languages can be added by modifying the `commonLanguages` array in `/src/plugins/shiki.js`.

## Troubleshooting

### Code blocks not highlighting
- Check that the language is supported
- Verify the code block syntax is correct
- Look for errors in the console

### Performance issues
- Enable caching: `cache: true`
- Use the WebWorker: `useWorker: true`
- Consider build-time processing for static content

### Theme not switching
- Call `setTheme()` after theme change
- Ensure styles are being updated
- Check for CSS specificity conflicts

## Examples

See `/src/components/demo/ShikiDemo.vue` for a complete working example with:
- Multiple language examples
- Theme switching
- Live code editor
- Performance metrics