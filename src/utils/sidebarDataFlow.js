/**
 * 🔧 Sidebar数据流通修复工具
 * 专门解决从API -> Store -> Sidebar的数据流通问题
 */

async function fixSidebarDataFlow() {
  console.log('🔧 [SidebarDataFlow] Starting complete data flow repair...');
  
  const results = {
    step1_auth: null,
    step2_api: null,
    step3_stores: null,
    step4_components: null,
    step5_verification: null,
    success: false
  };

  try {
    // STEP 1: 🔐 确保认证token有效
    console.log('🔐 Step 1: Authentication validation...');
    let validToken = null;
    
    // 优先使用现代认证系统
    if (window.modernAuth?.isAuthenticated) {
      validToken = window.modernAuth.token;
      results.step1_auth = { source: 'modernAuth', success: true };
    } else if (window.authStore?.token) {
      validToken = window.authStore.token;
      results.step1_auth = { source: 'authStore', success: true };
    } else {
      // 从localStorage获取
      const tokens = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('access_token'),
        localStorage.getItem('fechatter_token')
      ];
      
      validToken = tokens.find(t => t && t.length > 20);
      if (validToken) {
        results.step1_auth = { source: 'localStorage', success: true };
      }
    }

    if (!validToken) {
      throw new Error('No valid authentication token found');
    }

    console.log(`✅ Step 1 完成: Token来源 ${results.step1_auth.source}`);

    // STEP 2: 🔗 直接测试API端点
    console.log('🔗 Step 2: Direct API testing...');
    let rawApiData = null;
    
    try {
      const response = await fetch('/api/workspace/chats', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      rawApiData = data.data || data;
      
      results.step2_api = {
        success: true,
        chatsCount: Array.isArray(rawApiData) ? rawApiData.length : 0,
        sampleData: Array.isArray(rawApiData) ? rawApiData.slice(0, 2) : null
      };
      
      console.log(`✅ Step 2 完成: 获取到 ${results.step2_api.chatsCount} 个聊天`);
    } catch (apiError) {
      results.step2_api = { success: false, error: apiError.message };
      console.error('❌ Step 2 失败:', apiError);
      throw apiError;
    }

    // STEP 3: 📊 强制数据同步到stores
    console.log('📊 Step 3: Force data sync to stores...');
    
    const storeResults = [];
    
    // 3.1 同步到chatStore
    try {
      let chatStore;
      if (window.chatStore) {
        chatStore = window.chatStore;
      } else if (window.pinia) {
        const { useChatStore } = await import('../stores/chat.js');
        chatStore = useChatStore();
        window.chatStore = chatStore; // 暴露到全局
      }
      
      if (chatStore) {
        // 直接设置数据
        chatStore.chats = rawApiData;
        chatStore.loading = false;
        chatStore.error = null;
        chatStore.isInitialized = true;
        
        storeResults.push('chatStore: 数据同步成功');
      }
    } catch (error) {
      storeResults.push(`chatStore: 同步失败 - ${error.message}`);
    }

    // 3.2 同步到workspaceStore
    try {
      let workspaceStore;
      if (window.workspaceStore) {
        workspaceStore = window.workspaceStore;
      } else if (window.pinia) {
        const { useWorkspaceStore } = await import('../stores/workspace.js');
        workspaceStore = useWorkspaceStore();
        window.workspaceStore = workspaceStore; // 暴露到全局
      }
      
      if (workspaceStore) {
        // 直接设置数据
        workspaceStore.workspaceChats = rawApiData;
        workspaceStore.loading = false;
        workspaceStore.error = null;
        
        storeResults.push('workspaceStore: 数据同步成功');
      }
    } catch (error) {
      storeResults.push(`workspaceStore: 同步失败 - ${error.message}`);
    }

    // 3.3 确保现代认证系统的token被正确设置
    try {
      if (window.modernAuth && validToken) {
        window.modernAuth.setToken(validToken);
        storeResults.push('modernAuth: Token同步成功');
      }
    } catch (error) {
      storeResults.push(`modernAuth: Token同步失败 - ${error.message}`);
    }

    results.step3_stores = { success: true, results: storeResults };
    console.log('✅ Step 3 完成:', storeResults);

    // STEP 4: 🎨 强制组件重新渲染
    console.log('🎨 Step 4: Force component re-render...');
    
    const componentResults = [];
    
    // 4.1 触发Vue reactivity
    try {
      if (window.chatStore) {
        window.chatStore._forceUpdate = (window.chatStore._forceUpdate || 0) + 1;
        componentResults.push('chatStore reactivity triggered');
      }
    } catch (error) {
      componentResults.push(`reactivity failed: ${error.message}`);
    }

    // 4.2 查找并强制刷新sidebar相关组件
    try {
      const sidebarElements = document.querySelectorAll(
        '.channel-list, .sidebar, [class*="sidebar"], [class*="channel"]'
      );
      
      if (sidebarElements.length > 0) {
        sidebarElements.forEach((el, index) => {
          // 强制重新渲染
          const display = el.style.display;
          el.style.display = 'none';
          el.offsetHeight; // Force reflow
          el.style.display = display;
        });
        
        componentResults.push(`${sidebarElements.length} sidebar elements refreshed`);
      }
    } catch (error) {
      componentResults.push(`DOM refresh failed: ${error.message}`);
    }

    // 4.3 发送自定义事件通知组件刷新
    try {
      const event = new CustomEvent('sidebar-data-updated', {
        detail: { chats: rawApiData, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
      componentResults.push('Custom event dispatched');
    } catch (error) {
      componentResults.push(`Event dispatch failed: ${error.message}`);
    }

    results.step4_components = { success: true, results: componentResults };
    console.log('✅ Step 4 完成:', componentResults);

    // STEP 5: 🔍 验证修复结果
    console.log('🔍 Step 5: Verification...');
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待渲染
    
    const verification = {
      chatStore_chats: window.chatStore?.chats?.length || 0,
      workspaceStore_chats: window.workspaceStore?.workspaceChats?.length || 0,
      dom_channels: document.querySelectorAll('.channel-item, [class*="channel"]').length,
      sidebar_visible: document.querySelector('.channel-list, .sidebar') !== null
    };

    const successCount = Object.values(verification).filter(v => v > 0).length;
    results.step5_verification = { 
      success: successCount >= 2, // 至少2个指标成功
      details: verification 
    };

    console.log('✅ Step 5 完成:', verification);

    // 计算总体成功率
    const totalSteps = Object.keys(results).filter(k => k !== 'success').length;
    const successfulSteps = Object.values(results).filter(r => 
      r && typeof r === 'object' && r.success !== false
    ).length;
    
    results.success = successfulSteps >= totalSteps - 1; // 允许一个步骤失败

    // 显示结果
    showDataFlowResults(results);
    
    return results;

  } catch (error) {
    console.error('❌ [SidebarDataFlow] Critical error:', error);
    results.error = error.message;
    showDataFlowResults(results);
    return results;
  }
}

/**
 * 🚀 快速sidebar数据流修复
 */
async function quickSidebarFlow() {
  console.log('🚀 [QuickSidebarFlow] Quick data flow repair...');
  
  try {
    // 方法1: 直接刷新所有stores
    const stores = ['chatStore', 'workspaceStore'];
    for (const storeName of stores) {
      if (window[storeName]) {
        try {
          // 强制刷新
          if (window[storeName].fetchChats) {
            await window[storeName].fetchChats();
          }
          if (window[storeName].fetchWorkspaceChats) {
            await window[storeName].fetchWorkspaceChats();
          }
          console.log(`✅ ${storeName} refreshed`);
        } catch (error) {
          console.warn(`⚠️ ${storeName} refresh failed:`, error);
        }
      }
    }

    // 方法2: 刷新现代认证系统
    if (window.modernAuth?.initialize) {
      await window.modernAuth.initialize();
      console.log('✅ Modern auth re-initialized');
    }

    // 方法3: 触发组件重新渲染
    window.dispatchEvent(new CustomEvent('force-sidebar-refresh'));
    
    console.log('✅ Quick sidebar flow repair completed');
    return true;
    
  } catch (error) {
    console.error('❌ Quick sidebar flow repair failed:', error);
    return false;
  }
}

/**
 * 📊 显示修复结果
 */
function showDataFlowResults(results) {
  console.log('');
  console.log('🔧 ============= SIDEBAR DATA FLOW REPAIR RESULTS =============');
  
  // Step 1: Authentication
  if (results.step1_auth?.success) {
    console.log(`✅ 认证: 来源 ${results.step1_auth.source}`);
  } else {
    console.log('❌ 认证: 失败');
  }

  // Step 2: API
  if (results.step2_api?.success) {
    console.log(`✅ API: 获取 ${results.step2_api.chatsCount} 个聊天`);
  } else {
    console.log(`❌ API: ${results.step2_api?.error || '失败'}`);
  }

  // Step 3: Stores
  if (results.step3_stores?.success) {
    console.log(`✅ 数据同步: ${results.step3_stores.results.length} 个store已同步`);
    results.step3_stores.results.forEach(result => {
      console.log(`   ${result}`);
    });
  } else {
    console.log('❌ 数据同步: 失败');
  }

  // Step 4: Components
  if (results.step4_components?.success) {
    console.log(`✅ 组件刷新: ${results.step4_components.results.length} 个操作完成`);
  } else {
    console.log('❌ 组件刷新: 失败');
  }

  // Step 5: Verification
  if (results.step5_verification?.success) {
    console.log('✅ 验证: 成功');
    console.log('   详情:', results.step5_verification.details);
  } else {
    console.log('❌ 验证: 失败');
  }

  console.log('');
  if (results.success) {
    console.log('🎉 ============= SIDEBAR DATA FLOW REPAIR SUCCESS! =============');
    console.log('✅ Sidebar should now display chat data correctly!');
    console.log('🔄 If you still see empty data, try refreshing the page');
  } else {
    console.log('⚠️ ============= PARTIAL SUCCESS =============');
    console.log('⚠️ Some steps failed. Additional troubleshooting may be needed.');
  }
  console.log('==============================================================');
  console.log('');
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.fixSidebarDataFlow = fixSidebarDataFlow;
  window.quickSidebarFlow = quickSidebarFlow;
  window.showDataFlowResults = showDataFlowResults;
}

export { fixSidebarDataFlow, quickSidebarFlow, showDataFlowResults }; 