/**
 * 🎯 UNIFIED FILE URL HANDLER
 * Based on backend storage structure analysis:
 * - Static files: /files/{workspace_id}/{hash_path} (no auth, nginx served)
 * - Auth download: /api/files/download/{file_id} (with auth)
 * - Upload endpoint: /api/files/single (with auth)
 */

/**
 * Extract file ID from various URL formats
 * Handles both static URLs and auth URLs
 */
export function extractFileId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Handle auth download URLs: /api/files/download/{file_id}
  const authMatch = url.match(/\/api\/files\/download\/([^\/\?]+)/);
  if (authMatch) {
    return authMatch[1];
  }
  
  // Handle static URLs: /api/files/{workspace_id}/{hash_path} or /files/{workspace_id}/{hash_path}
  const staticMatch = url.match(/\/(?:api\/)?files\/\d+\/(.+)$/);
  if (staticMatch) {
    const hashPath = staticMatch[1];
    return convertHashPathToFileId(hashPath);
  }
  
  // Handle direct URLs like "/files/filename.ext" - extract just the filename
  const directFileMatch = url.match(/\/files\/([^\/\?]+)$/);
  if (directFileMatch) {
    const filename = directFileMatch[1];
    if (isValidFileId(filename)) {
      return filename;
    }
  }
  
  // Handle direct file URLs (already file_id format)
  const fileIdMatch = url.match(/([a-f0-9]{6,})\.[a-zA-Z0-9]+$/);
  if (fileIdMatch) {
    return fileIdMatch[0];
  }
  
  return null;
}

/**
 * Convert hash path back to file_id
 * Example: "60c/155/60c155658fcb1ef14145b5c9e359a571c504b8e1a7449d9965f720d3c1eebb68.png" -> "60c155658fcb1ef14145b5c9e359a571c504b8e1a7449d9965f720d3c1eebb68.png"
 */
function convertHashPathToFileId(hashPath) {
  const parts = hashPath.split('/');
  if (parts.length === 3) {
    // parts[2] is the full filename which is what we want
    return parts[2];
  }
  return hashPath;
}

/**
 * Build hash path from file_id
 * Example: "60c155658fcb1ef14145b5c9e359a571c504b8e1a7449d9965f720d3c1eebb68.png" -> "60c/155/60c155658fcb1ef14145b5c9e359a571c504b8e1a7449d9965f720d3c1eebb68.png"
 * Backend uses hash-split directory structure for performance
 */
function buildHashPath(fileId) {
  if (!fileId || typeof fileId !== 'string') return fileId;
  
  // Extract hash and extension
  const parts = fileId.split('.');
  if (parts.length !== 2) return fileId;
  
  const hash = parts[0];
  const extension = parts[1];
  
  // Must have at least 6 characters to split into directories
  if (hash.length < 6) return fileId;
  
  // Split hash into directory structure: first 3 chars / next 3 chars / full filename
  const dir1 = hash.substring(0, 3);
  const dir2 = hash.substring(3, 6);
  
  return `${dir1}/${dir2}/${fileId}`;
}

/**
 * Build static file URL (no authentication required)
 * Uses backend API static file serving structure: /api/files/{workspace_id}/{hash_path}
 */
export function buildStaticFileUrl(fileId, workspaceId = 2) {
  if (!fileId) return null;
  
  const hashPath = buildHashPath(fileId);
  return `/api/files/${workspaceId}/${hashPath}`;
}

/**
 * Build authenticated download URL
 * Requires user authentication
 */
export function buildAuthFileUrl(fileId) {
  if (!fileId) return null;
  
  return `/api/files/download/${fileId}`;
}

/**
 * Get the best file URL based on context
 * Prefers static URLs for better performance
 */
