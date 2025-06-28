/**
 * TypeScript definitions for FileService
 * Ensures proper typing for backend-aligned file operations
 */

export interface UploadResult {
  id: string | number;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface FileUrlOptions {
  useStatic?: boolean;
  workspaceId?: number;
}

export declare class ProductionFileService {
  constructor();
  
  uploadFile(
    file: File, 
    onProgress?: ((progress: number) => void) | null | undefined
  ): Promise<UploadResult>;
  
  downloadFile(
    fileId: string, 
    options?: Record<string, any>
  ): Promise<DownloadResult>;
  
  buildFileUrl(
    fileId: string, 
    options?: FileUrlOptions
  ): string | null;
}

export declare const fileService: ProductionFileService;
export default fileService; 