# PostPro

Post-production management for professionals. Schedule, track, and manage your shows with a conversational interface.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Anthropic API key (for Claude integration)

### 1. Database Setup

**Option A: Local PostgreSQL**

```bash
# Create database
createdb postpro

# Or with psql
psql -c "CREATE DATABASE postpro"
```

**Option B: Hosted PostgreSQL**

Use any hosted Postgres service:
- [Neon](https://neon.tech) (free tier, serverless)
- [Supabase](https://supabase.com) (free tier, includes auth)
- [Railway](https://railway.app) (easy deploy)

### 2. Server Setup

```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

# Run migrations
npm run db:migrate

# Start server
npm run dev
```

Server runs on `http://localhost:3001`

### 3. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## API Reference

### Projects

```
GET    /api/projects                    List projects
GET    /api/projects/:id                Get project with all data
POST   /api/projects                    Create project
```

### Episodes

```
GET    /api/projects/:id/episodes       List episodes
PATCH  /api/episodes/:id                Update episode
```

### Milestones

```
GET    /api/projects/:id/milestones     List milestones
POST   /api/milestones                  Create milestone
PATCH  /api/milestones/:id              Update milestone
```

### Work Items

```
GET    /api/projects/:id/work-items     List work items (filterable)
POST   /api/work-items                  Create work item
```

### Commands (Claude-powered)

```
POST   /api/projects/:id/command
Body: { "input": "move 304 lock to Friday", "selectedEpisodeId": "..." }
```

---

## Milestone Templates

PostPro includes built-in templates for common workflows:

| Template | Description |
|----------|-------------|
| **Streaming Drama** | Amazon/Netflix style: EC → DC → PC → SC → FPL → finishing |
| **Broadcast Comedy** | Fast-paced half-hour: EC → DC → PC → NC → FPL |
| **Version Numbers** | Simple v1, v2, v3 naming |
| **Minimal** | Just the essentials: CUT → LOCK → FINISH → DELIVER |

When creating a project, specify a `templateId` to copy its milestone vocabulary.

---

## Customizing Milestone Vocabulary

Each project has its own milestone types. To add custom codes:

```bash
POST /api/projects/:id/milestone-types
{
  "code": "RC",
  "name": "Rough Cut",
  "aliases": ["R1", "Assembly"],
  "category": "editorial",
  "sortOrder": 1,
  "color": "#3B82F6",
  "requiresCompletionOf": []
}
```

Aliases allow flexible terminology—"RC", "R1", and "Assembly" all resolve to the same milestone type.

---

## Natural Language Commands

The `/command` endpoint accepts natural language:

| Example | Interpretation |
|---------|----------------|
| "move 304 lock to Friday" | Reschedule 304's FPL to next Friday |
| "push 305 mix by a week" | Delay 305's MIX by 7 days |
| "what's blocking 306?" | Show incomplete prerequisites |
| "what's late?" | List overdue milestones |
| "what if 303 FPL slips to 12/20?" | Preview cascade effects |

Claude understands post-production terminology and resolves aliases automatically.

---

## Architecture

```
postpro/
├── schema.sql          # PostgreSQL schema
├── server/
│   └── src/
│       ├── index.js           # Express server
│       ├── routes/api.js      # API endpoints
│       ├── services/claude.js # Claude integration
│       └── db/
│           ├── index.js       # Database connection
│           └── migrate.js     # Migration runner
└── src/
    ├── App.tsx                # React app
    ├── components/
    │   ├── GanttTimeline.tsx  # Main timeline view
    │   └── CommandBar.tsx     # Conversational interface
    ├── lib/store.ts           # Zustand state management
    └── types/index.ts         # TypeScript definitions
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Frontend URL for CORS |

---

## Deployment

### Railway (Recommended)

1. Push to GitHub
2. Connect Railway to your repo
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy

### Vercel + External DB

1. Deploy frontend to Vercel
2. Deploy server to Railway/Render
3. Set `CORS_ORIGIN` to Vercel URL

---

## Roadmap

- [x] Core data model
- [x] Gantt timeline view
- [x] Natural language commands
- [x] Claude integration
- [x] Flexible milestone vocabulary
- [ ] Drag-and-drop scheduling
- [ ] Dependency cascade visualization
- [ ] Work item tracking (VFX, ADR, etc.)
- [ ] Crew scheduling
- [ ] Export to studio formats
- [ ] Real-time collaboration
- [ ] Mobile views

---

## License

Private. All rights reserved.
