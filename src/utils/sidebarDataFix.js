/**
 * 🔧 Sidebar数据修复工具
 * 专门解决sidebar显示空数据的问题
 */

async function fixSidebarData() {
  console.log('🔧 [SidebarFix] Starting sidebar data repair...');
  
  const results = {
    authCheck: null,
    apiTest: null,
    dataSync: null,
    storeRefresh: null,
    success: false
  };

  try {
    // Step 1: 检查认证状态
    console.log('🔍 Step 1: Checking authentication...');
    const authSources = {
      modernAuth: window.modernAuth,
      authStore: window.authStore,
      localStorage: localStorage.getItem('auth_token'),
      cookies: document.cookie.includes('fechatter_token')
    };

    console.log('Auth sources:', authSources);
    
    let validToken = null;
    
    // 优先使用现代认证系统
    if (window.modernAuth && window.modernAuth.isAuthenticated) {
      validToken = window.modernAuth.token;
      results.authCheck = { source: 'modernAuth', hasToken: !!validToken };
    } else if (window.authStore && window.authStore.token) {
      validToken = window.authStore.token;
      results.authCheck = { source: 'authStore', hasToken: !!validToken };
    } else if (localStorage.getItem('auth_token')) {
      validToken = localStorage.getItem('auth_token');
      results.authCheck = { source: 'localStorage', hasToken: !!validToken };
    }

    if (!validToken) {
      throw new Error('No valid authentication token found');
    }

    console.log(`✅ Valid token found from: ${results.authCheck.source}`);

    // Step 2: 直接测试API
    console.log('🔗 Step 2: Testing API connection...');
    try {
      const response = await fetch('/api/workspace/chats', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const chats = data.data || data;
        results.apiTest = {
          success: true,
          chatsFound: Array.isArray(chats) ? chats.length : 0,
          rawData: chats
        };
        console.log(`✅ API test successful! Found ${results.apiTest.chatsFound} chats`);
      } else {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    } catch (apiError) {
      results.apiTest = { success: false, error: apiError.message };
      console.error('❌ API test failed:', apiError);
    }

    // Step 3: 同步数据到stores
    console.log('📊 Step 3: Syncing data to stores...');
    if (results.apiTest.success && results.apiTest.rawData) {
      const chatsData = results.apiTest.rawData;
      
      // 同步到chatStore
      if (window.chatStore || window.$pinia) {
        try {
          let chatStore;
          if (window.chatStore) {
            chatStore = window.chatStore;
          } else {
            const { useChatStore } = await import('../stores/chat.js');
            chatStore = useChatStore();
          }
          
          // 直接设置chats数据
          if (chatStore.setChats) {
            chatStore.setChats(chatsData);
          } else if (chatStore.chats) {
            chatStore.chats = chatsData;
          }
          
          console.log('✅ Data synced to chatStore');
        } catch (error) {
          console.warn('⚠️ Failed to sync to chatStore:', error);
        }
      }

      // 同步到workspaceStore
      try {
        let workspaceStore;
        if (window.workspaceStore) {
          workspaceStore = window.workspaceStore;
        } else {
          const { useWorkspaceStore } = await import('../stores/workspace.js');
          workspaceStore = useWorkspaceStore();
        }
        
        if (workspaceStore.setChats) {
          workspaceStore.setChats(chatsData);
        } else if (workspaceStore.chats) {
          workspaceStore.chats = chatsData;
        }
        
        console.log('✅ Data synced to workspaceStore');
      } catch (error) {
        console.warn('⚠️ Failed to sync to workspaceStore:', error);
      }

      results.dataSync = { success: true, chatsSynced: chatsData.length };
    }

    // Step 4: 强制刷新stores
    console.log('🔄 Step 4: Force refreshing stores...');
    const refreshResults = [];
    
    try {
      if (window.chatStore?.fetchChats) {
        await window.chatStore.fetchChats();
        refreshResults.push('chatStore refreshed');
      }
    } catch (error) {
      refreshResults.push(`chatStore refresh failed: ${error.message}`);
    }

    try {
      if (window.workspaceStore?.fetchWorkspaceChats) {
        await window.workspaceStore.fetchWorkspaceChats();
        refreshResults.push('workspaceStore refreshed');
      }
    } catch (error) {
      refreshResults.push(`workspaceStore refresh failed: ${error.message}`);
    }

    results.storeRefresh = { results: refreshResults };
    console.log('🔄 Store refresh results:', refreshResults);

    // 计算成功率
    const successCount = Object.values(results).filter(r => 
      r && typeof r === 'object' && r.success !== false
    ).length;
    
    results.success = successCount >= 3;

    // 显示结果
    showSidebarFixResults(results);
    
    return results;

  } catch (error) {
    console.error('❌ [SidebarFix] Sidebar data fix failed:', error);
    results.error = error.message;
    showSidebarFixResults(results);
    return results;
  }
}

/**
 * 📊 显示修复结果
 */
function showSidebarFixResults(results) {
  console.log('');
  console.log('🔧 ================ SIDEBAR FIX RESULTS ================');
  
  // Auth Check
  if (results.authCheck) {
    console.log(`✅ Authentication: Found token from ${results.authCheck.source}`);
  } else {
    console.log('❌ Authentication: No valid token found');
  }

  // API Test
  if (results.apiTest?.success) {
    console.log(`✅ API Connection: ${results.apiTest.chatsFound} chats available`);
  } else {
    console.log(`❌ API Connection: ${results.apiTest?.error || 'Failed'}`);
  }

  // Data Sync
  if (results.dataSync?.success) {
    console.log(`✅ Data Sync: ${results.dataSync.chatsSynced} chats synced to stores`);
  } else {
    console.log('❌ Data Sync: Failed to sync data');
  }

  // Store Refresh
  if (results.storeRefresh?.results) {
    console.log('🔄 Store Refresh Results:');
    results.storeRefresh.results.forEach(result => {
      console.log(`   ${result}`);
    });
  }

  console.log('');
  if (results.success) {
    console.log('🎉 ================= SIDEBAR FIX SUCCESS! =================');
    console.log('✅ Sidebar should now display chat data correctly!');
    console.log('🔄 If sidebar still shows empty, try refreshing the page');
  } else {
    console.log('⚠️ ================= PARTIAL SUCCESS =================');
    console.log('⚠️ Some issues remain. Try the following:');
    console.log('  1. Check if you are logged in properly');
    console.log('  2. Verify API endpoint is working');
    console.log('  3. Run executeUltimateFix() for complete repair');
  }
  console.log('====================================================');
  console.log('');
}

/**
 * 🚀 快速sidebar修复
 */
async function quickSidebarFix() {
  console.log('🚀 [QuickSidebarFix] Running quick sidebar repair...');
  
  // 方法1: 直接强制刷新所有相关stores
  const stores = ['chatStore', 'workspaceStore', 'authStore'];
  for (const storeName of stores) {
    if (window[storeName]) {
      try {
        // 尝试各种可能的刷新方法
        if (window[storeName].fetchChats) {
          await window[storeName].fetchChats();
        }
        if (window[storeName].fetchWorkspaceChats) {
          await window[storeName].fetchWorkspaceChats();
        }
        if (window[storeName].initialize) {
          await window[storeName].initialize();
        }
        console.log(`✅ ${storeName} refreshed`);
      } catch (error) {
        console.warn(`⚠️ ${storeName} refresh failed:`, error);
      }
    }
  }

  // 方法2: 直接操作DOM（如果stores失败）
  setTimeout(() => {
    const sidebarElements = document.querySelectorAll('[data-testid*="sidebar"], [class*="sidebar"]');
    if (sidebarElements.length > 0) {
      console.log('🔄 Found sidebar elements, triggering re-render...');
      sidebarElements.forEach(el => {
        el.style.display = 'none';
        setTimeout(() => {
          el.style.display = '';
        }, 100);
      });
    }
  }, 1000);

  console.log('✅ Quick sidebar fix completed');
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.fixSidebarData = fixSidebarData;
  window.quickSidebarFix = quickSidebarFix;
}

export { fixSidebarData, quickSidebarFix }; 