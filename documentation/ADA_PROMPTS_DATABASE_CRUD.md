# Ada Prompts Database CRUD Implementation

## Overview

Agent system prompts are now stored in MongoDB with full CRUD (Create, Read, Update, Delete) operations. The system includes:
- Database storage for persistence and multi-device sync
- localStorage fallback for offline support
- User-based prompt sets (multiple prompt sets per user)
- Default prompt set management

---

## Database Schema

### Collection: `agent_prompts`

```javascript
{
  _id: ObjectId,
  userId: String,           // User identifier (email, username, or session ID)
  name: String,            // Prompt set name (default: 'default')
  prompts: {
    level1: String,
    level2: String,
    level3: String,
    level4: String,
    level5: String,
    level6: String,
    level7: String,
    level8: String,
    level9: String,
    level10: String
  },
  isDefault: Boolean,      // Mark as default prompt set
  isActive: Boolean,       // Active/inactive flag (soft delete)
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
  updatedBy: String
}
```

### Indexes
- `{ userId: 1, name: 1 }` - Unique index (one prompt set per user/name)
- `{ userId: 1, isDefault: 1 }` - For finding default prompt set
- `{ userId: 1, isActive: 1 }` - For active prompt sets

---

## API Endpoints

### GET /api/agent/prompts
**Get prompts for user**

**Query Parameters:**
- `userId` (optional) - User identifier (defaults to 'default')
- `name` (optional) - Prompt set name (defaults to 'default')

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user@example.com",
    "name": "default",
    "prompts": {
      "level1": "...",
      "level2": "...",
      ...
    },
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /api/agent/prompts/list
**List all prompt sets for a user**

**Query Parameters:**
- `userId` (optional) - User identifier

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "default",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "custom",
      "isDefault": false,
      "createdAt": "2024-01-02T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/agent/prompts
**Create new prompt set**

**Body:**
```json
{
  "userId": "user@example.com",
  "name": "custom",
  "prompts": {
    "level1": "...",
    "level2": "...",
    ...
  },
  "isDefault": false
}
```

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user@example.com",
    "name": "custom",
    "prompts": { ... },
    "isDefault": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Prompt set created successfully"
}
```

**Errors:**
- `409` - Prompt set with this name already exists

---

### PUT /api/agent/prompts/:id
**Update existing prompt set by ID**

**Path Parameters:**
- `id` - Prompt set MongoDB ObjectId

**Body:**
```json
{
  "prompts": {
    "level1": "...",
    ...
  },
  "name": "updated-name",
  "isDefault": true
}
```

**Query Parameters:**
- `userId` (optional) - User identifier (for permission check)

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user@example.com",
    "name": "updated-name",
    "prompts": { ... },
    "isDefault": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Prompt set updated successfully"
}
```

**Errors:**
- `404` - Prompt set not found or permission denied
- `400` - Invalid prompt set ID

---

### PUT /api/agent/prompts
**Update or create prompt set by userId and name**

