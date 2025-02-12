# Fechatter Frontend Functionality Guide

## Overview

Fechatter frontend is a modern Vue.js 3 application that provides a comprehensive chat interface for real-time communication. It uses Pinia for state management, Vue Router for navigation, and Tailwind CSS for styling.

## Architecture Overview

### Technology Stack
- **Framework**: Vue.js 3 (Composition API)
- **State Management**: Pinia
- **Router**: Vue Router 4
- **HTTP Client**: Axios with custom API service
- **Build Tool**: Vite
- **Desktop App**: Tauri (optional)
- **Styling**: Tailwind CSS

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── chat/           # Chat-specific components
│   ├── common/         # Generic UI components
│   ├── search/         # Search-related components
│   ├── ui/             # Base UI components
│   └── workspace/      # Workspace management components
├── composables/        # Vue composables for reusable logic
├── router/            # Vue Router configuration
├── services/          # API and external services
├── stores/            # Pinia stores for state management
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── views/             # Page-level components
```

## Core Features

### 1. Authentication System

#### Components
- **Login.vue**: User authentication interface
- **Register.vue**: New user registration

#### Store: `useAuthStore`
**State:**
- `token`: JWT access token
- `refreshToken`: Refresh token for token renewal
- `user`: Current user information
- `loading`: Authentication operation state
- `error`: Authentication error messages
- `isAuthenticated`: Authentication status

**Actions:**
- `login(email, password)`: Authenticate user
- `register(fullname, email, password)`: Register new user
- `logout()`: Sign out user
- `refreshAccessToken()`: Renew access token
- `initializeAuth()`: Initialize auth state from localStorage

**API Endpoints:**
- `POST /api/signin`: User login
- `POST /api/signup`: User registration
- `POST /api/logout`: User logout
- `POST /api/refresh`: Token refresh

### 2. Chat Management System

#### Components
- **Sidebar.vue**: Chat list and navigation
- **MessageList.vue**: Display chat messages
- **MessageInput.vue**: Send new messages
- **MessageItem.vue**: Individual message display
- **MessageContextMenu.vue**: Message action menu

#### Store: `useChatStore`
**State:**
- `chats`: Array of user's chats
- `messages`: Current chat messages
- `currentChatId`: Active chat ID
- `loading`: Loading state
- `error`: Error messages
- `hasMoreMessages`: Pagination flag
- `chatMembers`: Chat member information

**Key Actions:**
- `fetchChats()`: Load user's chat list
- `createChat(name, members, description, chatType)`: Create new chat
- `updateChat(chatId, name, description)`: Update chat information
- `deleteChat(chatId)`: Delete chat
- `fetchMessages(chatId, limit)`: Load chat messages
- `sendMessage(chatId, content, files)`: Send new message
- `fetchChatMembers(chatId)`: Load chat participants
- `searchMessages(chatId, query)`: Search within chat

**Chat Types:**
- `Single`: Direct message (1-on-1)
- `Group`: Group chat (3+ members)
- `PrivateChannel`: Private channel with invited members
- `PublicChannel`: Public channel (anyone can join)

**API Endpoints:**
- `GET /api/chats`: List user chats
- `POST /api/chat`: Create new chat
- `PATCH /api/chat/{id}`: Update chat
- `DELETE /api/chat/{id}`: Delete chat
- `GET /api/chat/{id}/messages`: Get chat messages
- `POST /api/chat/{id}/messages`: Send message
- `GET /api/chat/{id}/members`: Get chat members

### 3. User Management

#### Store: `useUserStore`
**State:**
- `users`: All system users
- `workspaceUsers`: Users in current workspace
- `loading`: Loading state
- `error`: Error messages

**Actions:**
- `fetchWorkspaceUsers()`: Load workspace members
- `getUserById(userId)`: Find user by ID
- `getUserByEmail(email)`: Find user by email

**API Endpoints:**
- `GET /api/users`: List workspace users

### 4. Workspace Management

#### Components
- **WorkspaceSelector.vue**: Switch between workspaces
- **WorkspaceSettings.vue**: Manage workspace settings

#### Store: `useWorkspaceStore`
**State:**
- `currentWorkspace`: Active workspace information
- `workspaces`: Available workspaces
- `workspaceUsers`: Workspace members
- `workspaceChats`: Workspace chat statistics

**Actions:**
- `fetchCurrentWorkspace()`: Load current workspace
- `updateWorkspace(name, description)`: Update workspace
- `inviteUserToWorkspace(email, role)`: Invite new member
- `transferWorkspaceOwnership(newOwnerId)`: Transfer ownership

### 5. Real-time Features

#### WebSocket Integration
- Real-time message updates
- Typing indicators
- User presence status
- Live notifications

#### Composables
- **useNotifications**: Toast notification system
- **useTouch**: Touch/gesture handling for mobile

### 6. Search Functionality

#### Components
- **AdvancedSearch.vue**: Full-featured search interface
- **CompactSearch.vue**: Quick search component
- **SearchResults.vue**: Display search results

**Search Types:**
- Simple text search
- Advanced filters (date range, sender, message type)
- Cross-chat search
- File content search

### 7. File Management

**Features:**
- File upload with progress tracking
- Multiple file formats support
- File preview and download
- Drag-and-drop interface

**API Endpoints:**
- `POST /api/upload`: Upload files
- File serving at configured endpoints

### 8. Responsive Design

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

**Mobile Features:**
- Collapsible sidebar
- Touch gestures
- Mobile-optimized input
- Responsive layouts

## API Integration

### HTTP Client Configuration

```javascript
// services/api.js
const api = axios.create({
  baseURL: 'http://127.0.0.1:6688/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Authentication Interceptor
- Automatically adds JWT tokens to requests
- Handles token refresh on 401 responses
- Redirects to login on authentication failure

### Error Handling
- Network connectivity detection
- Automatic retry for failed requests
- User-friendly error messages
- Graceful degradation

## State Management

### Pinia Stores Structure

Each store follows a consistent pattern:
```javascript
export const useExampleStore = defineStore('example', {
  state: () => ({
    // Reactive state
  }),
  
  getters: {
    // Computed values
  },
  
  actions: {
    // Methods for state mutations and API calls
  }
});
```

### Data Flow
1. Components call store actions
2. Actions make API requests via the api service
3. Successful responses update store state
4. Components reactively update via computed properties
5. Errors are captured and displayed to users

## Development Workflow

### Starting Development
```bash
npm install          # Install dependencies
npm run dev         # Start development server
```

### Building for Production
```bash
npm run build       # Build for production
npm run preview     # Preview production build
```

### Testing
- Unit tests with Vitest
- Component testing with Vue Test Utils
- E2E testing with Playwright (separate package)

## Configuration

### Environment Variables
```javascript
// Available in import.meta.env
VITE_API_BASE_URL=http://localhost:6688/api
VITE_WS_URL=ws://localhost:6688/ws
```

### Vite Configuration
- Path aliases (`@/` for `src/`)
- Development server on port 1420
- Tauri integration for desktop builds

## Best Practices

### Component Development
- Use Composition API consistently
- Implement proper prop validation
- Use TypeScript for type safety
- Follow Vue.js style guide

### State Management
- Keep stores focused and specific
- Use getters for computed state
- Handle async operations in actions
- Implement proper error handling

### Performance
- Lazy load routes and components
- Implement virtual scrolling for large lists
- Use computed properties for expensive operations
- Optimize image loading and caching

## Deployment

### Web Application
1. Build the application: `npm run build`
2. Deploy `dist/` folder to web server
3. Configure API endpoint environment variables

### Desktop Application (Tauri)
1. Build Tauri app: `npm run tauri build`
2. Distribute platform-specific installers
3. Configure auto-updates if needed

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check backend server is running on port 6688
   - Verify API base URL configuration
   - Check network connectivity

2. **Authentication Issues**
   - Clear localStorage and retry login
   - Check token expiration
   - Verify backend JWT configuration

3. **Build Errors**
   - Update dependencies: `npm update`
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Vite configuration

4. **WebSocket Connection Failed**
   - Verify WebSocket server configuration
   - Check firewall and proxy settings
   - Fallback to HTTP polling if needed

## Future Enhancements

### Planned Features
- Voice and video calling
- Screen sharing
- Advanced file collaboration
- Custom emoji and reactions
- Thread conversations
- Message scheduling
- Advanced permissions system

### Technical Improvements
- PWA capabilities
- Offline message queue
- Advanced caching strategies
- Performance monitoring
- A11y improvements

## API Documentation

### Backend Compatibility
The frontend is designed to work with the Fechatter Rust backend API. Key integration points:

- **Authentication**: JWT-based with refresh tokens
- **Real-time**: WebSocket connections for live updates
- **File Handling**: Multipart uploads with progress tracking
- **Search**: Full-text search with filters
- **Notifications**: Real-time push notifications

### Response Format
```javascript
// Success Response
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601",
    "version": "v1"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "suggestion": "How to fix it"
  }
}
```

This documentation provides a comprehensive overview of the Fechatter frontend functionality, architecture, and implementation details.