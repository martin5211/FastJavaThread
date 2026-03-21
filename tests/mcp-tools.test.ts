import { handleToolCall, TOOL_DEFINITIONS } from '../src/mcp/tools';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_PATH = path.join(__dirname, '..', 'samples', 'sample1.tdump');
const SAMPLE_TEXT = fs.readFileSync(SAMPLE_PATH, 'utf-8');

describe('TOOL_DEFINITIONS', () => {
    it('should define 5 tools', () => {
        expect(TOOL_DEFINITIONS).toHaveLength(5);
    });

    it('should have unique names', () => {
        const names = TOOL_DEFINITIONS.map(t => t.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('all tools should require thread_dump_text', () => {
        for (const tool of TOOL_DEFINITIONS) {
            expect(tool.inputSchema.required).toContain('thread_dump_text');
        }
    });
});

describe('handleToolCall', () => {
    describe('analyze_thread_dump', () => {
        it('should return full analysis', () => {
            const result = handleToolCall('analyze_thread_dump', { thread_dump_text: SAMPLE_TEXT });
            expect(result.isError).toBeUndefined();
            const data = JSON.parse(result.content[0].text);
            expect(data.totalThreads).toBeGreaterThan(0);
            expect(data.stateGroups).toBeDefined();
            expect(data.hotMethods).toBeDefined();
            expect(data.deadlocks).toBeDefined();
        });

        it('should respect top_n_methods', () => {
            const result = handleToolCall('analyze_thread_dump', {
                thread_dump_text: SAMPLE_TEXT,
                top_n_methods: 3,
            });
            const data = JSON.parse(result.content[0].text);
            expect(data.hotMethods.length).toBeLessThanOrEqual(3);
        });
    });

    describe('detect_deadlocks', () => {
        it('should detect deadlocks in sample', () => {
            const result = handleToolCall('detect_deadlocks', { thread_dump_text: SAMPLE_TEXT });
            expect(result.isError).toBeUndefined();
            // sample1.tdump has a deadlock
            const data = JSON.parse(result.content[0].text);
            expect(data.length).toBeGreaterThan(0);
        });

        it('should return message for no deadlocks', () => {
            const noDlText = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (11.0.2+9-LTS mixed mode):

"main" #1 prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 runnable [0x00007f1230000000]
   java.lang.Thread.State: RUNNABLE
\tat com.example.Main.run(Main.java:10)
`;
            const result = handleToolCall('detect_deadlocks', { thread_dump_text: noDlText });
            expect(result.content[0].text).toBe('No deadlocks detected.');
        });
    });

    describe('get_hot_methods', () => {
        it('should return hot methods', () => {
            const result = handleToolCall('get_hot_methods', { thread_dump_text: SAMPLE_TEXT });
            expect(result.isError).toBeUndefined();
            const data = JSON.parse(result.content[0].text);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toHaveProperty('method');
            expect(data[0]).toHaveProperty('count');
        });
    });

    describe('get_thread_summary', () => {
        it('should return summary with counts', () => {
            const result = handleToolCall('get_thread_summary', { thread_dump_text: SAMPLE_TEXT });
            expect(result.isError).toBeUndefined();
            const data = JSON.parse(result.content[0].text);
            expect(data.totalThreads).toBeGreaterThan(0);
            expect(data.stateCounts).toBeDefined();
            expect(typeof data.deadlockCount).toBe('number');
        });
    });

    describe('find_threads_by_method', () => {
        it('should find threads by method', () => {
            const result = handleToolCall('find_threads_by_method', {
                thread_dump_text: SAMPLE_TEXT,
                method: 'Worker.doWork',
            });
            expect(result.isError).toBeUndefined();
            const data = JSON.parse(result.content[0].text);
            expect(data.totalMatches).toBeGreaterThan(0);
            expect(data.stateBreakdown).toBeDefined();
            expect(data.results[0].matchingFrames).toBeDefined();
        });

        it('should require method parameter', () => {
            const result = handleToolCall('find_threads_by_method', {
                thread_dump_text: SAMPLE_TEXT,
            });
            expect(result.isError).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should return error for missing thread_dump_text', () => {
            const result = handleToolCall('analyze_thread_dump', {});
            expect(result.isError).toBe(true);
        });

        it('should return error for unknown tool', () => {
            const result = handleToolCall('nonexistent_tool', { thread_dump_text: 'test' });
            expect(result.isError).toBe(true);
        });
    });
});