**Body:**
```json
{
  "userId": "user@example.com",
  "name": "default",
  "prompts": {
    "level1": "...",
    ...
  },
  "isDefault": true
}
```

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "user@example.com",
    "name": "default",
    "prompts": { ... },
    "isDefault": true,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Prompt set saved successfully"
}
```

**Note:** This endpoint uses `upsert: true`, so it will create if it doesn't exist or update if it does.

---

### DELETE /api/agent/prompts/:id
**Delete prompt set (soft delete)**

**Path Parameters:**
- `id` - Prompt set MongoDB ObjectId

**Query Parameters:**
- `userId` (optional) - User identifier (for permission check)

**Headers:**
- `X-User-Id` (optional) - User identifier

**Response:**
```json
{
  "success": true,
  "message": "Prompt set deleted successfully"
}
```

**Note:** This performs a soft delete (sets `isActive: false`) instead of hard delete.

**Errors:**
- `404` - Prompt set not found or permission denied
- `400` - Invalid prompt set ID

---

## Frontend Implementation

### Loading Prompts

**Location**: `js/app.js` - `loadAgentSystemPrompts()`

**Flow:**
1. Try to load from database via `/api/agent/prompts`
2. If successful, cache in localStorage
3. If database fails, fallback to localStorage
4. If localStorage empty, use defaults

**Code:**
```javascript
async loadAgentSystemPrompts() {
    // Try database first
    try {
        const userId = this.getUserId();
        const response = await fetch(`/api/agent/prompts?userId=${encodeURIComponent(userId)}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.prompts) {
                this.agentSystemPrompts = result.data.prompts;
                // Cache in localStorage
                localStorage.setItem('agentSystemPrompts', JSON.stringify(this.agentSystemPrompts));
                return;
            }
        }
    } catch (error) {
        console.warn('⚠️ Database load failed, using localStorage');
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('agentSystemPrompts');
    if (stored) {
        this.agentSystemPrompts = JSON.parse(stored);
    } else {
        this.agentSystemPrompts = this.getDefaultAgentSystemPrompts();
    }
}
```

### Saving Prompts

**Location**: `js/app.js` - `saveAgentSystemPrompts()`

**Flow:**
1. Collect prompts from UI
2. Save to database via `PUT /api/agent/prompts`
3. Always save to localStorage as fallback/cache

**Code:**
```javascript
async saveAgentSystemPrompts() {
    const prompts = { /* collect from UI */ };
    
    // Save to database
    try {
        const userId = this.getUserId();
        await fetch('/api/agent/prompts', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId
            },
            body: JSON.stringify({
                userId: userId,
                name: 'default',
                prompts: prompts,
                isDefault: true
            })
        });
    } catch (error) {
        console.warn('⚠️ Database save failed, saved to localStorage');
    }
    
    // Always cache in localStorage
    localStorage.setItem('agentSystemPrompts', JSON.stringify(prompts));
}
```

### User ID Management

**Location**: `js/app.js` - `getUserId()`

**Flow:**
1. Try to get from localStorage (`userId`, `userEmail`, `username`)
2. Fallback to session-based ID (persists for browser session)

**Code:**
```javascript
getUserId() {
    // Try localStorage first
    const storedUserId = localStorage.getItem('userId') || 
                        localStorage.getItem('userEmail') || 
                        localStorage.getItem('username');
    if (storedUserId) {
        return storedUserId;
    }
    
    // Fallback to session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}
```

---

## Features

### ✅ Full CRUD Operations
- **Create**: POST `/api/agent/prompts`
- **Read**: GET `/api/agent/prompts` and GET `/api/agent/prompts/list`
- **Update**: PUT `/api/agent/prompts/:id` or PUT `/api/agent/prompts`
- **Delete**: DELETE `/api/agent/prompts/:id` (soft delete)

### ✅ Multi-User Support
- Each user can have multiple prompt sets
- User identification via `userId` parameter or `X-User-Id` header
- Permission checks ensure users can only modify their own prompts

### ✅ Default Prompt Set
- Each user can have one default prompt set
- Setting a prompt set as default automatically unsets other defaults
- Default prompt set is loaded if no name is specified

### ✅ Offline Support
- localStorage fallback if database is unavailable
- Prompts cached in localStorage for fast access
- Graceful degradation if API calls fail

### ✅ Soft Delete
- Deleted prompt sets are marked `isActive: false`
- Can be restored if needed
- Not returned in queries (filtered by `isActive: true`)

---

## Migration from localStorage

### Existing Users
1. On first load, system tries database
2. If not found, falls back to localStorage
3. When user saves prompts, they're saved to database
4. localStorage is updated as cache

### New Users
1. System loads defaults
2. When user saves, prompts are created in database
3. localStorage is updated as cache

---

## Testing

### Test Database CRUD
```bash
# Create prompt set
curl -X POST http://localhost:3333/api/agent/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@example.com",
    "name": "default",
    "prompts": {
      "level1": "Test prompt 1",
      "level2": "Test prompt 2"
    },
    "isDefault": true
  }'

# Get prompt set
curl http://localhost:3333/api/agent/prompts?userId=test@example.com

# Update prompt set
curl -X PUT http://localhost:3333/api/agent/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@example.com",
    "name": "default",
    "prompts": {
      "level1": "Updated prompt 1",
      "level2": "Updated prompt 2"
    }
  }'

# List all prompt sets
curl http://localhost:3333/api/agent/prompts/list?userId=test@example.com

# Delete prompt set
curl -X DELETE http://localhost:3333/api/agent/prompts/PROMPT_SET_ID?userId=test@example.com
```

---

## Status: ✅ **IMPLEMENTED**

Full CRUD operations for agent prompts are now implemented with:
- Database storage in MongoDB
- localStorage fallback for offline support
- Multi-user support
- Default prompt set management
- Soft delete functionality

