/**
 * 🎯 三级降级文件下载机制
 * 基于实际后端测试结果，提供可靠的文件下载体验
 * 
 * 降级策略:
 * Level 1: 静态文件直接访问 (验证可用: /files/{file_id})
 * Level 2: 认证API下载 (可能问题: /files/download/{file_id})  
 * Level 3: Workspace路径访问 (备用方案: /files/{workspace_id}/{hash_path})
 */

import { extractFileId, isValidFileId, buildHashPath } from './fileUrlHandler.js';
import { getApiBaseUrl } from './apiUrlResolver.js';

export class FileDownloadFallback {
  constructor() {
    this.downloadStats = {
      level1_success: 0,
      level2_success: 0, 
      level3_success: 0,
      total_failures: 0,
      success_rate: 0
    };
    
    this.currentAttempts = new Map(); // 跟踪正在进行的下载尝试
  }

  /**
   * 🎯 主要下载方法 - 自动进行三级降级
   */
  async downloadFile(file, options = {}) {
    const fileName = this.extractFileName(file);
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 [FileDownload] Starting 3-level fallback download for: ${fileName}`);
    console.log(`🔍 [FileDownload] Download ID: ${downloadId}`);
    
    // 跟踪当前下载尝试
    this.currentAttempts.set(downloadId, {
      fileName,
      startTime: Date.now(),
      currentLevel: 0,
      file: file
    });

    try {
      // Level 1: 静态文件直接访问 (优先级最高，验证可用)
      const level1Result = await this.tryLevel1Download(file, downloadId);
      if (level1Result.success) {
        this.recordSuccess(1, downloadId);
        return level1Result;
      }

      // Level 2: 认证API下载 (备用方案)
      const level2Result = await this.tryLevel2Download(file, downloadId);
      if (level2Result.success) {
        this.recordSuccess(2, downloadId);
        return level2Result;
      }

      // Level 3: Workspace路径访问 (最后尝试)
      const level3Result = await this.tryLevel3Download(file, downloadId);
      if (level3Result.success) {
        this.recordSuccess(3, downloadId);
        return level3Result;
      }

      // 所有方法都失败
      this.recordFailure(downloadId);
      throw new Error(`All 3 download methods failed for file: ${fileName}`);

    } catch (error) {
      this.recordFailure(downloadId);
      console.error(`❌ [FileDownload] Complete failure for ${fileName}:`, error);
      throw error;
    } finally {
      this.currentAttempts.delete(downloadId);
    }
  }

  /**
   * 🥇 Level 1: 静态文件直接访问 (验证可用)
   * 格式: /files/{file_id}
   * 优点: 无需认证，直接访问，速度快
   * 状态: curl验证100%可用
   */
  async tryLevel1Download(file, downloadId) {
    const attempt = this.currentAttempts.get(downloadId);
    attempt.currentLevel = 1;
    
    console.log(`🥇 [FileDownload] Level 1: Static file access for ${attempt.fileName}`);
    
    try {
      const fileId = extractFileId(file.url || file.file_url || file.id);
      if (!fileId) {
        throw new Error('No valid file ID found for static access');
      }

      const baseUrl = await getApiBaseUrl();
      const staticUrl = `${baseUrl}/files/${fileId}`;
      
      console.log(`🔗 [FileDownload] Level 1 URL: ${staticUrl}`);
      
      // 验证文件可访问性
      const headResponse = await fetch(staticUrl, {
        method: 'HEAD',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      if (!headResponse.ok) {
        throw new Error(`Static file not accessible: ${headResponse.status} ${headResponse.statusText}`);
      }

      // 执行下载
      const downloadResult = await this.executeDirectDownload(staticUrl, attempt.fileName);
      
      console.log(`✅ [FileDownload] Level 1 SUCCESS: ${attempt.fileName}`);
      return {
        success: true,
        level: 1,
        method: 'static_direct',
        url: staticUrl,
        result: downloadResult
      };

    } catch (error) {
      console.warn(`⚠️ [FileDownload] Level 1 FAILED: ${error.message}`);
      return { success: false, level: 1, error: error.message };
    }
  }

  /**
   * 🥈 Level 2: 认证API下载 (可能有问题但保留)
   * 格式: /files/download/{file_id} 
   * 优点: 支持访问控制，官方API
   * 状态: curl显示401，但可能token问题
   */
  async tryLevel2Download(file, downloadId) {
    const attempt = this.currentAttempts.get(downloadId);
    attempt.currentLevel = 2;
    
    console.log(`🥈 [FileDownload] Level 2: Authenticated API download for ${attempt.fileName}`);
    
    try {
      const fileId = extractFileId(file.url || file.file_url || file.id);
      if (!fileId) {
        throw new Error('No valid file ID found for authenticated download');
      }

      // 获取认证token
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const baseUrl = await getApiBaseUrl();
      const authUrl = `${baseUrl}/files/download/${fileId}`;
      
      console.log(`🔗 [FileDownload] Level 2 URL: ${authUrl}`);
      
      // 执行认证下载
      const response = await fetch(authUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`Auth download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadResult = await this.executeBlobDownload(blob, attempt.fileName, response.headers);
      
      console.log(`✅ [FileDownload] Level 2 SUCCESS: ${attempt.fileName}`);
      return {
        success: true,
        level: 2,
        method: 'authenticated_api',
        url: authUrl,
        result: downloadResult
      };

    } catch (error) {
      console.warn(`⚠️ [FileDownload] Level 2 FAILED: ${error.message}`);
      return { success: false, level: 2, error: error.message };
    }
  }

  /**
   * 🥉 Level 3: Workspace路径访问 (最后尝试)
   * 格式: /files/{workspace_id}/{hash_path}
   * 优点: 可能的备用访问方式
   * 状态: curl显示404，但可能配置问题
   */
  async tryLevel3Download(file, downloadId) {
    const attempt = this.currentAttempts.get(downloadId);
    attempt.currentLevel = 3;
    
    console.log(`🥉 [FileDownload] Level 3: Workspace path access for ${attempt.fileName}`);
    
    try {
      const fileId = extractFileId(file.url || file.file_url || file.id);
      if (!fileId) {
        throw new Error('No valid file ID found for workspace path access');
      }

      const workspaceId = this.getWorkspaceId(file);
      const hashPath = buildHashPath(fileId);
      
      const baseUrl = await getApiBaseUrl();
      const workspaceUrl = `${baseUrl}/files/${workspaceId}/${hashPath}`;
      
      console.log(`🔗 [FileDownload] Level 3 URL: ${workspaceUrl}`);
      
      // 尝试无认证访问
      let response = await fetch(workspaceUrl, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      // 如果失败，尝试带认证访问
      if (!response.ok) {
        const token = await this.getAuthToken();
        if (token) {
          response = await fetch(workspaceUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'ngrok-skip-browser-warning': 'true'
            }
          });
        }
      }

      if (!response.ok) {
        throw new Error(`Workspace path failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadResult = await this.executeBlobDownload(blob, attempt.fileName, response.headers);
      
      console.log(`✅ [FileDownload] Level 3 SUCCESS: ${attempt.fileName}`);
      return {
        success: true,
        level: 3,
        method: 'workspace_path',
        url: workspaceUrl,
        result: downloadResult
      };

    } catch (error) {
      console.warn(`⚠️ [FileDownload] Level 3 FAILED: ${error.message}`);
      return { success: false, level: 3, error: error.message };
    }
  }

  /**
   * 🔗 执行直接URL下载 (用于Level 1)
   */
  async executeDirectDownload(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank'; // 确保在新标签页中打开，避免页面跳转
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return {
      method: 'direct_link',
      fileName: fileName,
      url: url,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📦 执行Blob下载 (用于Level 2和3)
   */
  async executeBlobDownload(blob, fileName, headers = new Headers()) {
    // 尝试从headers中获取更好的文件名
    const contentDisposition = headers.get('content-disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        fileName = filenameMatch[1];
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 清理blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    
    return {
      method: 'blob_download',
      fileName: fileName,
      size: blob.size,
      type: blob.type,
      blobUrl: blobUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🔐 获取认证token
   */
  async getAuthToken() {
    try {
      // 尝试多种token来源
      const sources = [
        () => localStorage.getItem('auth_token'),
        () => localStorage.getItem('access_token'),
        () => sessionStorage.getItem('auth_token'),
        () => sessionStorage.getItem('access_token')
      ];

      for (const getToken of sources) {
        const token = getToken();
        if (token && token.length > 20) {
          // 验证JWT格式
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(atob(parts[1]));
              const now = Math.floor(Date.now() / 1000);
              if (!payload.exp || payload.exp > now) {
                return token;
              }
            } catch (e) {
              // JWT解析失败，跳过
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('🔐 [FileDownload] Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * 🏢 获取workspace ID
   */
  getWorkspaceId(file) {
    // 从多个来源尝试获取workspace ID
    if (file.workspace_id) return file.workspace_id;
    
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user.workspace_id) return user.workspace_id;
      }
    } catch (e) {
      // 忽略解析错误
    }
    
    // 默认值
    return 2;
  }

  /**
   * 📄 提取文件名
   */
  extractFileName(file) {
    return file.filename || file.file_name || file.name || 'download';
  }

  /**
   * 📊 记录成功下载
   */
  recordSuccess(level, downloadId) {
    const attempt = this.currentAttempts.get(downloadId);
    const duration = Date.now() - attempt.startTime;
    
    this.downloadStats[`level${level}_success`]++;
    this.updateSuccessRate();
    
    console.log(`📊 [FileDownload] SUCCESS at Level ${level}: ${attempt.fileName} (${duration}ms)`);
  }

  /**
   * 📊 记录下载失败
   */
  recordFailure(downloadId) {
    const attempt = this.currentAttempts.get(downloadId);
    const duration = Date.now() - attempt.startTime;
    
    this.downloadStats.total_failures++;
    this.updateSuccessRate();
    
    console.log(`📊 [FileDownload] TOTAL FAILURE: ${attempt.fileName} (${duration}ms)`);
  }

  /**
   * 📊 更新成功率
   */
  updateSuccessRate() {
    const totalAttempts = this.downloadStats.level1_success + 
                         this.downloadStats.level2_success + 
                         this.downloadStats.level3_success + 
                         this.downloadStats.total_failures;
    
    if (totalAttempts > 0) {
      const totalSuccesses = this.downloadStats.level1_success + 
                            this.downloadStats.level2_success + 
                            this.downloadStats.level3_success;
      this.downloadStats.success_rate = (totalSuccesses / totalAttempts * 100).toFixed(1);
    }
  }

  /**
   * 📊 获取下载统计信息
   */
  getStats() {
    return { ...this.downloadStats };
  }

  /**
   * 🔄 重置统计信息
   */
  resetStats() {
    this.downloadStats = {
      level1_success: 0,
      level2_success: 0,
      level3_success: 0,
      total_failures: 0,
      success_rate: 0
    };
  }
}

// 导出单例实例
export const fileDownloadFallback = new FileDownloadFallback();
export default fileDownloadFallback;