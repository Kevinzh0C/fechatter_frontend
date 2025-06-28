<template>
  <!-- 🔵⚡ Blue Beam Search Modal - Advanced Search with Light Effects -->
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="isOpen" class="blue-search-backdrop" @click="handleClose" @keydown.esc="handleClose">
        <transition name="modal-scale">
          <div class="blue-search-modal" @click.stop ref="modalRef">
            <!-- Modern Header with Blue Accent -->
            <header class="blue-modal-header">
              <div class="blue-search-branding">
                <div class="blue-search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <h1 class="blue-search-title">Blue Beam Search</h1>
              </div>

              <button @click="handleClose" class="blue-close-button" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <!-- 🔍 Enhanced Search Input with Blue Theme -->
            <section class="blue-search-section">
              <div class="blue-search-input-container">
                <div class="blue-search-icon-wrapper">
                  <svg class="blue-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>

                <input ref="searchInput" v-model="searchQuery" @input="handleSearch" @keydown.enter="executeSearch"
                  @keydown.escape="handleClose" @keydown.up="navigateResults(-1)" @keydown.down="navigateResults(1)"
                  type="text" placeholder="Search with blue beam targeting..." class="blue-search-input" 
                  autocomplete="off" spellcheck="false" :disabled="isSearching" />

                <div class="blue-search-actions">
                  <button v-if="searchQuery && !isSearching" @click="clearSearch" class="blue-clear-button"
                    aria-label="Clear search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  <div v-if="isSearching" class="blue-loading-indicator">
                    <div class="blue-loading-spinner">
                      <svg class="blue-spinner" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2">
                          <animate attributeName="stroke-dasharray" dur="2s" 
                            values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                        </circle>
                      </svg>
                    </div>
                  </div>

                  <button @click="executeSearch" class="blue-search-button" 
                    :class="{ active: searchQuery }" :disabled="!searchQuery || isSearching">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>

            <!-- 🔵 Blue Beam Results Section -->
            <section class="blue-results-section" v-if="hasSearched">
              <div class="blue-results-header" v-if="searchResults.length > 0">
                <div class="blue-results-info">
                  <span class="blue-results-count">{{ searchResults.length }} targets found</span>
                  <span class="blue-beam-indicator">🔵 Blue Beam Ready</span>
                </div>
                <span class="blue-search-time" v-if="searchTime">{{ searchTime }}ms</span>
              </div>

              <!-- Enhanced Results List with Blue Beam Preview -->
              <div class="blue-results-container" v-if="searchResults.length > 0">
                <div v-for="(result, index) in searchResults" :key="result.id" 
                  @click="jumpToMessageWithBlueBeam(result)"
                  class="blue-result-item" :class="{ focused: focusedIndex === index }"
                  @mouseenter="previewBlueBeam(index)"
                  @mouseleave="clearBlueBeamPreview()"
                  role="button" tabindex="0">
                  
                  <div class="blue-result-container">
                    <!-- User Avatar with Blue Accent -->
                    <div class="blue-result-avatar" 
                      :style="getBlueAvatarStyle(result.sender_name || 'Unknown')">
                      {{ getInitials(result.sender_name || 'Unknown') }}
                    </div>

                    <!-- Message Content with Blue Highlighting -->
                    <div class="blue-result-content">
                      <div class="blue-result-header">
                        <span class="blue-result-sender">
                          {{ result.sender_name || 'Unknown User' }}
                        </span>
                        <span class="blue-result-time">{{ formatTime(result.created_at) }}</span>
                        <span class="blue-beam-target-icon">🎯</span>
                      </div>

                      <div class="blue-result-text" 
                        v-html="highlightTextWithBlue(result.content || '', searchQuery)">
                      </div>

                      <!-- Blue Beam Preview Bar -->
                      <div class="blue-beam-preview" v-if="focusedIndex === index">
                        <div class="blue-beam-bar"></div>
                        <span class="blue-beam-text">Blue Beam Target Acquired</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State with Blue Theme -->
              <div v-else-if="searchQuery && !isSearching" class="blue-empty-state">
                <div class="blue-empty-icon">🔵</div>
                <h3 class="blue-empty-title">No targets found</h3>
                <p class="blue-empty-description">Try different keywords for blue beam targeting</p>
              </div>
            </section>

            <!-- Welcome State with Blue Theme -->
            <section v-else class="blue-welcome-section">
              <div class="blue-welcome-content">
                <div class="blue-welcome-icon">🔵⚡</div>
                <h2 class="blue-welcome-title">Blue Beam Search</h2>
                <p class="blue-welcome-subtitle">Advanced message targeting with light beam effects</p>
                
                <div class="blue-features">
                  <div class="blue-feature">
                    <span class="blue-feature-icon">🎯</span>
                    <span>Precise Targeting</span>
                  </div>
                  <div class="blue-feature">
                    <span class="blue-feature-icon">⚡</span>
                    <span>Light Beam Effects</span>
                  </div>
                  <div class="blue-feature">
                    <span class="blue-feature-icon">🔵</span>
                    <span>Blue Light Technology</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Footer with Blue Accents -->
            <footer class="blue-modal-footer">
              <div class="blue-keyboard-hints">
                <kbd>⌘K</kbd> to search
                <kbd>↵</kbd> for blue beam
                <kbd>esc</kbd> to close
              </div>
            </footer>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useRouter } from 'vue-router'

