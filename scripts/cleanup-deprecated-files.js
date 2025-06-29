#!/usr/bin/env node

/**
 * 🧹 Fechatter Frontend 废弃文件清理工具
 * 系统地清理过时的备份文件、测试文件、临时文件等
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DeprecatedFileCleanup {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
    this.interactive = process.argv.includes('--interactive');
    
    this.deletedFiles = [];
    this.deletedDirs = [];
    this.errors = [];
    this.skippedFiles = [];
    
    console.log('🧹 Fechatter Frontend 废弃文件清理工具');
    console.log('====================================');
    if (this.dryRun) {
      console.log('🔍 DRY RUN 模式 - 不会实际删除文件');
    }
    console.log('');
  }

  /**
   * 🎯 定义需要清理的文件模式
   */
  getCleanupRules() {
    return {
      // 1. 备份文件
      backupFiles: {
        patterns: [
          '**/*.backup',
          '**/*.backup-*',
          'src/main.js.backup*',
          'vite.config.js.backup',
          'config/*.backup',
          'public/config/*.backup',
          'src/stores/*.backup',
          'src/components/**/*.backup',
          'src/utils/*.backup-*'
        ],
        description: '备份文件 (.backup)'
      },

      // 2. 临时测试文件
      testFiles: {
        patterns: [
          'test-*.html',
          'test-*.txt',
          'test-*.sh',
          'test-*.png',
          'test-*.js',
          // 保留重要的测试文件
          '!src/test/**/*',
          '!**/*.spec.js',
          '!**/*.test.js'
        ],
        description: '临时测试文件 (test-*)'
      },

      // 3. 废弃的样式文件
      deprecatedStyles: {
        patterns: [
          'src/styles/channel-list-variables.css',
          'src/styles/theme.css',
          'src/styles/conflicted-backup-*/**/*'
        ],
        description: '废弃的样式文件 (DEPRECATED)'
      },

      // 4. 临时日志和报告文件
      logFiles: {
        patterns: [
          'sse_report_*.json',
          'sse_server_*.json',
          'sse_server_*.log',
          'server-sse-monitor.sh',
          '*.log',
          '!node_modules/**/*.log'
        ],
        description: '临时日志文件'
      },

      // 5. 完成任务的文档
      completedDocs: {
        patterns: [
          'docs/*_COMPLETE.md',
          'docs/*_FIX_COMPLETE.md',
          'docs/*_SUMMARY.md',
          'docs/*_ANALYSIS.md',
          'docs/*_REPORT.md',
          'public/docs/*_COMPLETE.md',
          'public/docs/*_FIX_COMPLETE.md'
        ],
        description: '已完成任务的文档'
      },

      // 6. 临时配置和调试文件
      tempConfigs: {
        patterns: [
          'debug-*.html',
          'public/debug-*.html',
          'public/health-check.html',
          'public/quick-sse-test.sh',
          'username_fix_verification.sh',
          'test-login-performance.sh'
        ],
        description: '临时配置和调试文件'
      },

      // 7. 重复的配置文件 - 已移除，因为backup已经在第一类中
      // duplicateConfigs: {
      //   patterns: [
      //     'config/development.yml.backup',
      //     'public/config/development.yml.backup'
      //   ],
      //   description: '重复的配置文件'
      // }
    };
  }

  /**
   * 🔍 扫描并收集需要清理的文件
   */
  async scanFiles() {
    console.log('🔍 扫描废弃文件...\n');
    
    const rules = this.getCleanupRules();
    const filesToDelete = new Map();
    
    for (const [category, rule] of Object.entries(rules)) {
      console.log(`📂 扫描 ${rule.description}...`);
      
      try {
        // 使用 glob 模式查找文件
        const files = await this.findFiles(rule.patterns);
        
        if (files.length > 0) {
          filesToDelete.set(category, {
            files,
            description: rule.description
          });
          console.log(`   找到 ${files.length} 个文件`);
        } else {
          console.log(`   没有找到文件`);
        }
      } catch (error) {
        console.error(`   ❌ 扫描失败: ${error.message}`);
        this.errors.push(`扫描 ${category}: ${error.message}`);
      }
    }
    
    console.log('');
    return filesToDelete;
  }

  /**
   * 🔎 根据 glob 模式查找文件
   */
  async findFiles(patterns) {
    const { glob } = await import('glob');
    const allFiles = [];
    
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          absolute: false,
          ignore: ['node_modules/**', '.git/**', 'dist/**', '.vercel/**']
        });
        allFiles.push(...files);
      } catch (error) {
        if (this.verbose) {
          console.warn(`   ⚠️ Pattern "${pattern}" failed: ${error.message}`);
        }
      }
    }
    
    // 去重
    return [...new Set(allFiles)];
  }

  /**
   * 📋 显示清理预览
   */
  async showPreview(filesToDelete) {
    console.log('📋 清理预览:');
    console.log('============\n');
    
    let totalFiles = 0;
    
    for (const [category, data] of filesToDelete.entries()) {
      console.log(`📂 ${data.description}:`);
      
      if (data.files.length > 0) {
        totalFiles += data.files.length;
        
        if (data.files.length <= 10 || this.verbose) {
          // 显示所有文件
          data.files.forEach(file => {
            console.log(`   - ${file}`);
          });
        } else {
          // 只显示前几个和总数
          data.files.slice(0, 5).forEach(file => {
            console.log(`   - ${file}`);
          });
          console.log(`   ... 和另外 ${data.files.length - 5} 个文件`);
        }
      }
      
      console.log(`   总计: ${data.files.length} 个文件\n`);
    }
    
    console.log(`🗂️ 总共将删除 ${totalFiles} 个文件\n`);
    return totalFiles;
  }

  /**
   * 🗑️ 执行文件删除
   */
  async executeCleanup(filesToDelete) {
    console.log('🗑️ 开始清理...\n');
    
    for (const [category, data] of filesToDelete.entries()) {
      console.log(`🧹 清理 ${data.description}...`);
      
      for (const file of data.files) {
        try {
          const fullPath = path.join(this.projectRoot, file);
          
          if (!this.dryRun) {
            // 检查是否是目录
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
              await fs.rmdir(fullPath, { recursive: true });
              this.deletedDirs.push(file);
            } else {
              await fs.unlink(fullPath);
              this.deletedFiles.push(file);
            }
          }
          
          if (this.verbose) {
            console.log(`   ✓ ${file}`);
          }
        } catch (error) {
          console.error(`   ❌ 删除失败 ${file}: ${error.message}`);
          this.errors.push(`删除 ${file}: ${error.message}`);
        }
      }
      
      console.log(`   完成: ${data.files.length} 个项目\n`);
    }
  }

  /**
   * 🧹 清理废弃代码函数
   */
  async cleanupDeprecatedCode() {
    console.log('🧹 清理废弃代码...\n');
    
    const deprecatedCodeFiles = [
      {
        file: 'src/utils/fileUrlHandler.js',
        description: '清理 @deprecated 函数'
      }
    ];
    
    for (const item of deprecatedCodeFiles) {
      try {
        const fullPath = path.join(this.projectRoot, item.file);
        const content = await fs.readFile(fullPath, 'utf8');
        
        // 查找 @deprecated 函数
        const deprecatedFunctions = content.match(/\/\*\*[\s\S]*?@deprecated[\s\S]*?\*\/[\s\S]*?export function.*?\{[\s\S]*?\n\}/g);
        
        if (deprecatedFunctions && deprecatedFunctions.length > 0) {
          console.log(`📄 ${item.file}:`);
          console.log(`   找到 ${deprecatedFunctions.length} 个废弃函数`);
          
          if (this.interactive) {
            // 在交互模式下询问是否删除
            console.log('   (交互模式下可以选择删除具体函数)');
          }
        }
      } catch (error) {
        console.error(`   ❌ 处理 ${item.file} 失败: ${error.message}`);
      }
    }
    
    console.log('');
  }

  /**
   * 📊 生成清理报告
   */
  generateReport() {
    console.log('📊 清理报告:');
    console.log('============\n');
    
    console.log(`✅ 成功删除文件: ${this.deletedFiles.length}`);
    console.log(`✅ 成功删除目录: ${this.deletedDirs.length}`);
    console.log(`⚠️ 跳过的文件: ${this.skippedFiles.length}`);
    console.log(`❌ 错误: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      this.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    console.log('\n🎉 清理完成!');
    
    if (this.dryRun) {
      console.log('\n💡 这是预览模式。要实际执行清理，请运行:');
      console.log('   npm run cleanup-deprecated');
    }
  }

  /**
   * 🚀 主执行函数
   */
  async run() {
    try {
      // 1. 扫描文件
      const filesToDelete = await this.scanFiles();
      
      // 2. 显示预览
      const totalFiles = await this.showPreview(filesToDelete);
      
      if (totalFiles === 0) {
        console.log('🎉 没有找到需要清理的文件!');
        return;
      }
      
      // 3. 确认执行
      if (this.interactive && !this.dryRun) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          rl.question(`确定要删除这 ${totalFiles} 个文件吗? (y/N): `, resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('🚫 用户取消了清理操作');
          return;
        }
      }
      
      // 4. 执行清理
      await this.executeCleanup(filesToDelete);
      
      // 5. 清理废弃代码
      await this.cleanupDeprecatedCode();
      
      // 6. 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('💥 清理过程中发生错误:', error);
      process.exit(1);
    }
  }
}

// 检查是否需要安装依赖
async function checkDependencies() {
  try {
    await import('glob');
  } catch (error) {
    console.log('📦 安装必要的依赖...');
    execSync('npm install glob', { stdio: 'inherit' });
  }
}

// 主程序
async function main() {
  await checkDependencies();
  
  const cleanup = new DeprecatedFileCleanup();
  await cleanup.run();
}

// 运行主程序
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DeprecatedFileCleanup; 