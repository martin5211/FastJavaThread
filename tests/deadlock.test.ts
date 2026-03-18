import { parseThreadDump } from '../src/parser/parser';
import { detectDeadlocks } from '../src/utils/deadlock';
import * as fs from 'fs';
import * as path from 'path';

describe('detectDeadlocks', () => {
    it('should detect deadlock between worker-1 and worker-2', () => {
        const samplePath = path.join(__dirname, '..', 'samples', 'sample1.tdump');
        const text = fs.readFileSync(samplePath, 'utf-8');
        const dump = parseThreadDump(text);
        const cycles = detectDeadlocks(dump.threads);

        expect(cycles.length).toBe(1);
        const cycle = cycles[0];
        const names = cycle.threads.map(t => t.name).sort();
        expect(names).toEqual(['worker-1', 'worker-2']);
    });

    it('should return empty for no deadlocks', () => {
        const text = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (11.0.2+9-LTS mixed mode):

"main" #1 prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 runnable [0x00007f1230000000]
   java.lang.Thread.State: RUNNABLE
\tat com.example.Main.run(Main.java:10)

"worker" #2 daemon prio=5 os_prio=0 tid=0x00007f1234567891 nid=0x2 waiting on condition [0x00007f1230100000]
   java.lang.Thread.State: WAITING (parking)
\tat sun.misc.Unsafe.park(Native Method)
\t- parking to wait for  <0x00000000c0000099> (a java.util.concurrent.locks.ReentrantLock)
`;
        const dump = parseThreadDump(text);
        const cycles = detectDeadlocks(dump.threads);
        expect(cycles.length).toBe(0);
    });

    it('should detect 3-thread deadlock cycle', () => {
        const text = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (11.0.2+9-LTS mixed mode):

"thread-A" #1 prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 waiting for monitor entry [0x00007f1230000000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.example.A.run(A.java:10)
\t- waiting to lock <0x00000000c0000001> (a com.example.LockA)
\t- locked <0x00000000c0000003> (a com.example.LockC)

"thread-B" #2 prio=5 os_prio=0 tid=0x00007f1234567891 nid=0x2 waiting for monitor entry [0x00007f1230100000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.example.B.run(B.java:10)
\t- waiting to lock <0x00000000c0000002> (a com.example.LockB)
\t- locked <0x00000000c0000001> (a com.example.LockA)

"thread-C" #3 prio=5 os_prio=0 tid=0x00007f1234567892 nid=0x3 waiting for monitor entry [0x00007f1230200000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.example.C.run(C.java:10)
\t- waiting to lock <0x00000000c0000003> (a com.example.LockC)
\t- locked <0x00000000c0000002> (a com.example.LockB)
`;
        const dump = parseThreadDump(text);
        const cycles = detectDeadlocks(dump.threads);

        expect(cycles.length).toBe(1);
        const names = cycles[0].threads.map(t => t.name).sort();
        expect(names).toEqual(['thread-A', 'thread-B', 'thread-C']);
    });

    it('should handle threads waiting on locks held by no one', () => {
        const text = `2024-01-15 10:30:45
Full thread dump Java HotSpot(TM) 64-Bit Server VM (11.0.2+9-LTS mixed mode):

"blocked" #1 prio=5 os_prio=0 tid=0x00007f1234567890 nid=0x1 waiting for monitor entry [0x00007f1230000000]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.example.Foo.bar(Foo.java:10)
\t- waiting to lock <0x00000000c0000001> (a com.example.SomeLock)
`;
        const dump = parseThreadDump(text);
        const cycles = detectDeadlocks(dump.threads);
        expect(cycles.length).toBe(0);
    });
});
