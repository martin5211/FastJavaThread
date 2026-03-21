# Privacy Policy

## Data Collection

Fast Java Thread does **not** collect, transmit, or store any user data.

## How It Works

- All thread dump parsing and analysis happens **locally** within your VS Code instance.
- No data is sent to any remote server or third-party service.
- The extension does not use telemetry, analytics, or crash reporting.

## MCP Server

The built-in MCP server runs locally on your machine. When using stdio transport (the default), communication stays within your local process. When using HTTP transport, the server listens only on `localhost` at the port you configure. Token authentication is available for HTTP mode but disabled by default.

Thread dump content is passed directly to the MCP tools in-memory — nothing is logged, cached, or written to disk by the server.

## Network Access

This extension makes no external network requests. Chart.js is bundled locally.

## File Access

The extension reads `.tdump` files that you explicitly open in VS Code. It does not scan, index, or access any other files on your system.
