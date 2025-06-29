/**
 * 🚀 BACKEND-ALIGNED FILE SERVICE
 * Based on Rust backend analysis:
 * - Upload: POST /files/single (multipart/form-data, requires auth)
 * - Download: GET /files/download/{file_id} (requires auth)  
 * - Static: /files/{workspace_id}/{hash_path} (no auth, served by nginx)
 */

import api from './api.js';
import { buildStaticFileUrl, buildAuthFileUrl } from '../utils/fileUrlHandler.js';

export class ProductionFileService {
  constructor() {
    this.config = {
      uploadEndpoint: '/files/single',
      downloadEndpoint: '/files/download',
      staticPrefix: '/files',
      maxFileSize: 2 * 1024 * 1024, // 2MB - matches backend max_upload_size
      timeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  /**
   * 🎯 BACKEND ALIGNED: Upload file using exact backend format
   * Backend expects: multipart::Multipart with "file" field
   * Response: ApiResponse<UploadResponse>
   */
  async uploadFile(file, onProgress) {
    console.log('📤 [FileService] Backend-aligned upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    if (file.size === 0) {
      throw new Error('File is empty - backend will reject');
    }

    if (file.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${this._formatFileSize(file.size)} (max: ${this._formatFileSize(this.config.maxFileSize)})`);
    }

    // Create FormData exactly as backend expects
    const formData = new FormData();
    formData.append('file', file); // Backend: field.file_name().unwrap_or("unknown")

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`📤 [FileService] Upload attempt ${attempt}/${this.config.retryAttempts}`);

        const response = await api.post(this.config.uploadEndpoint, formData, {
          timeout: this.config.timeout,
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        });

        // Parse backend response: ApiResponse<UploadResponse>
        const uploadResult = this._parseBackendUploadResponse(response.data, file);
        
        console.log('✅ [FileService] Upload successful:', uploadResult);
        return uploadResult;

      } catch (error) {
        console.error(`❌ [FileService] Upload attempt ${attempt} failed:`, error);

        if (attempt === this.config.retryAttempts) {
          throw this._parseBackendError(error, file);
        }

        // Exponential backoff
        await this._delay(this.config.retryDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * 🎯 BACKEND ALIGNED: Download file using authenticated endpoint
   * Backend: GET /files/download/{file_id} where file_id = hash.extension
   */
  async downloadFile(fileId, options = {}) {
    console.log('📥 [FileService] Backend-aligned download:', fileId);

    // Validate file_id format (hash.extension)
    if (!this._isValidFileId(fileId)) {
      throw new Error(`Invalid file ID format: ${fileId} (expected: hash.extension)`);
    }

    try {
      const response = await api.get(`${this.config.downloadEndpoint}/${fileId}`, {
        responseType: 'blob',
        timeout: this.config.timeout
      });

      // Extract headers as backend sets them
      const filename = this._extractFilenameFromHeaders(response.headers, fileId);
      const mimeType = response.headers['content-type'] || 'application/octet-stream';
      const size = parseInt(response.headers['content-length'] || '0');

      console.log('✅ [FileService] Download successful:', { filename, mimeType, size });

      return {
        blob: response.data,
        filename,
        mimeType,
        size,
        url: URL.createObjectURL(response.data)
      };

    } catch (error) {
      console.error('❌ [FileService] Download failed:', error);
      throw this._parseBackendError(error, { fileId });
    }
  }

  /**
   * 🎯 BACKEND ALIGNED: Build file URLs matching backend storage structure
   * Backend creates: symlinks in root + hash directory structure
   * Static access: /files/{workspace_id}/{hash_path} (no auth)
   * Auth access: /files/download/{file_id} (with auth)
   */
  buildFileUrl(fileId, options = {}) {
    const { useStatic = true, workspaceId = 2 } = options;

    if (!this._isValidFileId(fileId)) {
      console.error('❌ [FileService] Invalid file ID for URL building:', fileId);
      return null;
    }

    if (useStatic) {
      // Use the unified handler for static URLs
      return buildStaticFileUrl(fileId, workspaceId);
    } else {
      // Use the unified handler for authenticated URLs
      return buildAuthFileUrl(fileId);
    }
  }

  

  /**
   * 🔧 BACKEND ALIGNED: Parse UploadResponse from ApiResponse<UploadResponse>
   */
  _parseBackendUploadResponse(responseData, originalFile) {
    try {
      let uploadData;

      if (responseData.success && responseData.data) {
        // Standard ApiResponse format
        uploadData = responseData.data;
      } else if (responseData.id && responseData.url) {
        // Direct UploadResponse format
        uploadData = responseData;
      } else {
        throw new Error('Unexpected response format from backend');
      }

      // Map UploadResponse fields exactly as backend returns
      return {
        id: uploadData.id,                    // Backend: file_url.clone()
        filename: uploadData.filename,        // Backend: filename.clone()
        url: uploadData.url,                 // Backend: file_url.clone()
        mime_type: uploadData.mime_type,     // Backend: mime_guess result
        size: uploadData.size,               // Backend: file_size
        created_at: uploadData.created_at    // Backend: chrono::Utc::now().to_rfc3339()
      };

    } catch (error) {
      console.error('❌ [FileService] Response parsing failed:', error);
      throw new Error(`Failed to parse backend response: ${error.message}`);
    }
  }

  /**
   * 🔧 BACKEND ALIGNED: Error handling matching backend AppError types
   */
  _parseBackendError(error, context) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          // Backend: AppError::BadRequest
          return new Error(data.error?.message || 'Bad request - file validation failed');
        case 401:
          // Backend: Authentication required
          return new Error('Authentication required for file operation');
        case 404:
          // Backend: AppError::NotFound
          return new Error(data.error?.message || `File not found: ${context.fileId || context.name}`);
        case 413:
          // Backend: File too large
          return new Error(`File too large (max: ${this._formatFileSize(this.config.maxFileSize)})`);
        case 500:
          // Backend: AppError::ChatFileError
          return new Error(data.error?.message || 'Server error during file operation');
        default:
          return new Error(`File operation failed with status ${status}`);
      }
    }

    if (error.code === 'ECONNABORTED') {
      return new Error('File operation timeout');
    }

    return new Error(`File operation failed: ${error.message}`);
  }

  /**
   * 🔧 Validate file_id format (hash.extension)
   */
  _isValidFileId(fileId) {
    if (!fileId || typeof fileId !== 'string') return false;
    
    const parts = fileId.split('.');
    if (parts.length !== 2) return false;
    
    const hash = parts[0];
    const extension = parts[1];
    
    return hash.length >= 6 && extension.length >= 1;
  }

  /**
   * 🔧 Extract filename from response headers
   */
  _extractFilenameFromHeaders(headers, fallbackFileId) {
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        return filenameMatch[1];
      }
    }
    return fallbackFileId;
  }

  /**
   * 🔧 Format file size for display
   */
  _formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 🔧 Delay utility for retry logic
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new ProductionFileService(); 