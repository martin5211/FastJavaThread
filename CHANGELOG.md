# Changelog

## [0.2.0] - 2026-03-20

### Added
- MCP server for AI-assisted thread dump analysis (Claude, Copilot, Cursor, etc.)
- Five MCP tools: `analyze_thread_dump`, `detect_deadlocks`, `get_hot_methods`, `get_thread_summary`, `find_threads_by_method`
- Stdio and HTTP transport modes with optional Bearer token authentication
- `findThreadsByMethod()` core utility — search threads by method name with substring or regex matching, returns state breakdown and stack depth info
- VS Code settings for MCP transport, port, and auth configuration

## [0.1.1] - 2026-03-17

### Security
- Bundled Chart.js locally instead of loading from CDN
- Removed `unsafe-inline` from CSP `style-src` and CDN origin from `script-src`
- Replaced `Math.random()` nonce with `crypto.randomBytes`
- Fixed `escapeJsonForHtml` to escape `&` first, preventing double-escaping edge cases

### Fixed
- Stack frame regex now matches Kotlin (`.kt`), Scala (`.scala`), Groovy (`.groovy`), and inner-class filenames (`Outer$Inner.java`)
- Deadlock cycle reconstruction follows wait-for edges forward instead of DFS parent chain
- Auto-parse of `.tdump` files wrapped in try-catch to prevent crashes on malformed input
- Dashboard cold start now shows a placeholder message instead of empty charts
- Dashboard auto-refreshes when a `.tdump` file is opened while the panel is visible
- Webview panel disposed on extension deactivation to prevent stale service worker errors on reinstall

### Improved
- Replaced `@ts-nocheck` with `@ts-check` and JSDoc type annotations in webview script
- Scoped `lastResult` inside `registerCommands` and cleared on editor change

### Added
- `npm run copy-chartjs` build step
- GitHub Actions CI workflow


## [0.1.0] - 2024-01-15

- Initial release
