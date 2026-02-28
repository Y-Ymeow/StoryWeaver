The user wants me to create a comprehensive project summary based on the conversation history. Let me analyze what we've been working on:

1. This is an AI-powered script creation platform (AI 剧本房)
2. We've been fixing issues with the scene performance modal
3. Key issues fixed:
   - Round/turn management based on round_plan
   - Button display logic (user input vs AI performance)
   - Performance history display
   - Prompt improvements for context
   - Code refactoring

Let me create a comprehensive summary.# Project Summary

## Overall Goal
Build an AI-powered interactive script creation platform (AI 剧本房) where users can create rooms (scripts), characters, and scenes with AI assistance, using local database storage via File System Access API.

## Key Knowledge

### Technology Stack
- **Frontend**: Preact + Vite + TailwindCSS 4.0
- **Database**: sql.js (SQLite) with File System Access API for local file storage
- **PWA**: vite-plugin-pwa for offline support
- **AI Providers**: OpenAI, Gemini, DeepSeek, Zhipu (智谱), Groq, Cerebras, Mistral (all OpenAI-compatible)

### Architecture
- **State Management**: Custom Context-based store (`src/stores/`)
- **Database Layer**: `src/db/` with schema, migrations, and model operations
- **AI Layer**: `src/lib/openai/client.ts` with unified API client
- **UI Components**: `src/components/ui/` with common components and page-specific components
- **Rules Engine**: `src/lib/rules/` for performance logic

### Important Conventions
- **Path Aliases**: `@/stores`, `@/db`, `@/components`, `@/lib`, `@/providers`
- **Database**: Uses IndexedDB to persist file handles; actual DB stored in user-selected local files
- **Build Command**: `bun run build` | **Dev Command**: `bun run dev`
- **Round Plan Storage**: Stored as JSON string in `scenes.round_plan` field

### AI Provider Configuration
- Providers can be configured to support thinking mode (`supports_thinking: true`)
- Thinking parameters: `thinking_param_key`, `thinking_param_type` ('boolean' | 'object'), `thinking_param_default`
- In AI Input Config, users must check "🧠 这是思考模型" to enable thinking controls
- GLM-5/GLM-4.7 require explicit disable: `{ type: "disabled" }`

### Database Schema
- **rooms**: id, name, setting, plot_summary, worldview, tone, current_performance_summary
- **scenes**: id, room_id, name, description, goal, setup, summary, max_rounds, sort_order, **round_plan** (JSON)
- **characters**: id, room_id, name, background, dialogue_style, memory, is_user, type, sort_order
- **performances**: id, scene_id, character_id, content (JSON), primary_type, type, round, sort_order

## Recent Actions

### Completed Features
1. **[DONE]** Project initialization with Preact + Vite + TailwindCSS 4.0
2. **[DONE]** Database layer with sql.js integration and File System Access API
3. **[DONE]** Provider management UI with thinking mode configuration
4. **[DONE]** AI generation for rooms, characters, and scenes with JSON parsing
5. **[DONE]** Context-aware AI generation (passes story background, existing characters/scenes)
6. **[DONE]** Fixed JSON parsing to handle markdown code blocks
7. **[DONE]** Fixed modal closing issues after AI generation
8. **[DONE]** Fixed data merging issue in room data updates
9. **[DONE]** Created RoomDetailPage with scene management
10. **[DONE]** Implemented ScenePerformance component for turn-based dialogue
11. **[DONE]** Added CharacterManager with memory management
12. **[DONE]** Created PerformanceHistory component for viewing all records
13. **[DONE]** Implemented AI summary generation for scenes
14. **[DONE]** Streaming response support for AI generation
15. **[DONE]** Room-level AI summary generation
16. **[DONE]** Room export/import functionality
17. **[DONE]** ESLint configuration with TypeScript support
18. **[DONE]** Room edit and delete functionality in settings tab
19. **[DONE]** Scene round plan storage and retrieval
20. **[DONE]** Performance modal refactoring with rules engine

### Key Bug Fixes
- **sql.js import**: Changed from default import to named import `{ initSqlJs }`
- **TailwindCSS v4**: Removed `@source` directive, uses `@theme` for custom colors
- **Database constraints**: Fixed NOT NULL constraint errors in migrations
- **Thinking mode**: Now only sends thinking parameters when explicitly enabled
- **JSON parsing**: Added console.log debugging and markdown code block extraction
- **Modal closing**: Added `onClose()` call in `handleAIResult` to close parent modal
- **TypeScript errors**: Fixed missing `summary` field in Scene creation
- **Round plan storage**: Added `round_plan` field to scenes table with migration
- **Character matching**: Fixed comparison using character names instead of IDs
- **Round progression**: Fixed logic to check round completion based on round_plan
- **Button display**: Fixed to show correct button based on pending performers
- **Prompt context**: Fixed to include all content types (dialogue, action, thought, emotion)