export function getStandardFileUrl(file, options = {}) {
  const { 
    preferAuth = false, 
    workspaceId = 2,
    fallbackToAuth = true 
  } = options;
  
  // Handle null/undefined input
  if (!file) {
    console.warn('❌ [fileUrlHandler] No file object provided');
    return null;
  }
  
  // Extract file_id from various sources with enhanced fallback
  let fileId = null;
  
  // Priority 1: Direct ID field (if it's a valid file_id format)
  if (file.id && typeof file.id === 'string' && isValidFileId(file.id)) {
    fileId = file.id;
  }
  
  // Priority 2: Extract from URL fields
  if (!fileId && file.url) {
    fileId = extractFileId(file.url);
  }
  if (!fileId && file.file_url) {
    fileId = extractFileId(file.file_url);
  }
  
  // Priority 3: Check filename fields for file_id format
  if (!fileId) {
    const filenameFields = [file.filename, file.file_name, file.name];
    for (const filename of filenameFields) {
      if (filename && typeof filename === 'string' && isValidFileId(filename)) {
        fileId = filename;
        break;
      }
    }
  }
  
  // Priority 4: Handle test/mock data gracefully
  if (!fileId) {
    // Check if this looks like test data
    const filename = file.filename || file.file_name || file.name || file.url;
    if (filename && typeof filename === 'string') {
      // For test files like 'test-file.txt', skip URL generation
      if (filename.startsWith('test-') || filename === filename.toLowerCase() && !filename.includes('/')) {
        console.warn('⚠️ [fileUrlHandler] Detected test/mock file, skipping URL generation:', filename);
        return null;
      }
      
      // Try to extract file_id pattern from anywhere in the string
      const hashMatch = filename.match(/([a-f0-9]{32,})\.[a-zA-Z0-9]+/);
      if (hashMatch) {
        fileId = hashMatch[0];
      }
    }
  }
  
  if (!fileId) {
    console.warn('❌ [fileUrlHandler] No valid file ID found:', {
      file,
      checkedFields: {
        id: file.id,
        url: file.url,
        file_url: file.file_url,
        filename: file.filename,
        file_name: file.file_name,
        name: file.name
      }
    });
    return null;
  }
  
  // Return preferred URL type
  if (preferAuth) {
    return buildAuthFileUrl(fileId);
  } else {
    const staticUrl = buildStaticFileUrl(fileId, workspaceId);
    if (fallbackToAuth && !staticUrl) {
      return buildAuthFileUrl(fileId);
    }
    return staticUrl;
  }
}

/**
 * Validate if a string is a valid file_id format
 */
export function isValidFileId(fileId) {
  if (!fileId || typeof fileId !== 'string') return false;
  
  const parts = fileId.split('.');
  if (parts.length !== 2) return false;
  
  const hash = parts[0];
  const extension = parts[1];
  
  return hash.length >= 6 && extension.length >= 1;
}

/**
 * Get file extension from file_id or filename
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop().toUpperCase();
  }
  
  return '';
}

/**
 * Check if file is an image based on filename or mime type
 */
export function isImageFile(file) {
  if (file.mime_type || file.type) {
    const mimeType = file.mime_type || file.type;
    if (mimeType.startsWith('image/')) return true;
  }
  
  const filename = file.filename || file.file_name || file.name || '';
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|heif)$/i.test(filename);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Legacy compatibility function
 * @deprecated Use getStandardFileUrl instead
 */
export function getCorrectFileUrl(file, workspaceId = 2) {
  return getStandardFileUrl(file, { workspaceId });
}

/**
 * Legacy compatibility function for authenticated downloads
 * @deprecated Use buildAuthFileUrl instead
 */
export function getAuthenticatedDownloadUrl(fileInput, options = {}) {
  const { workspaceId = 2 } = options;
  
  // Enhanced file ID extraction with multiple strategies
  let fileId = null;
  
  if (typeof fileInput === 'string') {
    fileId = extractFileId(fileInput);
  } else if (typeof fileInput === 'object' && fileInput !== null) {
    // Try multiple extraction strategies
    const candidates = [
      fileInput.id,
      fileInput.filename, 
      fileInput.file_name,
      fileInput.name,
      fileInput.url,
      fileInput.file_url
    ];
    
    for (const candidate of candidates) {
      if (candidate) {
        fileId = extractFileId(candidate);
        if (fileId && isValidFileId(fileId)) {
          break;
        }
        
        // Direct validation if the candidate itself looks like a file ID
        if (isValidFileId(candidate)) {
          fileId = candidate;
          break;
        }
      }
    }
  }
  
  if (fileId && isValidFileId(fileId)) {
    return buildAuthFileUrl(fileId);
  }
  
  return null;
}

/**
 * Legacy compatibility function for robust URL generation
 * @deprecated Use getStandardFileUrl with fallback options instead
 */
export function getRobustFileUrls(fileInput, options = {}) {
  console.log('🔍 [getRobustFileUrls] Input:', { fileInput, options });
  
  const staticUrl = getStandardFileUrl(fileInput, { ...options, preferAuth: false });
  const authUrl = getAuthenticatedDownloadUrl(fileInput, options);
  
  console.log('🔍 [getRobustFileUrls] Generated URLs:', { staticUrl, authUrl });
  
  // 🔧 PRIORITIZE AUTH URL: Since backend may not have static file serving configured
  return {
    primary: authUrl,    // Use auth URL as primary
    fallback: staticUrl, // Use static URL as fallback
    hasOptions: !!(staticUrl || authUrl)
  };
}

export default {
  extractFileId,
  buildStaticFileUrl,
  buildAuthFileUrl,
  getStandardFileUrl,
  isValidFileId,
  getFileExtension,
  isImageFile,
  formatFileSize,
  getCorrectFileUrl,
  getAuthenticatedDownloadUrl,
  getRobustFileUrls
};
