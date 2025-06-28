/* 🏷️ Channel List Font Fixer - 频道列表字体修复工具
 * 专门解决频道列表中字体被误放大的问题
 * 确保频道名称、消息预览等保持正确的字体大小
 */

class ChannelListFontFixer {
  constructor() {
    this.isEnabled = true;
    this.fixedElements = new WeakSet();
  }

  /**
   * 🔧 修复单个频道项目的字体
   */
  fixChannelItem(channelItem) {
    if (!channelItem || this.fixedElements.has(channelItem)) return;

    // 修复频道项目整体布局
    channelItem.style.display = 'flex';
    channelItem.style.alignItems = 'center';
    channelItem.style.minHeight = '44px';
    channelItem.style.maxHeight = '44px';
    channelItem.style.padding = '8px 12px';
    channelItem.style.overflow = 'hidden';
    channelItem.style.boxSizing = 'border-box';

    // 修复频道内容区域
    const channelContent = channelItem.querySelector('.channel-content');
    if (channelContent) {
      channelContent.style.flex = '1';
      channelContent.style.minWidth = '0';
      channelContent.style.display = 'flex';
      channelContent.style.flexDirection = 'column';
      channelContent.style.justifyContent = 'center';
      channelContent.style.gap = '2px';
      channelContent.style.overflow = 'hidden';
    }

    // 修复频道名称
    const channelName = channelItem.querySelector('.channel-name');
    if (channelName) {
      channelName.style.display = 'flex';
      channelName.style.alignItems = 'center';
      channelName.style.minHeight = '20px';
      channelName.style.maxHeight = '20px';
      channelName.style.overflow = 'hidden';
    }

    const nameText = channelItem.querySelector('.name-text');
    if (nameText) {
      nameText.style.fontSize = '14px';
      nameText.style.fontWeight = '500';
      nameText.style.lineHeight = '1.4';
      nameText.style.maxWidth = '200px';
      nameText.style.overflow = 'hidden';
      nameText.style.textOverflow = 'ellipsis';
      nameText.style.whiteSpace = 'nowrap';
      nameText.style.flex = '1';
      nameText.style.minWidth = '0';
    }

    // 修复最后消息预览 - 关键改进
    const lastMessage = channelItem.querySelector('.last-message');
    if (lastMessage) {
      lastMessage.style.display = 'flex';
      lastMessage.style.alignItems = 'center';
      lastMessage.style.gap = '4px';
      lastMessage.style.minHeight = '16px';
      lastMessage.style.maxHeight = '16px';
      lastMessage.style.maxWidth = '160px';
      lastMessage.style.fontSize = '12px';
      lastMessage.style.fontWeight = 'normal';
      lastMessage.style.lineHeight = '1.3';
      lastMessage.style.overflow = 'hidden';
      lastMessage.style.whiteSpace = 'nowrap';
      lastMessage.style.textOverflow = 'ellipsis';
      
      // 修复消息发送者
      const messageSender = lastMessage.querySelector('.message-sender');
      if (messageSender) {
        messageSender.style.fontSize = '12px';
        messageSender.style.fontWeight = '500';
        messageSender.style.flexShrink = '0';
        messageSender.style.maxWidth = '60px';
        messageSender.style.overflow = 'hidden';
        messageSender.style.textOverflow = 'ellipsis';
        messageSender.style.whiteSpace = 'nowrap';
      }
      
      // 修复消息内容
      const messageContent = lastMessage.querySelector('.message-content');
      if (messageContent) {
        messageContent.style.fontSize = '12px';
        messageContent.style.fontWeight = 'normal';
        messageContent.style.flex = '1';
        messageContent.style.minWidth = '0';
        messageContent.style.overflow = 'hidden';
        messageContent.style.textOverflow = 'ellipsis';
        messageContent.style.whiteSpace = 'nowrap';
      }
      
      // 修复消息时间
      const messageTime = lastMessage.querySelector('.message-time');
      if (messageTime) {
        messageTime.style.fontSize = '11px';
        messageTime.style.fontWeight = 'normal';
        messageTime.style.flexShrink = '0';
        messageTime.style.marginLeft = 'auto';
      }
      
      // 修复所有子元素
      const allChildren = lastMessage.querySelectorAll('*');
      allChildren.forEach(child => {
        child.style.lineHeight = '1.3';
        child.style.margin = '0';
        child.style.padding = '0';
        child.style.border = 'none';
        child.style.background = 'none';
        child.style.overflow = 'hidden';
        child.style.textOverflow = 'ellipsis';
        child.style.whiteSpace = 'nowrap';
      });
    }

    // 修复频道状态区域
    const channelStatus = channelItem.querySelector('.channel-status');
    if (channelStatus) {
      channelStatus.style.display = 'flex';
      channelStatus.style.alignItems = 'center';
      channelStatus.style.justifyContent = 'flex-end';
      channelStatus.style.gap = '6px';
      channelStatus.style.minWidth = '40px';
      channelStatus.style.maxWidth = '40px';
      channelStatus.style.marginLeft = '8px';
      channelStatus.style.flexShrink = '0';
    }

    this.fixedElements.add(channelItem);
    
    if (import.meta.env.DEV) {
      console.log('🏷️ Fixed channel item font:', channelItem);
    }
  }

