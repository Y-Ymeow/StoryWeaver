The user wants me to create a comprehensive project summary based on the conversation history. Let me analyze what we've been working on:

1. This is an AI-powered script creation platform (AI 剧本房)
2. We've been working on multiple issues:
   - Round/turn management for scene performances
   - Temporary character support (路人甲/配角)
   - AI generation optimization (speed, streaming)
   - Thinking mode configuration for different AI providers
   - JSON parsing improvements
   - Batch generation for rounds

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
- **Hooks**: `src/hooks/` for reusable logic (useAI, useAIChatStream, useProviders)

### Important Conventions
- **Path Aliases**: `@/stores`, `@/db`, `@/components`, `@/lib`, `@/providers`
- **Database**: Uses IndexedDB to persist file handles; actual DB stored in user-selected local files
- **Build Command**: `bun run build` | **Dev Command**: `bun run dev`
- **Round Plan Storage**: Stored as JSON string in `scenes.round_plan` field

### AI Provider Configuration
- Providers configured with `supports_thinking: true` for thinking mode support
- Thinking parameters: `thinking_param_key`, `thinking_param_type` ('boolean' | 'object'), `thinking_param_default`
- **Thinking mode is OFF by default** - users must explicitly enable it
- When `enableThinking=false`, no thinking parameters are sent (compatible with all providers)
- GLM-5/GLM-4.7 require explicit disable: `{ type: "disabled" }` (handled via provider presets)

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
6. **[DONE]** Fixed JSON parsing to handle markdown code blocks and extract JSON from mixed content
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
21. **[DONE]** Temporary character support (服务员/店员/保安/路人甲等)
22. **[DONE]** Line hint system for performance guidance (direction-based, not specific lines)
23. **[DONE]** Batch round generation (1/2/3/5/10 rounds at a time)
24. **[DONE]** Component refactoring (ScenePerformanceModal → Header/Footer/SummaryEditModal)
25. **[DONE]** AI hooks extraction (useAI, useAIChatStream)

### Key Bug Fixes
- **sql.js import**: Changed from default import to named import `{ initSqlJs }`
- **TailwindCSS v4**: Removed `@source` directive, uses `@theme` for custom colors
- **Database constraints**: Fixed NOT NULL constraint errors in migrations
- **Thinking mode**: Now only sends thinking parameters when explicitly enabled
- **JSON parsing**: Added robust extraction - finds first `{`/`[` and last `}`/`]`, removes markdown blocks
- **Modal closing**: Added `onClose()` call in `handleAIResult` to close parent modal
- **TypeScript errors**: Fixed missing `summary` field in Scene creation
- **Round plan storage**: Added `round_plan` field to scenes table with migration
- **Character matching**: Fixed comparison using character names instead of IDs
- **Round progression**: Fixed logic to check round completion based on round_plan
- **Button display**: Fixed to show correct button based on pending performers
- **Prompt context**: Fixed to include all content types (dialogue, action, thought, emotion)
- **Prompt optimization**: Balanced brevity with sufficient guidance for quality output
- **Thinking mode defaults**: Changed to OFF by default, only sends parameters when enabled

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
│       ├── room/           # UserPerformanceInput, AIActor, CharacterManager
│       └── scene/          # ScenePerformanceModal, ScenePerformanceHeader, ScenePerformanceFooter, SceneEditor, AIGenerateModal, RoundPlanModal, SummaryEditModal, PerformanceList, PerformanceBubble
├── db/
│   ├── core.ts             # Database initialization
│   ├── file-system.ts      # File System Access API helpers
│   ├── index.ts            # Unified exports
│   ├── migrations.ts       # Database migrations (v1: initial, v2: add round_plan & primary_type)
│   ├── schema.ts           # Table definitions
│   └── models/             # CRUD operations for each table
├── hooks/
│   ├── index.ts            # Hook exports
│   ├── useAI.ts            # AI chat with JSON parsing and streaming support
│   ├── useAIChatStream.ts  # Streaming AI chat
│   └── useProviders.ts     # Provider configuration management
├── lib/
│   ├── directive/          # Command processing
│   ├── memory/             # Memory management (generateCharacterMemory, generateSceneSummary)
│   ├── openai/
│   │   ├── client.ts       # AI client with thinking mode support
│   │   ├── response.ts     # Response handling
│   │   └── providers.ts    # Provider utilities
│   ├── parser/             # Content parsing utilities
│   ├── prompts/            # Prompt templates (scene.ts, scene-editor.ts, performance.ts)
│   └── rules/              # Business rules (performance.ts, character-helper.ts)
├── providers/              # AI provider implementations with presets
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
- [x] Robust JSON parsing (extracts from mixed content)

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
- [x] ScenePerformanceHeader/Footer components
- [x] SummaryEditModal component
- [x] AIGenerateModal component
- [x] RoundPlanModal component

### [DONE] Business Logic
- [x] Round plan storage and retrieval
- [x] Round completion detection
- [x] Pending performer calculation
- [x] Character name-based matching (vs ID-based)
- [x] Button display logic (user input vs AI performance)
- [x] Manual round progression (no auto-trigger)
- [x] Rules engine extraction to `src/lib/rules/`
- [x] Temporary character support
- [x] Line hint system (direction-based guidance)
- [x] Batch round generation (1/2/3/5/10 rounds)

### [TODO] Next Steps
1. [TODO] Add streaming response display in AI generation modals (scene/character/round planning)
2. [TODO] Improve memory auto-generation based on performance history
3. [TODO] Add mobile responsive improvements
4. [TODO] Create tutorial/onboarding flow
5. [TODO] Add collaborative features (multi-user support)
6. [TODO] Optimize AI generation speed with better token management

### Known Issues to Monitor
- Thinking mode behavior varies by model (user must configure per provider)
- File System Access API only works in secure contexts (HTTPS/localhost)
- Some older browsers don't support required APIs
- Performance history may be slow with large datasets (consider pagination)
- AI may not always follow prompt instructions for JSON format (robust parsing helps)
- Batch generation reduces wait time but requires multiple clicks for full scenes

---

## Summary Metadata
**Update time**: 2026-03-02
**Version**: 0.1.0
**Last build**: Successful (187.14 kB JS, 39.65 kB CSS)
**Database version**: 2 (added round_plan and primary_type fields)

---

## Summary Metadata
**Update time**: 2026-03-02T12:34:08.756Z 
