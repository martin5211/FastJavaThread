import { parseThreadDump } from '../parser/parser';
import { detectDeadlocks } from '../utils/deadlock';
import { groupByState, getHotMethods } from '../utils/grouping';
import { findThreadsByMethod } from '../utils/search';
import {
    serializeAnalysisResult,
    serializeThreadSummary,
    serializeDeadlocks,
    serializeHotMethods,
    serializeMethodSearch,
} from './serialization';

export const TOOL_DEFINITIONS = [
    {
        name: 'analyze_thread_dump',
        description:
            'Parse a JVM thread dump and return full analysis including thread states, hot methods, and deadlock detection. Provide the raw thread dump text as input.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                thread_dump_text: {
                    type: 'string',
                    description: 'Raw JVM thread dump text (as produced by jstack, kill -3, or VisualVM)',
                },
                top_n_methods: {
                    type: 'number',
                    description: 'Number of hot methods to return (default: 10)',
                },
            },
            required: ['thread_dump_text'],
        },
    },
    {
        name: 'detect_deadlocks',
        description:
            'Analyze a JVM thread dump specifically for deadlock cycles. Returns detailed information about which threads are involved and what locks they hold/wait on.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                thread_dump_text: {
                    type: 'string',
                    description: 'Raw JVM thread dump text',
                },
            },
            required: ['thread_dump_text'],
        },
    },
    {
        name: 'get_hot_methods',
        description:
            'Find the most frequently occurring methods across all thread stack traces. Useful for identifying CPU-intensive code paths or common wait points.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                thread_dump_text: {
                    type: 'string',
                    description: 'Raw JVM thread dump text',
                },
                top_n: {
                    type: 'number',
                    description: 'Number of top methods to return (default: 10)',
                },
            },
            required: ['thread_dump_text'],
        },
    },
    {
        name: 'get_thread_summary',
        description:
            'Get a concise summary of a JVM thread dump: total thread count, breakdown by state (RUNNABLE, BLOCKED, WAITING, etc.), deadlock count, timestamp, and JVM version.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                thread_dump_text: {
                    type: 'string',
                    description: 'Raw JVM thread dump text',
                },
            },
            required: ['thread_dump_text'],
        },
    },
    {
        name: 'find_threads_by_method',
        description:
            'Find all threads that have a specific method in their stack trace. Returns matching threads with their state, lock info, and the matching stack frames with depth (0 = top of stack / executing). Supports substring or regex matching against className.methodName.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                thread_dump_text: {
                    type: 'string',
                    description: 'Raw JVM thread dump text',
                },
                method: {
                    type: 'string',
                    description: 'Method to search for (e.g. "SocketInputStream.read" or "com.example.MyService.process")',
                },
                regex: {
                    type: 'boolean',
                    description: 'Treat method as a regex pattern (default: false, uses substring match)',
                },
            },
            required: ['thread_dump_text', 'method'],
        },
    },
];

export function handleToolCall(
    name: string,
    args: Record<string, unknown>
): { content: { type: string; text: string }[]; isError?: boolean } {
    try {
        const text = args.thread_dump_text as string;
        if (!text || typeof text !== 'string') {
            return {
                content: [{ type: 'text', text: 'Error: thread_dump_text is required and must be a string' }],
                isError: true,
            };
        }

        const dump = parseThreadDump(text);

        switch (name) {
            case 'analyze_thread_dump': {
                const topN = (args.top_n_methods as number) || 10;
                const stateGroups = groupByState(dump.threads);
                const hotMethods = getHotMethods(dump.threads, topN);
                const deadlocks = detectDeadlocks(dump.threads);
                const result = serializeAnalysisResult({ dump, stateGroups, hotMethods, deadlocks });
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'detect_deadlocks': {
                const deadlocks = detectDeadlocks(dump.threads);
                const result = serializeDeadlocks(deadlocks);
                return {
                    content: [{
                        type: 'text',
                        text: deadlocks.length === 0
                            ? 'No deadlocks detected.'
                            : JSON.stringify(result, null, 2),
                    }],
                };
            }

            case 'get_hot_methods': {
                const topN = (args.top_n as number) || 10;
                const methods = getHotMethods(dump.threads, topN);
                const result = serializeHotMethods(methods);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'get_thread_summary': {
                const deadlocks = detectDeadlocks(dump.threads);
                const result = serializeThreadSummary(dump, deadlocks);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            case 'find_threads_by_method': {
                const method = args.method as string;
                if (!method || typeof method !== 'string') {
                    return {
                        content: [{ type: 'text', text: 'Error: method is required and must be a string' }],
                        isError: true,
                    };
                }
                const regex = (args.regex as boolean) || false;
                const summary = findThreadsByMethod(dump.threads, method, { regex });
                const result = serializeMethodSearch(summary);
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }

            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error processing thread dump: ${message}` }],
            isError: true,
        };
    }
}
