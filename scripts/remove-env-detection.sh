#!/bin/bash

# Script to remove all environment detection mechanisms from the codebase
# This will make development the default and only mode

echo "🔧 Starting comprehensive environment detection removal..."

# Function to process files
process_files() {
    find src -name "*.js" -o -name "*.ts" -o -name "*.vue" | while read file; do
        echo "Processing: $file"
        
        # Remove import.meta.env.DEV conditional blocks
        # Replace 'if (import.meta.env.DEV) { ... }' with just the content
        perl -i -pe 's/if\s*\(\s*import\.meta\.env\.DEV\s*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/\1/gs' "$file"
        
        # Remove import.meta.env.PROD conditional blocks entirely
        perl -i -pe 's/if\s*\(\s*import\.meta\.env\.PROD[^}]*\}//gs' "$file"
        
        # Replace environment variable checks with simplified versions
        sed -i '' 's/import\.meta\.env\.DEV/true/g' "$file"
        sed -i '' 's/import\.meta\.env\.PROD/false/g' "$file"
        sed -i '' 's/import\.meta\.env\.MODE/'"'"'development'"'"'/g' "$file"
        
        # Remove VITE_ environment variables and replace with defaults
        sed -i '' 's/import\.meta\.env\.VITE_DEBUG === '"'"'true'"'"'/true/g' "$file"
        sed -i '' 's/import\.meta\.env\.VITE_API_BASE_URL || '"'"'\/api'"'"'/'"'"'\/api'"'"'/g' "$file"
        sed -i '' 's/import\.meta\.env\.VITE_SSE_URL || '"'"'\/events'"'"'/'"'"'\/events'"'"'/g' "$file"
        sed -i '' 's/import\.meta\.env\.VITE_FILE_BASE_URL || '"'"'\/files'"'"'/'"'"'\/files'"'"'/g' "$file"
        
        # Replace complex environment checks with simple booleans
        sed -i '' 's/process\.env\.NODE_ENV === '"'"'development'"'"'/true/g' "$file"
        sed -i '' 's/process\.env\.NODE_ENV === '"'"'production'"'"'/false/g' "$file"
        sed -i '' 's/process\.env\.NODE_ENV !== '"'"'production'"'"'/true/g' "$file"
        
        # Remove complex environment detection patterns
        sed -i '' 's/typeof window !== '"'"'undefined'"'"' && import\.meta\.env\.DEV/true/g' "$file"
        
    done
}

# Process all files
process_files

echo "🔧 Cleaning up specific utility files..."

# Special handling for specific files that might have complex patterns
if [ -f "src/utils/performanceMonitor.js" ]; then
    sed -i '' 's/this\.enabled = process\.env\.NODE_ENV === '"'"'development'"'"'/this.enabled = true/g' src/utils/performanceMonitor.js
fi

if [ -f "src/utils/errorHandler.js" ]; then
    sed -i '' 's/if (log && process\.env\.NODE_ENV !== '"'"'production'"'"')/if (log)/g' src/utils/errorHandler.js
    sed -i '' 's/if (process\.env\.NODE_ENV !== '"'"'production'"'"')/if (true)/g' src/utils/errorHandler.js
fi

# Remove any remaining complex environment patterns
find src -name "*.js" -o -name "*.ts" -o -name "*.vue" -exec sed -i '' 's/import\.meta\.env\.[A-Z_]*[^a-zA-Z0-9_]/'"'"'development'"'"'/g' {} \;

echo "✅ Environment detection removal complete!"

# Count remaining instances
remaining=$(find src -name "*.js" -o -name "*.ts" -o -name "*.vue" | xargs grep -l "import\.meta\.env" | wc -l | tr -d ' ')
echo "📊 Files still containing import.meta.env: $remaining"

if [ "$remaining" -gt 0 ]; then
    echo "📋 Remaining files with environment detection:"
    find src -name "*.js" -o -name "*.ts" -o -name "*.vue" | xargs grep -l "import\.meta\.env" | head -10
fi 