  /**
   * 🔍 扫描并修复所有频道项目
   */
  fixAllChannelItems() {
    if (!this.isEnabled) return;

    const channelItems = document.querySelectorAll('.channel-item, .dm-item, .group-item');
    let fixedCount = 0;

    channelItems.forEach(item => {
      if (!this.fixedElements.has(item)) {
        this.fixChannelItem(item);
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      console.log(`🏷️ Fixed ${fixedCount} channel items font sizes`);
    }
  }

  /**
   * 🔄 强制重置所有频道列表字体
   */
  forceResetChannelListFonts() {
    const channelList = document.querySelector('.channel-list');
    if (!channelList) return;

    // 重置所有频道项目
    const allItems = channelList.querySelectorAll('.channel-item, .dm-item, .group-item');
    allItems.forEach(item => {
      // 重置频道名称
      const nameText = item.querySelector('.name-text');
      if (nameText) {
        nameText.style.setProperty('font-size', '14px', 'important');
        nameText.style.setProperty('font-weight', '500', 'important');
        nameText.style.setProperty('line-height', '1.4', 'important');
      }

      // 重置最后消息预览
      const lastMessage = item.querySelector('.last-message');
      if (lastMessage) {
        // 重置容器
        lastMessage.style.setProperty('font-size', '12px', 'important');
        lastMessage.style.setProperty('font-weight', 'normal', 'important');
        lastMessage.style.setProperty('line-height', '1.4', 'important');
        
        // 重置所有子元素
        const allChildren = lastMessage.querySelectorAll('*');
        allChildren.forEach(child => {
          if (child.classList.contains('message-sender')) {
            child.style.setProperty('font-size', '12px', 'important');
            child.style.setProperty('font-weight', '500', 'important');
          } else if (child.classList.contains('message-time')) {
            child.style.setProperty('font-size', '11px', 'important');
            child.style.setProperty('font-weight', 'normal', 'important');
          } else {
            child.style.setProperty('font-size', '12px', 'important');
            child.style.setProperty('font-weight', 'normal', 'important');
          }
          child.style.setProperty('line-height', '1.4', 'important');
          child.style.setProperty('margin', '0', 'important');
          child.style.setProperty('display', 'inline', 'important');
          child.style.setProperty('vertical-align', 'baseline', 'important');
        });
      }
    });

    console.log('🏷️ Force reset all channel list fonts completed');
  }

  /**
   * 🚀 初始化修复器
   */
  initialize() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.fixAllChannelItems();
      });
    } else {
      this.fixAllChannelItems();
    }

    // 定期检查和修复
    setInterval(() => {
      if (this.isEnabled) {
        this.fixAllChannelItems();
      }
    }, 3000); // 每3秒检查一次

    console.log('🏷️ Channel List Font Fixer initialized');
  }

  /**
   * 🎛️ 启用/禁用修复器
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`🏷️ Channel List Font Fixer ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// 创建全局实例
const channelListFontFixer = new ChannelListFontFixer();

// 开发环境下提供调试工具
if (import.meta.env.DEV) {
  window.channelListFontFixer = channelListFontFixer;
  
  // 调试命令
  window.fixChannelListFonts = () => channelListFontFixer.fixAllChannelItems();
  window.forceResetChannelListFonts = () => channelListFontFixer.forceResetChannelListFonts();
  window.enableChannelListFixer = () => channelListFontFixer.setEnabled(true);
  window.disableChannelListFixer = () => channelListFontFixer.setEnabled(false);
  
  // 🎯 NEW: 布局整齐化调试工具
  window.fixChannelListLayout = () => {
    const channelItems = document.querySelectorAll('.channel-item, .dm-item, .group-item');
    channelItems.forEach(item => {
      channelListFontFixer.fixChannelItem(item);
    });
    console.log('🎯 Fixed channel list layout for alignment');
  };
  
  window.testChannelListAlignment = () => {
    const channelItems = document.querySelectorAll('.channel-item, .dm-item, .group-item');
    const stats = {
      totalItems: channelItems.length,
      itemsWithMessages: 0,
      itemsWithLongNames: 0,
      itemsWithOverflow: 0
    };
    
    channelItems.forEach(item => {
      const lastMessage = item.querySelector('.last-message');
      if (lastMessage) stats.itemsWithMessages++;
      
      const nameText = item.querySelector('.name-text');
      if (nameText && nameText.textContent.length > 20) stats.itemsWithLongNames++;
      
      if (item.scrollHeight > item.clientHeight) stats.itemsWithOverflow++;
    });
    
    console.log('📊 Channel List Alignment Analysis:', stats);
    return stats;
  };
  
  console.log('🏷️ Channel List Font Fixer debug tools available:');
  console.log('  - window.fixChannelListFonts() - Fix all channel list fonts');
  console.log('  - window.forceResetChannelListFonts() - Force reset all fonts with !important');
  console.log('  - window.fixChannelListLayout() - Fix channel list layout alignment');
  console.log('  - window.testChannelListAlignment() - Test and analyze channel alignment');
}

export default channelListFontFixer; 