// 🔵⚡ Import Blue Beam Search Controller
import { blueBeamSearchController } from '@/utils/blueBeamSearchController.js'

const router = useRouter()

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  chatId: {
    type: [String, Number],
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'navigate'])

// State
const searchInput = ref(null)
const modalRef = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
const searchTime = ref(null)
const focusedIndex = ref(-1)

// Methods
const handleClose = () => {
  // Clear any active blue beams when closing
  blueBeamSearchController.clearAllBlueBeams()
  emit('close')
}

// 🔵 Enhanced search with blue beam preview
const handleSearch = useDebounceFn(async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  isSearching.value = true
  hasSearched.value = true

  try {
    const startTime = Date.now()
    
    // Simulate search (replace with actual search service)
    const mockResults = [
      {
        id: 1,
        content: `This message contains ${searchQuery.value} and demonstrates blue beam targeting`,
        sender_name: 'John Doe',
        created_at: new Date().toISOString(),
        chat_id: props.chatId || 1
      },
      {
        id: 2,
        content: `Another example with ${searchQuery.value} for testing purposes`,
        sender_name: 'Jane Smith',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        chat_id: props.chatId || 1
      }
    ]

    // Filter results based on search query
    searchResults.value = mockResults.filter(result => 
      result.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    )

    searchTime.value = Date.now() - startTime

  } catch (error) {
    console.error('🔵 [BlueBeamSearch] Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

const executeSearch = () => {
  handleSearch()
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
  focusedIndex.value = -1
}

const navigateResults = (direction) => {
  if (searchResults.value.length === 0) return
  
  const newIndex = focusedIndex.value + direction
  if (newIndex >= 0 && newIndex < searchResults.value.length) {
    focusedIndex.value = newIndex
  }
}

// 🔵⚡ Blue Beam Navigation
const jumpToMessageWithBlueBeam = async (result) => {
  console.log('🔵 [BlueBeamSearch] Initiating blue beam navigation:', result)

  try {
    handleClose()

    // Use Blue Beam Search Controller
    const navigationResult = await blueBeamSearchController.jumpToMessageWithBlueBeam({
      messageId: result.id,
      chatId: result.chat_id || props.chatId,
      searchQuery: searchQuery.value,
      intensity: 'intense',
      router: router
    })

    if (navigationResult.success) {
      console.log('🔵 [BlueBeamSearch] Blue beam navigation successful')
      emit('navigate', {
        messageId: result.id,
        chatId: result.chat_id,
        effect: 'blue_beam_intense',
        success: true
      })
    } else {
      console.warn('🔵 [BlueBeamSearch] Blue beam navigation failed')
    }

  } catch (error) {
    console.error('🔵 [BlueBeamSearch] Navigation error:', error)
  }
}

// Blue beam preview effects
const previewBlueBeam = (index) => {
  focusedIndex.value = index
}

const clearBlueBeamPreview = () => {
  // Keep focused index for keyboard navigation
}

// Utility functions
const getInitials = (name) => {
  if (!name) return 'U'
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
}

const getBlueAvatarStyle = (name) => {
  const hue = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 60%, 50%) 0%, hsl(220, 70%, 60%) 100%)`,
    color: 'white'
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const highlightTextWithBlue = (text, query) => {
  if (!query) return text
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<span class="blue-search-highlight">$1</span>')
}

// Focus search input when modal opens
onMounted(() => {
  if (props.isOpen && searchInput.value) {
    nextTick(() => {
      searchInput.value.focus()
    })
  }
})
</script>

<style scoped>
/* 🔵⚡ Blue Beam Search Modal Styles */
.blue-search-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 20, 40, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(8px);
}

.blue-search-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 25px 50px rgba(59, 130, 246, 0.3),
    0 0 0 1px rgba(59, 130, 246, 0.1);
  overflow: hidden;
  border: 2px solid rgba(59, 130, 246, 0.2);
}

.blue-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.blue-search-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blue-search-icon {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.9);
}

.blue-search-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.blue-close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.blue-close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.blue-search-section {
  padding: 24px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.blue-search-input-container {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 4px;
  transition: all 0.3s;
}

.blue-search-input-container:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.blue-search-icon-wrapper {
  padding: 12px;
  color: #3b82f6;
}

.blue-search-icon {
  width: 20px;
  height: 20px;
}

.blue-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 1rem;
  padding: 12px 8px;
  background: transparent;
  color: #1e293b;
}

.blue-search-input::placeholder {
  color: #64748b;
}

.blue-search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.blue-clear-button,
.blue-search-button {
  background: transparent;
  border: none;
  color: #64748b;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.blue-search-button.active {
  background: #3b82f6;
  color: white;
}

.blue-loading-indicator {
  display: flex;
  align-items: center;
  padding: 8px;
}

.blue-spinner {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.blue-results-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.blue-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(59, 130, 246, 0.05);
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
}

.blue-results-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blue-results-count {
  font-weight: 600;
  color: #1e293b;
}

.blue-beam-indicator {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.blue-search-time {
  color: #64748b;
  font-size: 0.875rem;
}

.blue-results-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.blue-result-item {
  background: white;
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.blue-result-item:hover,
.blue-result-item.focused {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.blue-result-container {
  display: flex;
  gap: 12px;
}

.blue-result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.blue-result-content {
  flex: 1;
  min-width: 0;
}

.blue-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.blue-result-sender {
  font-weight: 600;
  color: #1e293b;
}

.blue-result-time {
  color: #64748b;
  font-size: 0.875rem;
}

.blue-beam-target-icon {
  margin-left: auto;
  font-size: 1.2rem;
}

.blue-result-text {
  color: #374151;
  line-height: 1.5;
}

.blue-beam-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1));
  border-radius: 6px;
}

.blue-beam-bar {
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #93c5fd);
  border-radius: 2px;
  animation: blueBeamPulse 1.5s ease-in-out infinite;
}

@keyframes blueBeamPulse {
  0%, 100% { opacity: 0.6; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.2); }
}

.blue-beam-text {
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 600;
}

.blue-empty-state,
.blue-welcome-section {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
}

.blue-welcome-content {
  text-align: center;
  max-width: 400px;
}

.blue-welcome-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.blue-welcome-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.blue-welcome-subtitle {
  color: #64748b;
  margin-bottom: 24px;
}

.blue-features {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.blue-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 20px;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
}

.blue-modal-footer {
  padding: 16px 24px;
  background: rgba(59, 130, 246, 0.05);
  border-top: 1px solid rgba(59, 130, 246, 0.1);
}

.blue-keyboard-hints {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  font-size: 0.875rem;
  color: #64748b;
}

.blue-keyboard-hints kbd {
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.3s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style> 