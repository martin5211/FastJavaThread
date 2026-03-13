import * as fs from 'fs';
import * as path from 'path';
import { parseThreadDump } from '../src/parser/parser';

const samplePath = path.join(__dirname, '..', 'samples', 'sample1.tdump');
const sampleText = fs.readFileSync(samplePath, 'utf-8');

describe('parseThreadDump', () => {
    const dump = parseThreadDump(sampleText);

    it('should parse timestamp', () => {
        expect(dump.timestamp).toBe('2024-01-15 10:30:45');
    });

    it('should parse JVM version', () => {
        expect(dump.jvmVersion).toContain('Java HotSpot');
    });

    it('should parse all threads', () => {
        // main, worker-1, worker-2, http-exec-1, http-exec-2, http-exec-3,
        // GC task, VM Thread, Signal Dispatcher, Finalizer, Reference Handler,
        // db-pool-1, scheduler-1
        expect(dump.threads.length).toBeGreaterThanOrEqual(11);
    });

    it('should parse thread names', () => {
        const names = dump.threads.map(t => t.name);
        expect(names).toContain('main');
        expect(names).toContain('worker-1');
        expect(names).toContain('worker-2');
    });

    it('should parse RUNNABLE state', () => {
        const main = dump.threads.find(t => t.name === 'main');
        expect(main).toBeDefined();
        expect(main!.state).toBe('RUNNABLE');
    });

    it('should parse BLOCKED state', () => {
        const worker1 = dump.threads.find(t => t.name === 'worker-1');
        expect(worker1).toBeDefined();
        expect(worker1!.state).toBe('BLOCKED');
    });

    it('should parse WAITING state', () => {
        const exec1 = dump.threads.find(t => t.name === 'http-nio-8080-exec-1');
        expect(exec1).toBeDefined();
        expect(exec1!.state).toBe('WAITING');
    });

    it('should parse TIMED_WAITING state', () => {
        const exec3 = dump.threads.find(t => t.name === 'http-nio-8080-exec-3');
        expect(exec3).toBeDefined();
        expect(exec3!.state).toBe('TIMED_WAITING');
    });

    it('should parse daemon flag', () => {
        const main = dump.threads.find(t => t.name === 'main');
        expect(main!.daemon).toBe(false);
        const worker1 = dump.threads.find(t => t.name === 'worker-1');
        expect(worker1!.daemon).toBe(true);
    });

    it('should parse stack frames', () => {
        const main = dump.threads.find(t => t.name === 'main');
        expect(main!.stackFrames.length).toBe(3);
        expect(main!.stackFrames[0].className).toBe('com.example.app.MainProcessor');
        expect(main!.stackFrames[0].methodName).toBe('processData');
        expect(main!.stackFrames[0].fileName).toBe('MainProcessor.java');
        expect(main!.stackFrames[0].lineNumber).toBe(42);
    });

    it('should parse lock info', () => {
        const worker1 = dump.threads.find(t => t.name === 'worker-1');
        expect(worker1!.locks.length).toBe(2);
        const waitingLock = worker1!.locks.find(l => l.action === 'waiting to lock');
        expect(waitingLock).toBeDefined();
        expect(waitingLock!.lockId).toBe('0x00000000c0000001');
        const heldLock = worker1!.locks.find(l => l.action === 'locked');
        expect(heldLock).toBeDefined();
        expect(heldLock!.lockId).toBe('0x00000000c0000002');
    });

    it('should track startLine for each thread', () => {
        const main = dump.threads.find(t => t.name === 'main');
        expect(main!.startLine).toBeGreaterThanOrEqual(0);
    });

    it('should handle VM internal threads with no state line', () => {
        const gc = dump.threads.find(t => t.name.startsWith('GC task'));
        if (gc) {
            // GC threads have no java.lang.Thread.State line
            expect(gc.state).toBe('RUNNABLE');
            expect(gc.stackFrames.length).toBe(0);
        }
    });

    it('should parse parking to wait for locks', () => {
        const exec1 = dump.threads.find(t => t.name === 'http-nio-8080-exec-1');
        expect(exec1).toBeDefined();
        const parkingLock = exec1!.locks.find(l => l.action === 'parking to wait for');
        expect(parkingLock).toBeDefined();
        expect(parkingLock!.lockId).toBe('0x00000000c0000003');
    });
});

describe('parseThreadDump with Java 8 format', () => {
    const java8Dump = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (25.201-b09 mixed mode):

"main" #1 prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 runnable [0x00007f1230000000]
   java.lang.Thread.State: RUNNABLE
\tat com.example.app.Main.run(Main.java:10)

"worker" #2 daemon prio=5 os_prio=0 tid=0x00007f1234567891 nid=0x2 waiting on condition [0x00007f1230100000]
   java.lang.Thread.State: WAITING (parking)
\tat sun.misc.Unsafe.park(Native Method)
\t- parking to wait for  <0x00000000c0000001> (a java.util.concurrent.locks.ReentrantLock$NonfairSync)
\tat java.util.concurrent.locks.LockSupport.park(LockSupport.java:175)
`;

    it('should parse Java 8 format without cpu/elapsed fields', () => {
        const dump = parseThreadDump(java8Dump);
        expect(dump.threads.length).toBe(2);
        expect(dump.threads[0].name).toBe('main');
        expect(dump.threads[0].state).toBe('RUNNABLE');
        expect(dump.threads[1].name).toBe('worker');
        expect(dump.threads[1].state).toBe('WAITING');
    });
});
