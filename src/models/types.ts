export interface StackFrame {
    className: string;
    methodName: string;
    fileName: string;
    lineNumber: number;
    raw: string;
}

export type LockAction = 'waiting on' | 'locked' | 'parking to wait for' | 'waiting to lock';

export interface LockInfo {
    action: LockAction;
    lockId: string;
    className: string;
}

export interface ThreadInfo {
    name: string;
    tid: string;
    nid: string;
    state: ThreadState;
    daemon: boolean;
    priority: number;
    stackFrames: StackFrame[];
    locks: LockInfo[];
    startLine: number;
    raw: string;
}

export type ThreadState =
    | 'RUNNABLE'
    | 'BLOCKED'
    | 'WAITING'
    | 'TIMED_WAITING'
    | 'NEW'
    | 'TERMINATED'
    | 'UNKNOWN';

export interface DeadlockCycle {
    threads: ThreadInfo[];
    locks: LockInfo[];
}

export interface ThreadDump {
    timestamp: string;
    jvmVersion: string;
    threads: ThreadInfo[];
}

export interface HotMethod {
    method: string;
    count: number;
}

export interface AnalysisResult {
    dump: ThreadDump;
    stateGroups: Map<ThreadState, ThreadInfo[]>;
    hotMethods: HotMethod[];
    deadlocks: DeadlockCycle[];
}
