# Product Requirements Document (PRD)

# AI-Native Jira CLI for Jira Data Center

## 1. Executive Summary

Jira CLI is an AI-native command-line interface for interacting with **Jira Data Center 9.12.x**. It provides a stable, structured, and deterministic interface optimized for AI agents instead of traditional terminal users.

The project aims to simplify Jira automation, reduce token usage, and serve as a reusable foundation for future integrations such as MCP Servers and REST APIs.

---

# 2. Vision

Build the best AI-first CLI for Jira Data Center.

The CLI should enable AI assistants to interact with Jira reliably through structured commands, predictable outputs, and built-in AI Skills.

---

# 3. Problem Statement

Direct interaction with the Jira REST API is verbose and inconsistent for AI.

Challenges include:

- Large API responses
- Complex authentication
- Rich text in Atlassian Document Format (ADF)
- High token consumption
- Different prompt implementations across AI tools

Jira CLI provides a standardized interface that hides these complexities.

---

# 4. Goals

## Goals

- Provide a stable CLI for Jira Data Center.
- Optimize responses for AI.
- Reduce token usage.
- Convert Jira ADF into Markdown.
- Separate business logic from CLI.
- Include first-party AI Skills.

## Non-Goals

- Replace the Jira UI.
- Support Jira Cloud in V1.
- Implement every Jira REST endpoint.

---

# 5. Target Users

Primary users:

- Claude Code
- Cursor
- Codex CLI
- Gemini CLI
- ChatGPT
- MCP Clients

Secondary users:

- Developers
- DevOps Engineers

---

# 6. Supported Platform

Initial release supports:

- Jira Data Center 9.12.x

Reference:

- Jira Core REST API
- Jira Software Agile REST API

Jira Cloud is planned as a future adapter.

---

# 7. Functional Requirements

Core resources:

- Issue
- Sprint
- Board
- Project
- User
- Comment

Example commands:

```bash
jira-cli issue get FE-123

jira-cli issue search

jira-cli issue create

jira-cli issue update FE-123

jira-cli sprint list

jira-cli board list
```

---

# 8. Command Architecture

Commands should remain thin.

Responsibilities:

- Parse input
- Validate input
- Call services
- Format output

Business logic belongs to the Service Layer.

---

# 9. AI Integration

AI is the primary consumer.

The repository should include:

- AI Skills
- Command catalog
- Examples
- Prompt templates
- JSON Schemas

Supported platforms:

- Claude Code
- Cursor
- Codex
- Gemini CLI
- ChatGPT

---

# 10. Output Strategy

## Structured Data

Return JSON.

Example:

```json
{
  "key": "FE-123",
  "status": "In Progress"
}
```

## Rich Content

Return Markdown.

Applicable fields:

- Description
- Comments
- Acceptance Criteria

Supported formats:

- JSON
- Markdown
- Plain Text
- ADF (optional)

---

# 11. Repository Structure

```text
/
├── packages/
├── docs/
├── examples/
├── schemas/
├── skills/
│   ├── cursor/
│   ├── claude-code/
│   ├── codex/
│   └── gemini-cli/
└── README.md
```

---

# 12. High-Level Architecture

```text
AI Agent
    │
    ▼
AI Skill / MCP
    │
    ▼
jira-cli
    │
    ├── Command Router
    ├── Validation
    ├── Services
    ├── Formatter
    └── Jira Client
            │
            ▼
     Jira Data Center
```

---

# 13. Technical Principles

- AI-first design
- Resource-oriented commands
- Thin CLI
- Layered architecture
- Deterministic outputs
- Schema-first validation
- Business logic independent from CLI
- Extensible architecture

---

# 14. Design Inspiration

Inspired by the architecture of **Playwright CLI**:

- Modular commands
- Thin command layer
- Clear separation of concerns
- Stable interfaces
- Extensible architecture

The goal is not to replicate Playwright features, but to adopt its architectural principles.

---

# 15. Future Roadmap

- Jira Cloud Adapter
- MCP Server
- REST API Adapter
- Plugin System
- Batch Operations
- Response Caching
- Streaming Output
- TOON/TRON Formatter
- Markdown ↔ ADF Converter

---

# 16. Success Metrics

The project is successful when:

- AI agents can reliably use every command.
- Outputs are deterministic.
- Rich content is available in Markdown.
- Token usage is lower than raw Jira REST responses.
- Core services can be reused across CLI, MCP, and REST adapters.
- AI Skills work out of the box with supported AI assistants.

---

# 17. References

- Jira Data Center REST API 9.12.14
- Playwright CLI Architecture
- Atlassian Document Format (ADF)
- Model Context Protocol (MCP)
