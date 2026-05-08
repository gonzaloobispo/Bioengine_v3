# C4 Container: OpenGravity V4

## Containers

| Container | Description | Technology | Purpose |
|-----------|-------------|------------|---------|
| **Telegram Bot** | Ingestion point for user interaction. Handles webhooks/polling and voice transcription. | Node.js / Telegraf | Interface |
| **Worker (ProcessTurn)** | The asynchronous engine. Orchestrates LLM calls and tool execution. | TypeScript / Node.js | Logic Engine |
| **Firestore** | Persistent storage for conversation turns, message history, and user state. | Firebase Firestore | Database |
| **Memory DB** | Local SQLite/File-based storage for long-term user preferences. | SQLite / FS | Local Memory |
| **GOG CLI Bridge** | Binary bridge to interact with Google APIs securely. | Go / Binary | Infrastructure |

## Container Diagram
```mermaid
graph LR
    User[Gonzalo] -- "Telegram Message" --> TB[Telegram Bot]
    TB -- "Creates/Updates Turn" --> FS[Firestore]
    FS -- "Triggers / Polls" --> Worker[V4 Worker]
    Worker -- "Reasoning" --> Gemini[Gemini 2.5 Flash]
    Worker -- "Tools" --> CLI[GOG CLI Bridge]
    Worker -- "Local Stats" --> Mem[Memory DB]
    CLI -- "API Calls" --> Google[Google Workspace]
    
    style Worker fill:#bbf,stroke:#333,stroke-width:4px
```

## Infrastructure
- **Deployment**: Firebase Functions (proposed) or Local Server.
- **Observability**: Structured logging via `getLogger`.
