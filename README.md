# Fast Java Thread

[![VS Code Marketplace](https://vsmarketplacebadges.dev/version-short/MartinCaminoa.fast-java-thread.png)](https://marketplace.visualstudio.com/items?itemName=MartinCaminoa.fast-java-thread) [![Installs](https://vsmarketplacebadges.dev/installs-short/MartinCaminoa.fast-java-thread.png)](https://marketplace.visualstudio.com/items?itemName=MartinCaminoa.fast-java-thread)

VS Code extension for analyzing JVM thread dumps (`.tdump` files).



## Features

- **Tree View Sidebar** — Threads grouped by state (RUNNABLE, BLOCKED, WAITING, etc.) with counts and icons
- **Dashboard** — Pie chart of thread states, top 10 hot methods, deadlock alerts
- **Click-to-Navigate** — Click a thread in the tree to jump to its location in the dump file
- **Deadlock Detection** — Automatic cycle detection in lock wait graphs
- **Method Search** — Find all threads running a specific method, with state breakdown and lock info
- **MCP Server** — Expose analysis tools to AI assistants (Claude, Copilot, Cursor) via the Model Context Protocol
- **Java 8 & 11+ Support** — Parses both formats (with and without `cpu=`/`elapsed=` fields)

## Screenshots

![pie-chart-image](assets/screenshot-2.png)

## Usage

1. Open a `.tdump` file in VS Code
2. The tree view populates automatically in the **Fast Java Thread** sidebar
3. Right-click in the editor and select **Analyze Thread Dump** for full analysis
4. Run **Fast Java Thread: Show Dashboard** from the command palette for the webview dashboard

## Commands

| Command | Description |
|---------|-------------|
| `Fast Java Thread: Analyze Thread Dump` | Parse the active .tdump file and populate the tree view |
| `Fast Java Thread: Show Dashboard` | Open the webview dashboard with charts and deadlock alerts |

## MCP Server

The extension includes an MCP server that lets AI assistants analyze thread dumps directly. It works with any MCP-compatible client — Claude Code, Claude Desktop, GitHub Copilot Chat, Cursor, etc.

### Available tools

| Tool | What it does |
|------|-------------|
| `analyze_thread_dump` | Full analysis: thread states, hot methods, and deadlock detection |
| `detect_deadlocks` | Focused deadlock cycle detection with lock chain details |
| `get_hot_methods` | Most frequently occurring methods across all stack traces |
| `get_thread_summary` | Quick overview: thread count, state breakdown, deadlock count |
| `find_threads_by_method` | Find threads running a specific method, with state and lock info |

### Standalone (stdio)

Point your MCP client at the server:

```bash
node out/src/mcp/server.js
```

For Claude Code, add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "fast-java-thread": {
      "command": "node",
      "args": ["path/to/FastJavaThread/out/src/mcp/server.js"]
    }
  }
}
```

### HTTP mode

For network access (e.g. from a Tauri app), run with HTTP transport:

```bash
node out/src/mcp/server.js --transport http --port 3100 --auth-token mytoken
```

### VS Code settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fastJavaThread.mcp.transport` | `stdio` | Transport mode: `stdio` or `http` |
| `fastJavaThread.mcp.port` | `3100` | Port for HTTP transport |
| `fastJavaThread.mcp.auth.enabled` | `false` | Enable Bearer token auth (HTTP only) |
| `fastJavaThread.mcp.auth.token` | `""` | Bearer token value |

## Development

```bash
npm install
npm run compile
npm test
```

Press **F5** in VS Code to launch the Extension Development Host.

## File Format

The extension expects `.tdump` files containing standard JVM thread dump output, as produced by `jstack`, `kill -3`, or JMX `ThreadMXBean.dumpAllThreads()`.
