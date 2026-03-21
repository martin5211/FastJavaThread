import { ThreadInfo, StackFrame, ThreadState } from '../models/types';

export interface MatchingFrame {
    frame: StackFrame;
    depth: number;
}

export interface MethodSearchResult {
    thread: ThreadInfo;
    matchingFrames: MatchingFrame[];
}

export interface MethodSearchSummary {
    query: string;
    totalMatches: number;
    stateBreakdown: Record<string, number>;
    results: MethodSearchResult[];
}

export function findThreadsByMethod(
    threads: ThreadInfo[],
    methodPattern: string,
    options?: { regex?: boolean }
): MethodSearchSummary {
    const useRegex = options?.regex ?? false;
    const matcher = useRegex
        ? (fullMethod: string) => new RegExp(methodPattern).test(fullMethod)
        : (fullMethod: string) => fullMethod.toLowerCase().includes(methodPattern.toLowerCase());

    const results: MethodSearchResult[] = [];
    const stateBreakdown: Record<string, number> = {};

    for (const thread of threads) {
        const matchingFrames: MatchingFrame[] = [];

        for (let i = 0; i < thread.stackFrames.length; i++) {
            const frame = thread.stackFrames[i];
            const fullMethod = `${frame.className}.${frame.methodName}`;
            if (matcher(fullMethod)) {
                matchingFrames.push({ frame, depth: i });
            }
        }

        if (matchingFrames.length > 0) {
            results.push({ thread, matchingFrames });
            stateBreakdown[thread.state] = (stateBreakdown[thread.state] || 0) + 1;
        }
    }

    return {
        query: methodPattern,
        totalMatches: results.length,
        stateBreakdown,
        results,
    };
}
