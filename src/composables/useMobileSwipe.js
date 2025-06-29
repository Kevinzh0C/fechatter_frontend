import { ref, onMounted, onUnmounted, computed } from 'vue'

/**
 * 🎯 移动端滑动手势管理器
 * 功能：
 * 1. Sidebar边缘滑动打开/关闭
 * 2. ChannelList垂直滚动
 * 3. 消息页面独占竖屏显示
 */
export function useMobileSwipe(options = {}) {
  // 配置选项
  const {
    sidebarWidth = 280,
    edgeThreshold = 20,
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    enableSidebarSwipe = true,
    enableChannelListScroll = true
  } = options

  // 状态管理
  const isMobile = ref(false)
  const sidebarVisible = ref(false)
  const isSwipeActive = ref(false)
  const swipeDirection = ref(null) // 'left', 'right', 'up', 'down'
  
  // 触摸状态
  const touchState = ref({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    isFromEdge: false,
    target: null
  })

  // 计算属性
  const swipeDistance = computed(() => ({
    x: touchState.value.currentX - touchState.value.startX,
    y: touchState.value.currentY - touchState.value.startY
  }))

  const swipeVelocity = computed(() => {
    const deltaTime = Date.now() - touchState.value.startTime
    return {
      x: Math.abs(swipeDistance.value.x) / deltaTime,
      y: Math.abs(swipeDistance.value.y) / deltaTime
    }
  })

  // 检测是否为移动设备
  const checkIsMobile = () => {
    isMobile.value = window.innerWidth <= 768 || 
                    ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0)
  }

  // 检测是否从边缘开始滑动
  const isEdgeSwipe = (x) => {
    return x <= edgeThreshold || x >= (window.innerWidth - edgeThreshold)
  }

  // 处理触摸开始
  const handleTouchStart = (event) => {
    if (!isMobile.value) return

    const touch = event.touches[0]
    const target = event.target

    touchState.value = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
      isFromEdge: isEdgeSwipe(touch.clientX),
      target: target
    }

    isSwipeActive.value = true
    swipeDirection.value = null

    // 如果是从左边缘开始且sidebar开启滑动
    if (enableSidebarSwipe && touch.clientX <= edgeThreshold) {
      event.preventDefault()
      console.log('🎯 [MobileSwipe] Edge swipe detected from left')
    }
  }

  // 处理触摸移动
  const handleTouchMove = (event) => {
    if (!isMobile.value || !isSwipeActive.value) return

    const touch = event.touches[0]
    touchState.value.currentX = touch.clientX
    touchState.value.currentY = touch.clientY

    const deltaX = swipeDistance.value.x
    const deltaY = swipeDistance.value.y

    // 确定滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      swipeDirection.value = deltaX > 0 ? 'right' : 'left'
    } else {
      swipeDirection.value = deltaY > 0 ? 'down' : 'up'
    }

    // Sidebar滑动处理
    if (enableSidebarSwipe) {
      // 情况1：从左边缘向右滑动 - 打开sidebar
      if (touchState.value.isFromEdge && touchState.value.startX <= edgeThreshold && deltaX > 0 && deltaX <= sidebarWidth) {
        event.preventDefault()
        updateSidebarPosition(deltaX)
        console.log('🎯 [MobileSwipe] Opening sidebar:', deltaX)
      }
      
      // 情况2：sidebar已开启时向左滑动 - 关闭sidebar
      if (sidebarVisible.value && deltaX < 0) {
        // 🔧 改进：不限制只能从边缘开始，sidebar开启时任何位置都可以滑动关闭
        const isSidebarTouch = touchState.value.target && (
          touchState.value.target.closest('.global-sidebar') ||
          touchState.value.target.closest('.sidebar-unified-channels') ||
          touchState.value.startX <= sidebarWidth + 50 // 允许从sidebar外边缘一定范围内开始滑动
        )
        
        if (isSidebarTouch) {
          event.preventDefault()
          const newPosition = Math.max(0, sidebarWidth + deltaX)
          updateSidebarPosition(newPosition)
          console.log('🎯 [MobileSwipe] Closing sidebar:', newPosition)
        }
      }
    }

    // ChannelList滚动处理
    if (enableChannelListScroll && isChannelListTarget(touchState.value.target)) {
      // 允许垂直滚动，阻止水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        event.preventDefault()
      }
    }
  }

  // 处理触摸结束
  const handleTouchEnd = (event) => {
    if (!isMobile.value || !isSwipeActive.value) return

    const deltaX = swipeDistance.value.x
    const deltaY = swipeDistance.value.y
    const velocityX = swipeVelocity.value.x
    const velocityY = swipeVelocity.value.y

    // Sidebar滑动完成处理
    if (enableSidebarSwipe) {
      // 情况1：从边缘滑动打开sidebar
      if (touchState.value.isFromEdge && touchState.value.startX <= edgeThreshold) {
        const shouldOpen = deltaX > swipeThreshold || velocityX > velocityThreshold
        
        if (!sidebarVisible.value && shouldOpen) {
          openSidebar()
          console.log('🎯 [MobileSwipe] Sidebar opened via edge swipe')
        } else {
          // 回弹到关闭位置
          updateSidebarPosition(0)
          console.log('🎯 [MobileSwipe] Sidebar bounced back to closed')
        }
      }
      
      // 情况2：sidebar开启时滑动关闭
      else if (sidebarVisible.value && deltaX < 0) {
        const shouldClose = Math.abs(deltaX) > swipeThreshold || velocityX > velocityThreshold
        
        if (shouldClose) {
          closeSidebar()
          console.log('🎯 [MobileSwipe] Sidebar closed via left swipe')
        } else {
          // 回弹到开启位置
          updateSidebarPosition(sidebarWidth)
          console.log('🎯 [MobileSwipe] Sidebar bounced back to open')
        }
      }
      
      // 情况3：其他情况下恢复到当前状态
      else {
        if (sidebarVisible.value) {
          updateSidebarPosition(sidebarWidth)
        } else {
          updateSidebarPosition(0)
        }
      }
    }

    // 重置状态
    isSwipeActive.value = false
    swipeDirection.value = null
    
    console.log('🎯 [MobileSwipe] Touch end:', {
      deltaX,
      deltaY,
      velocityX,
      velocityY,
      direction: swipeDirection.value,
      sidebarVisible: sidebarVisible.value,
      wasFromEdge: touchState.value.isFromEdge
    })
  }

  // 检查是否为ChannelList目标
  const isChannelListTarget = (target) => {
    if (!target) return false
    return target.closest('.channel-list') || 
           target.closest('.channels-container') ||
           target.closest('.sidebar-unified-channels')
  }

  // 更新Sidebar位置
  const updateSidebarPosition = (position) => {
    const sidebar = document.querySelector('.global-sidebar.mobile-sidebar') || document.querySelector('.global-sidebar')
    if (sidebar) {
      const translateX = Math.max(0, Math.min(sidebarWidth, position)) - sidebarWidth
      sidebar.style.transform = `translateX(${translateX}px)`
      sidebar.style.transition = 'none'
      console.log('🎯 [MobileSwipe] Updated sidebar position:', translateX)
    } else {
      console.warn('🎯 [MobileSwipe] Sidebar element not found')
    }
  }

  // 打开Sidebar
  const openSidebar = () => {
    sidebarVisible.value = true
    const sidebar = document.querySelector('.global-sidebar.mobile-sidebar') || document.querySelector('.global-sidebar')
    const overlay = document.querySelector('.mobile-overlay')
    
    if (sidebar) {
      sidebar.style.transform = 'translateX(0)'
      sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      sidebar.classList.add('mobile-visible')
    }
    
    // 添加遮罩层
    if (!overlay) {
      const newOverlay = document.createElement('div')
      newOverlay.className = 'mobile-overlay'
      newOverlay.addEventListener('click', closeSidebar)
      document.body.appendChild(newOverlay)
    }
    
    // 防止背景滚动
    document.body.style.overflow = 'hidden'
    
    console.log('📱 [MobileSwipe] Sidebar opened')
  }

  // 关闭Sidebar
  const closeSidebar = () => {
    sidebarVisible.value = false
    const sidebar = document.querySelector('.global-sidebar.mobile-sidebar') || document.querySelector('.global-sidebar')
    const overlay = document.querySelector('.mobile-overlay')
    
    if (sidebar) {
      sidebar.style.transform = `translateX(-${sidebarWidth}px)`
      sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      sidebar.classList.remove('mobile-visible')
    }
    
    // 移除遮罩层
    if (overlay) {
      overlay.remove()
    }
    
    // 恢复背景滚动
    document.body.style.overflow = ''
    
    console.log('📱 [MobileSwipe] Sidebar closed')
  }

  // 切换Sidebar
  const toggleSidebar = () => {
    if (sidebarVisible.value) {
      closeSidebar()
    } else {
      openSidebar()
    }
  }

  // 处理窗口大小变化
  const handleResize = () => {
    checkIsMobile()
    
    // 如果切换到桌面模式，重置sidebar状态
    if (!isMobile.value && sidebarVisible.value) {
      const sidebar = document.querySelector('.global-sidebar.mobile-sidebar') || document.querySelector('.global-sidebar')
      const overlay = document.querySelector('.mobile-overlay')
      
      if (sidebar) {
        sidebar.style.transform = ''
        sidebar.style.transition = ''
        sidebar.classList.remove('mobile-visible')
      }
      
      if (overlay) {
        overlay.remove()
      }
      
      document.body.style.overflow = ''
      sidebarVisible.value = false
    }
  }

  // 生命周期钩子
  onMounted(() => {
    checkIsMobile()
    
    if (isMobile.value) {
      // 添加触摸事件监听器
      document.addEventListener('touchstart', handleTouchStart, { passive: false })
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      
      // 添加窗口大小变化监听器
      window.addEventListener('resize', handleResize)
      
      console.log('📱 [MobileSwipe] Mobile swipe gestures initialized')
    }
  })

  onUnmounted(() => {
    // 移除事件监听器
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('resize', handleResize)
    
    // 清理状态
    const overlay = document.querySelector('.mobile-overlay')
    if (overlay) {
      overlay.remove()
    }
    
    document.body.style.overflow = ''
  })

  // 返回API
  return {
    // 状态
    isMobile,
    sidebarVisible,
    isSwipeActive,
    swipeDirection,
    swipeDistance,
    swipeVelocity,
    
    // 方法
    openSidebar,
    closeSidebar,
    toggleSidebar,
    
    // 内部状态（用于调试）
    touchState
  }
} 