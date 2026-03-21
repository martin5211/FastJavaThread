import { parseThreadDump } from '../src/parser/parser';
import { findThreadsByMethod } from '../src/utils/search';
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_DUMP = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (11.0.2+9-LTS mixed mode):

"http-handler-1" #10 daemon prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 runnable [0x00007f1230000000]
   java.lang.Thread.State: RUNNABLE
\tat java.net.SocketInputStream.read(SocketInputStream.java:150)
\tat com.example.HttpHandler.handle(HttpHandler.java:42)
\tat com.example.Server.dispatch(Server.java:100)

"http-handler-2" #11 daemon prio=5 os_prio=0 tid=0x00007f1234567891 nid=0x2 waiting on condition [0x00007f1230100000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.example.DatabasePool.acquire(DatabasePool.java:55)
\tat com.example.HttpHandler.handle(HttpHandler.java:38)
\tat com.example.Server.dispatch(Server.java:100)
\t- waiting to lock <0x00000000c0000001> (a com.example.DatabasePool)

"worker-1" #12 daemon prio=5 os_prio=0 tid=0x00007f1234567892 nid=0x3 waiting on condition [0x00007f1230200000]
   java.lang.Thread.State: WAITING (parking)
\tat sun.misc.Unsafe.park(Native Method)
\tat com.example.TaskQueue.take(TaskQueue.java:20)

"main" #1 prio=5 os_prio=0 tid=0x00007f1234567893 nid=0x4 runnable [0x00007f1230300000]
   java.lang.Thread.State: RUNNABLE
\tat com.example.Server.dispatch(Server.java:105)
\tat com.example.Main.run(Main.java:10)
`;

describe('findThreadsByMethod', () => {
    const dump = parseThreadDump(SAMPLE_DUMP);

    it('should find threads by substring match', () => {
        const result = findThreadsByMethod(dump.threads, 'HttpHandler.handle');
        expect(result.totalMatches).toBe(2);
        expect(result.results.map(r => r.thread.name).sort()).toEqual(['http-handler-1', 'http-handler-2']);
    });

    it('should be case-insensitive for substring matches', () => {
        const result = findThreadsByMethod(dump.threads, 'httphandler.handle');
        expect(result.totalMatches).toBe(2);
    });

    it('should return state breakdown', () => {
        const result = findThreadsByMethod(dump.threads, 'Server.dispatch');
        expect(result.totalMatches).toBe(3);
        expect(result.stateBreakdown['RUNNABLE']).toBe(2);
        expect(result.stateBreakdown['BLOCKED']).toBe(1);
    });

    it('should include correct depth info', () => {
        const result = findThreadsByMethod(dump.threads, 'SocketInputStream.read');
        expect(result.totalMatches).toBe(1);
        expect(result.results[0].matchingFrames[0].depth).toBe(0); // top of stack
    });

    it('should return empty for no matches', () => {
        const result = findThreadsByMethod(dump.threads, 'NonExistent.method');
        expect(result.totalMatches).toBe(0);
        expect(result.results).toEqual([]);
        expect(result.stateBreakdown).toEqual({});
    });

    it('should support regex matching', () => {
        const result = findThreadsByMethod(dump.threads, 'Database.*\\.acquire', { regex: true });
        expect(result.totalMatches).toBe(1);
        expect(result.results[0].thread.name).toBe('http-handler-2');
    });

    it('should include lock info in matching threads', () => {
        const result = findThreadsByMethod(dump.threads, 'DatabasePool.acquire');
        expect(result.totalMatches).toBe(1);
        expect(result.results[0].thread.locks.length).toBeGreaterThan(0);
        expect(result.results[0].thread.locks[0].action).toBe('waiting to lock');
    });

    it('should store the query string', () => {
        const result = findThreadsByMethod(dump.threads, 'Server.dispatch');
        expect(result.query).toBe('Server.dispatch');
    });

    it('should work with sample1.tdump', () => {
        const samplePath = path.join(__dirname, '..', 'samples', 'sample1.tdump');
        const text = fs.readFileSync(samplePath, 'utf-8');
        const sampleDump = parseThreadDump(text);
        const result = findThreadsByMethod(sampleDump.threads, 'Worker.doWork');
        expect(result.totalMatches).toBeGreaterThan(0);
    });
});
