import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TOOL_DEFINITIONS, handleToolCall } from './tools';

function parseArgs(argv: string[]): { transport: string; port: number; authToken: string } {
    let transport = 'stdio';
    let port = 3100;
    let authToken = '';

    for (let i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case '--transport':
                transport = argv[++i] || 'stdio';
                break;
            case '--port':
                port = parseInt(argv[++i], 10) || 3100;
                break;
            case '--auth-token':
                authToken = argv[++i] || '';
                break;
        }
    }

    // Allow env vars as fallback
    transport = transport || process.env.MCP_TRANSPORT || 'stdio';
    port = port || parseInt(process.env.MCP_PORT || '3100', 10);
    authToken = authToken || process.env.MCP_AUTH_TOKEN || '';

    return { transport, port, authToken };
}

async function main() {
    const config = parseArgs(process.argv);

    const server = new Server(
        { name: 'fast-java-thread', version: '0.2.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFINITIONS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return handleToolCall(name, (args as Record<string, unknown>) || {});
    });

    if (config.transport === 'http') {
        await startHttpTransport(server, config.port, config.authToken);
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        process.stderr.write('Fast Java Thread MCP server running on stdio\n');
    }
}

async function startHttpTransport(server: Server, port: number, authToken: string) {
    const http = await import('http');
    const { StreamableHTTPServerTransport } = await import(
        '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );

    const httpServer = http.createServer(async (req, res) => {
        // Auth check
        if (authToken) {
            const authHeader = req.headers.authorization;
            if (!authHeader || authHeader !== `Bearer ${authToken}`) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
        }

        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);
        await transport.handleRequest(req, res);
    });

    httpServer.listen(port, () => {
        process.stderr.write(`Fast Java Thread MCP server listening on http://localhost:${port}\n`);
    });
}

main().catch((error) => {
    process.stderr.write(`Fatal error: ${error}\n`);
    process.exit(1);
});
