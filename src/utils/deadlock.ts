import { ThreadInfo, DeadlockCycle, LockInfo } from '../models/types';

type Color = 'WHITE' | 'GRAY' | 'BLACK';

export function detectDeadlocks(threads: ThreadInfo[]): DeadlockCycle[] {
    // Build map: lockId -> thread that holds it
    const lockHolders = new Map<string, ThreadInfo>();
    for (const thread of threads) {
        for (const lock of thread.locks) {
            if (lock.action === 'locked') {
                lockHolders.set(lock.lockId, thread);
            }
        }
    }

    // Build adjacency: thread -> thread it's waiting on
    // A thread waits on a lock -> the thread holding that lock
    const waitingFor = new Map<string, { target: ThreadInfo; lock: LockInfo }>();
    for (const thread of threads) {
        for (const lock of thread.locks) {
            if (lock.action === 'waiting on' || lock.action === 'parking to wait for' || lock.action === 'waiting to lock') {
                const holder = lockHolders.get(lock.lockId);
                if (holder && holder.tid !== thread.tid) {
                    waitingFor.set(thread.tid, { target: holder, lock });
                }
            }
        }
    }

    // DFS cycle detection
    const color = new Map<string, Color>();
    const parent = new Map<string, string>();
    const cycles: DeadlockCycle[] = [];
    const seenCycles = new Set<string>();

    for (const thread of threads) {
        color.set(thread.tid, 'WHITE');
    }

    const threadByTid = new Map<string, ThreadInfo>();
    for (const thread of threads) {
        threadByTid.set(thread.tid, thread);
    }

    function dfs(tid: string): void {
        color.set(tid, 'GRAY');

        const edge = waitingFor.get(tid);
        if (edge) {
            const neighborTid = edge.target.tid;
            const neighborColor = color.get(neighborTid);

            if (neighborColor === 'WHITE') {
                parent.set(neighborTid, tid);
                dfs(neighborTid);
            } else if (neighborColor === 'GRAY') {
                // Found a cycle - extract it
                const cycleThreads: ThreadInfo[] = [];
                const cycleLocks: LockInfo[] = [];

                let current = tid;
                while (current !== neighborTid) {
                    const t = threadByTid.get(current);
                    if (t) cycleThreads.push(t);
                    const e = waitingFor.get(current);
                    if (e) cycleLocks.push(e.lock);
                    const p = parent.get(current);
                    if (!p) break;
                    current = p;
                }
                const t = threadByTid.get(neighborTid);
                if (t) cycleThreads.push(t);
                const e = waitingFor.get(neighborTid);
                if (e) cycleLocks.push(e.lock);

                // Normalize cycle key to avoid duplicates
                const tids = cycleThreads.map(th => th.tid).sort();
                const key = tids.join(',');
                if (!seenCycles.has(key)) {
                    seenCycles.add(key);
                    cycles.push({ threads: cycleThreads, locks: cycleLocks });
                }
            }
        }

        color.set(tid, 'BLACK');
    }

    for (const thread of threads) {
        if (color.get(thread.tid) === 'WHITE') {
            dfs(thread.tid);
        }
    }

    return cycles;
}
