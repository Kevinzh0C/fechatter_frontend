/**
 * useMentions Composable
 * 管理@提及功能的完整实现
 */
import { ref, computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import MentionsService from '@/services/MentionsService.js'
import type { User } from '@/types/api'

interface MentionSuggestion {
  type: 'user' | 'everyone' | 'here'
  username: string
  display: string
  fullname?: string
  avatar?: string
  description: string
}

interface MentionContext {
  query: string
  startIndex: number
  endIndex: number
  isActive: boolean
}

interface MentionsState {
  unreadMentions: any[]
  messageMentions: Map<number, User[]>
  suggestions: MentionSuggestion[]
  context: MentionContext | null
  loading: boolean
  error: string | null
}

export function useMentions(availableUsers: User[] = []) {
  const authStore = useAuthStore()
  
  // State
  const state = reactive<MentionsState>({
    unreadMentions: [],
    messageMentions: new Map(),
    suggestions: [],
    context: null,
    loading: false,
    error: null
  })
  
  // Computed
  const hasUnreadMentions = computed(() => state.unreadMentions.length > 0)
  
  const unreadMentionCount = computed(() => state.unreadMentions.length)
  
  const activeSuggestions = computed(() => {
    if (!state.context?.isActive) return []
    return state.suggestions
  })
  
  const hasSuggestions = computed(() => activeSuggestions.value.length > 0)
  
  // Methods
  const loadUnreadMentions = async () => {
    state.loading = true
    state.error = null
    
    try {
      const mentions = await MentionsService.getUnreadMentions()
      state.unreadMentions = mentions
      return mentions
    } catch (error: any) {
      state.error = error.message || 'Failed to load unread mentions'
      console.error('[useMentions] Load unread mentions failed:', error)
      return []
    } finally {
      state.loading = false
    }
  }
  
  const loadMessageMentions = async (messageId: number) => {
    try {
      const mentions = await MentionsService.getMessageMentions(messageId)
      state.messageMentions.set(messageId, mentions)
      return mentions
    } catch (error) {
      console.error('[useMentions] Load message mentions failed:', error)
      return []
    }
  }
  
  const extractMentions = (content: string) => {
    return MentionsService.extractMentions(content)
  }
  
  const parseMentions = (content: string) => {
    return MentionsService.parseMentions(content)
  }
  
  const renderMentions = (content: string, users: User[] = []) => {
    return MentionsService.renderMentions(content, users)
  }
  
  const isUserMentioned = (content: string, username?: string) => {
    const currentUsername = username || authStore.user?.email?.split('@')[0] || ''
    return MentionsService.isUserMentioned(content, currentUsername)
  }
  
  const getMentionSuggestions = (query: string) => {
    const suggestions = MentionsService.getMentionSuggestions(query, availableUsers)
    state.suggestions = suggestions
    return suggestions
  }
  
  const getMentionContext = (text: string, cursorPosition: number) => {
    const context = MentionsService.getMentionContext(text, cursorPosition)
    
    if (context) {
      state.context = {
        query: context.query,
        startIndex: context.startIndex,
        endIndex: context.endIndex,
        isActive: true
      }
      
      // Get suggestions for the query
      getMentionSuggestions(context.query)
    } else {
      state.context = null
      state.suggestions = []
    }
    
    return context
  }
  
  const insertMention = (
    text: string,
    cursorPosition: number,
    suggestion: MentionSuggestion
  ) => {
    if (!state.context) return { text, cursorPosition }
    
    const beforeMention = text.substring(0, state.context.startIndex)
    const afterMention = text.substring(state.context.endIndex)
    const mentionText = suggestion.display
    
    const newText = beforeMention + mentionText + ' ' + afterMention
    const newCursorPosition = state.context.startIndex + mentionText.length + 1
    
    // Clear context after insertion
    clearMentionContext()
    
    return {
      text: newText,
      cursorPosition: newCursorPosition
    }
  }
  
  const clearMentionContext = () => {
    state.context = null
    state.suggestions = []
  }
  
  const handleTextInput = (text: string, cursorPosition: number) => {
    // Check for mention context
    getMentionContext(text, cursorPosition)
  }
  
  const handleKeyDown = (event: KeyboardEvent, text: string, cursorPosition: number) => {
    if (!state.context?.isActive || !hasSuggestions.value) return false
    
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        // Handle suggestion navigation
        event.preventDefault()
        return true
        
      case 'Enter':
      case 'Tab':
        // Insert first suggestion
        if (state.suggestions.length > 0) {
          event.preventDefault()
          const result = insertMention(text, cursorPosition, state.suggestions[0])
          // Emit the result to parent component
          return result
        }
        return false
        
      case 'Escape':
        // Clear context
        event.preventDefault()
        clearMentionContext()
        return true
        
      default:
        return false
    }
  }
  
  const getMentionsForMessage = (messageId: number) => {
    return computed(() => state.messageMentions.get(messageId) || [])
  }
  
  const preloadMentions = async (messageIds: number[]) => {
    const promises = messageIds.map(messageId => {
      if (!state.messageMentions.has(messageId)) {
        return loadMessageMentions(messageId)
      }
      return Promise.resolve([])
    })
    
    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.warn('[useMentions] Preload mentions failed:', error)
    }
  }
  
  const markMentionAsRead = async (mentionId: number) => {
    try {
      // Remove from unread mentions
      const index = state.unreadMentions.findIndex(m => m.id === mentionId)
      if (index >= 0) {
        state.unreadMentions.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('[useMentions] Mark mention as read failed:', error)
      return false
    }
  }
  
  const clearAllMentions = () => {
    state.unreadMentions = []
    state.messageMentions.clear()
    clearMentionContext()
  }
  
  const highlightMentions = (content: string, className = 'mention-highlight') => {
    return MentionsService.highlightMentions(content, className)
  }
  
  const validateMentions = (mentions: string[], availableUsers: User[]) => {
    return MentionsService.validateMentions(mentions, availableUsers)
  }
  
  return {
    // State
    state: state as Readonly<MentionsState>,
    
    // Computed
    hasUnreadMentions,
    unreadMentionCount,
    activeSuggestions,
    hasSuggestions,
    
    // Methods
    loadUnreadMentions,
    loadMessageMentions,
    extractMentions,
    parseMentions,
    renderMentions,
    isUserMentioned,
    getMentionSuggestions,
    getMentionContext,
    insertMention,
    clearMentionContext,
    handleTextInput,
    handleKeyDown,
    getMentionsForMessage,
    preloadMentions,
    markMentionAsRead,
    clearAllMentions,
    highlightMentions,
    validateMentions
  }
} 