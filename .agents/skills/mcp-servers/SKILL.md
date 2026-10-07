---
name: mcp-servers
description: "Command Center and Quick-Access Gateway for all 13 configured MCP Servers: Context7, Figma, MongoDB, MySQL, Playwright, Serena, GitHub, Memory, Shadcn, Puppeteer, Sequential Thinking, Filesystem, and Lovable."
---

# MCP Server Command Center & Gateway

Provides direct access, status inspection, and operational triggers for all 13 Model Context Protocol (MCP) servers integrated into the environment.

## Available MCP Servers & Triggers

| Server Name | Primary Capabilities | Quick Trigger Commands / Prompts |
| :--- | :--- | :--- |
| **`context7`** | Real-time official documentation lookup for libraries and frameworks. | "Use context7 to look up documentation for [library]" |
| **`figma`** | Reads Figma design files, components, tokens, and frames via API. | "Inspect Figma file and extract design tokens / styles" |
| **`mongodb`** | Direct MongoDB Atlas/Local DB inspection, collection querying, indexing, and stats. | "Query MongoDB collection [name] to view records" |
| **`mysql`** | Direct SQL query execution against local MySQL server. | "Run query on MySQL: SELECT * FROM ..." |
| **`playwright`** | Full visual browser automation, click actions, form filling, and screenshots. | "Run browser_subagent to test [user journey]" |
| **`serena`** | Semantic code intelligence, AST symbol inspection, call hierarchy, and refactoring. | "Use serena to find all references to [symbol]" |
| **`github`** | GitHub repository management: PRs, issues, commits, branch management. | "Check recent commits or open PR on GitHub" |
| **`shadcn`** | Shadcn/UI component registry lookup, code snippets, and audit checklists. | "Search shadcn registry for [component]" |
| **`memory`** | Knowledge graph memory for persistent project architectural decisions. | "Save this decision to memory graph" |
| **`puppeteer`** | Headless browser execution and visual capture. | "Capture screenshot using puppeteer" |
| **`sequential-thinking`** | Multi-step algorithmic reasoning and formal problem solving. | "Use sequential thinking to design algorithm" |
| **`filesystem`** | High-speed secure local filesystem access across `AtoZ Coder`. | "Read / write files in workspace" |
| **`lovable`** | Lovable platform cloud integration. | "Connect to Lovable endpoint" |

## How to Access
When this slash command is invoked, inspect the health of the requested MCP server or execute the desired MCP tool call immediately.
