import { ThreadInfo, ThreadState, HotMethod } from '../models/types';

export function groupByState(threads: ThreadInfo[]): Map<ThreadState, ThreadInfo[]> {
    const groups = new Map<ThreadState, ThreadInfo[]>();
    for (const thread of threads) {
        const existing = groups.get(thread.state);
        if (existing) {
            existing.push(thread);
        } else {
            groups.set(thread.state, [thread]);
        }
    }
    return groups;
}

export function getHotMethods(threads: ThreadInfo[], topN: number = 10): HotMethod[] {
    const counts = new Map<string, number>();

    for (const thread of threads) {
        for (const frame of thread.stackFrames) {
            const method = `${frame.className}.${frame.methodName}`;
            counts.set(method, (counts.get(method) || 0) + 1);
        }
    }

    return Array.from(counts.entries())
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}