### File Structure Created
```
src/
├── assets/app.css          # TailwindCSS with custom theme
├── components/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── RoomDetailPage.tsx
│   └── ui/
│       ├── common/         # Button, Card, Modal, Input, TextArea, DatabaseSelector, AIInputConfig, ModelSelector, ModelButton
│       ├── home/           # Settings, AIModelSettings, AIGenerate, CreateRoomWizard
│       ├── room/           # UserPerformanceInput, AIActor
│       └── scene/          # ScenePerformanceModal, SceneEditor, PerformanceList, PerformanceBubble
├── db/
│   ├── core.ts             # Database initialization
│   ├── file-system.ts      # File System Access API helpers
│   ├── index.ts            # Unified exports
│   ├── migrations.ts       # Database migrations (v1: initial, v2: add round_plan & primary_type)
│   ├── schema.ts           # Table definitions
│   └── models/             # CRUD operations for each table
├── lib/
│   ├── directive/          # Command processing
│   ├── memory/             # Memory management (generateCharacterMemory, generateSceneSummary)
│   ├── openai/
│   │   ├── client.ts       # AI client
│   │   ├── response.ts     # Response handling
│   │   └── providers.ts    # Provider utilities
│   ├── parser/             # Content parsing utilities
│   ├── prompts/            # Prompt templates (scene.ts, performance.ts)
│   └── rules/              # Business rules (performance.ts)
├── providers/              # AI provider implementations
├── stores/                 # Global state management
└── types/sql.js.d.ts       # TypeScript definitions
```

## Current Plan

### [DONE] Core Infrastructure
- [x] Project setup with Preact + Vite + TailwindCSS 4
- [x] Database layer with sql.js and File System Access API
- [x] PWA configuration
- [x] Global state management
- [x] Database migrations for round_plan and primary_type fields

### [DONE] AI Integration
- [x] Multi-provider support (OpenAI, Gemini, DeepSeek, Zhipu, etc.)
- [x] Thinking mode control for different model types
- [x] AI generation for rooms, characters, scenes
- [x] Context-aware generation (passes existing data to AI)
- [x] AI summary generation for scenes
- [x] Streaming response support
- [x] Improved prompt with all content types in context

### [DONE] UI Components
- [x] Database selector with file handle persistence
- [x] Provider management UI
- [x] AI input configuration with model selection
- [x] Create room wizard with multi-step flow
- [x] Room detail page with scene management
- [x] Scene performance/演出 system with turn-based dialogue
- [x] Character manager with memory management
- [x] Performance history viewer
- [x] Room summary generator
- [x] Room export/import
- [x] PerformanceList component
- [x] PerformanceBubble component
- [x] ModelButton component
- [x] UserPerformanceInput component

### [DONE] Business Logic
- [x] Round plan storage and retrieval
- [x] Round completion detection
- [x] Pending performer calculation
- [x] Character name-based matching (vs ID-based)
- [x] Button display logic (user input vs AI performance)
- [x] Manual round progression (no auto-trigger)
- [x] Rules engine extraction to `src/lib/rules/`

### [TODO] Next Steps
1. [TODO] Fix last round auto-finish without summary generation
2. [TODO] Fix round order: AI should perform before user in same round
3. [TODO] Add streaming response display in performance modal
4. [TODO] Improve memory auto-generation based on performance history
5. [TODO] Add mobile responsive improvements
6. [TODO] Create tutorial/onboarding flow
7. [TODO] Add collaborative features (multi-user support)

### Known Issues to Monitor
- Last round finishes automatically without user clicking "结束演出"
- In rounds with both AI and user, user must submit first to trigger AI (should be reversed)
- JSON parsing may still fail if AI returns malformed JSON
- Thinking mode behavior varies by model (user must configure per provider)
- File System Access API only works in secure contexts (HTTPS/localhost)
- Some older browsers don't support required APIs
- Performance history may be slow with large datasets (consider pagination)

---

## Summary Metadata
**Update time**: 2026-02-28
**Last build**: Successful (154.86 kB JS, 31.70 kB CSS)
**Database version**: 2 (added round_plan and primary_type fields)

---

## Summary Metadata
**Update time**: 2026-02-28T05:21:54.848Z 
