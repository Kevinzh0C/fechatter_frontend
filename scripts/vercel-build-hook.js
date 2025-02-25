#!/usr/bin/env node

/**
 * 🔗 Vercel Build Hook for ngrok Integration
 * 在Vercel构建时动态配置ngrok隧道
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔗 Vercel Build Hook: ngrok Integration');
console.log('=====================================');

// 检查是否在Vercel环境中
const isVercel = process.env.VERCEL === '1';
const ngrokToken = process.env.NGROK_AUTHToken;

if (!isVercel) {
    console.log('📍 Not in Vercel environment, skipping ngrok setup');
    process.exit(0);
}

if (!ngrokToken) {
    console.log('⚠️ NGROK_AUTHToken not found in Vercel environment');
    console.log('Using static configuration...');
    process.exit(0);
}

console.log('✅ Found ngrok authtoken in Vercel environment');

// 后端服务器配置
const BACKEND_HOST = '45.77.178.85';
const BACKEND_USER = 'root';

/**
 * 执行SSH命令
 */
function sshExec(command) {
    try {
        const fullCommand = `ssh -o StrictHostKeyChecking=no ${BACKEND_USER}@${BACKEND_HOST} "${command}"`;
        return execSync(fullCommand, { encoding: 'utf8', timeout: 30000 });
    } catch (error) {
        console.error(`SSH command failed: ${error.message}`);
        throw error;
    }
}

/**
 * 设置ngrok隧道
 */
async function setupNgrokTunnel() {
    console.log('🌐 Setting up authenticated ngrok tunnel...');
    
    try {
        // 配置ngrok authtoken
        console.log('🔑 Configuring ngrok authtoken...');
        sshExec(`ngrok config add-authtoken ${ngrokToken}`);
        
        // 停止现有隧道
        console.log('🛑 Stopping existing tunnels...');
        sshExec('pkill ngrok || true');
        
        // 启动新隧道
        console.log('🚀 Starting new ngrok tunnel...');
        sshExec('nohup ngrok http 6688 --log=stdout > /tmp/ngrok-vercel.log 2>&1 &');
        
        // 等待隧道URL
        console.log('⏳ Waiting for tunnel URL...');
        let ngrokUrl = '';
        
        for (let i = 0; i < 30; i++) {
            try {
                const logOutput = sshExec('cat /tmp/ngrok-vercel.log 2>/dev/null || echo ""');
                const urlMatch = logOutput.match(/https:\/\/[^\s]*\.ngrok[^\s]*/);
                
                if (urlMatch) {
                    ngrokUrl = urlMatch[0];
                    break;
                }
                
                // 等待1秒
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log(`Attempt ${i + 1}/30 failed, retrying...`);
            }
        }
        
        if (!ngrokUrl) {
            throw new Error('Failed to get ngrok URL after 30 attempts');
        }
        
        console.log(`✅ Got ngrok URL: ${ngrokUrl}`);
        return ngrokUrl;
        
    } catch (error) {
        console.error('❌ Failed to setup ngrok tunnel:', error.message);
        throw error;
    }
}

/**
 * 更新配置文件
 */
function updateConfig(ngrokUrl) {
    console.log('📝 Updating configuration files...');
    
    const configPath = path.join(process.cwd(), 'config/production.yml');
    
    if (!fs.existsSync(configPath)) {
        console.error('❌ Production config file not found');
        return false;
    }
    
    try {
        let config = fs.readFileSync(configPath, 'utf8');
        
        // 更新所有API URLs
        config = config.replace(/gateway_url:\s*"[^"]*"/, `gateway_url: "${ngrokUrl}"`);
        config = config.replace(/base_url:\s*"[^"]*"/, `base_url: "${ngrokUrl}/api"`);
        config = config.replace(/file_url:\s*"[^"]*"/, `file_url: "${ngrokUrl}/files"`);
        config = config.replace(/sse_url:\s*"[^"]*"/, `sse_url: "${ngrokUrl}/events"`);
        config = config.replace(/notify_url:\s*"[^"]*"/, `notify_url: "${ngrokUrl}/notify"`);
        
        fs.writeFileSync(configPath, config);
        console.log('✅ Configuration updated successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to update configuration:', error.message);
        return false;
    }
}

/**
 * 更新后端CORS
 */
function updateBackendCors() {
    console.log('🔧 Updating backend CORS...');
    
    try {
        // 获取当前Vercel URL
        const vercelUrl = process.env.VERCEL_URL || 'vercel.app';
        
        sshExec(`
            cd /root/fechatter
            if ! grep -q 'vercel.app' config/chat.yml; then
                cp config/chat.yml config/chat.yml.backup-$(date +%Y%m%d-%H%M%S)
                sed -i '/allow_origins:/a\\    - "https://*.vercel.app"' config/chat.yml
                docker restart fechatter-server-vcr
                echo 'CORS updated for Vercel'
            fi
        `);
        
        console.log('✅ Backend CORS updated');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to update backend CORS:', error.message);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🚀 Starting Vercel + ngrok integration...');
        
        // 设置ngrok隧道
        const ngrokUrl = await setupNgrokTunnel();
        
        // 更新配置
        const configUpdated = updateConfig(ngrokUrl);
        if (!configUpdated) {
            throw new Error('Failed to update configuration');
        }
        
        // 更新后端CORS
        const corsUpdated = updateBackendCors();
        if (!corsUpdated) {
            console.warn('⚠️ Failed to update backend CORS, but continuing...');
        }
        
        console.log('');
        console.log('🎉 Vercel + ngrok integration completed!');
        console.log('======================================');
        console.log(`✅ ngrok URL: ${ngrokUrl}`);
        console.log('✅ Configuration updated');
        console.log('✅ Ready for Vercel deployment');
        console.log('');
        console.log('🔗 Links:');
        console.log(`- Backend: ${ngrokUrl}`);
        console.log('- ngrok Dashboard: https://dashboard.ngrok.com');
        
    } catch (error) {
        console.error('');
        console.error('❌ Vercel + ngrok integration failed!');
        console.error('====================================');
        console.error(`Error: ${error.message}`);
        console.error('');
        console.error('💡 Fallback options:');
        console.error('- Use static configuration');
        console.error('- Check ngrok dashboard');
        console.error('- Verify SSH access to backend');
        
        // 不要让构建失败，使用静态配置
        console.log('');
        console.log('🔄 Continuing with static configuration...');
        process.exit(0);
    }
}

// 运行主函数
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(0); // 不要让构建失败
}); 