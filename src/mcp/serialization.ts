import { ThreadDump, ThreadInfo, DeadlockCycle, HotMethod, AnalysisResult, ThreadState } from '../models/types';
import { MethodSearchSummary } from '../utils/search';

function serializeThread(thread: ThreadInfo) {
    return {
        name: thread.name,
        tid: thread.tid,
        nid: thread.nid,
        state: thread.state,
        daemon: thread.daemon,
        priority: thread.priority,
        stackFrames: thread.stackFrames.map(f => ({
            className: f.className,
            methodName: f.methodName,
            fileName: f.fileName,
            lineNumber: f.lineNumber,
        })),
        locks: thread.locks.map(l => ({
            action: l.action,
            lockId: l.lockId,
            className: l.className,
        })),
    };
}

export function serializeAnalysisResult(result: AnalysisResult) {
    const stateGroups: Record<string, ReturnType<typeof serializeThread>[]> = {};
    for (const [state, threads] of result.stateGroups) {
        stateGroups[state] = threads.map(serializeThread);
    }

    return {
        timestamp: result.dump.timestamp,
        jvmVersion: result.dump.jvmVersion,
        totalThreads: result.dump.threads.length,
        stateGroups,
        hotMethods: result.hotMethods,
        deadlocks: serializeDeadlocks(result.deadlocks),
    };
}

export function serializeThreadSummary(dump: ThreadDump, deadlocks: DeadlockCycle[]) {
    const stateCounts: Record<string, number> = {};
    for (const thread of dump.threads) {
        stateCounts[thread.state] = (stateCounts[thread.state] || 0) + 1;
    }

    return {
        timestamp: dump.timestamp,
        jvmVersion: dump.jvmVersion,
        totalThreads: dump.threads.length,
        stateCounts,
        deadlockCount: deadlocks.length,
    };
}

export function serializeDeadlocks(cycles: DeadlockCycle[]) {
    return cycles.map((cycle, i) => ({
        cycleIndex: i + 1,
        threadCount: cycle.threads.length,
        threads: cycle.threads.map(t => ({
            name: t.name,
            tid: t.tid,
            state: t.state,
        })),
        locks: cycle.locks.map(l => ({
            action: l.action,
            lockId: l.lockId,
            className: l.className,
        })),
        description: cycle.threads.map((t, j) => {
            const lock = cycle.locks[j];
            return `"${t.name}" ${lock ? `waiting to lock <${lock.lockId}> (${lock.className})` : ''}`;
        }).join(' → '),
    }));
}

export function serializeHotMethods(methods: HotMethod[]) {
    return methods;
}

export function serializeMethodSearch(summary: MethodSearchSummary) {
    return {
        query: summary.query,
        totalMatches: summary.totalMatches,
        stateBreakdown: summary.stateBreakdown,
        results: summary.results.map(r => ({
            thread: {
                name: r.thread.name,
                tid: r.thread.tid,
                state: r.thread.state,
                daemon: r.thread.daemon,
                locks: r.thread.locks.map(l => ({
                    action: l.action,
                    lockId: l.lockId,
                    className: l.className,
                })),
            },
            matchingFrames: r.matchingFrames.map(mf => ({
                method: `${mf.frame.className}.${mf.frame.methodName}`,
                fileName: mf.frame.fileName,
                lineNumber: mf.frame.lineNumber,
                depth: mf.depth,
                isTopOfStack: mf.depth === 0,
            })),
        })),
    };
}
