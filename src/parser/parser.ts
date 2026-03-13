import { ThreadInfo, ThreadState, StackFrame, LockInfo, LockAction, ThreadDump } from '../models/types';

const THREAD_HEADER_RE = /^"([^"]+)"\s*(#\d+\s*)?(.*)tid=(0x[\da-f]+)\s+nid=(0x[\da-f]+)\s+(.*?)(?:\[.*\])?$/;
const STATE_RE = /^\s+java\.lang\.Thread\.State:\s+(\S+)/;
const STACK_FRAME_RE = /^\s+at\s+([\w.$]+)\.([\w$<>]+)\((\w+\.java):(\d+)\)/;
const LOCK_RE = /^\s+-\s+(waiting on|locked|parking to wait for|waiting to lock)\s+<(0x[\da-f]+)>\s+\(a\s+([\w.$]+)\)/;

function parseState(stateStr: string): ThreadState {
    const normalized = stateStr.toUpperCase().replace(/\s+/g, '_');
    const valid: ThreadState[] = ['RUNNABLE', 'BLOCKED', 'WAITING', 'TIMED_WAITING', 'NEW', 'TERMINATED'];
    for (const s of valid) {
        if (normalized === s) return s;
    }
    return 'UNKNOWN';
}

function inferStateFromHeader(headerTail: string): ThreadState {
    const lower = headerTail.toLowerCase();
    if (lower.includes('runnable')) return 'RUNNABLE';
    if (lower.includes('waiting for monitor entry')) return 'BLOCKED';
    if (lower.includes('in object.wait')) return 'WAITING';
    if (lower.includes('sleeping')) return 'TIMED_WAITING';
    if (lower.includes('waiting on condition')) return 'WAITING';
    return 'UNKNOWN';
}

export function parseThreadDump(text: string): ThreadDump {
    const lines = text.split(/\r?\n/);
    const threads: ThreadInfo[] = [];
    let timestamp = '';
    let jvmVersion = '';

    let current: ThreadInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Timestamp line (first non-empty line typically)
        if (i < 5 && !timestamp && /^\d{4}-\d{2}-\d{2}/.test(line)) {
            timestamp = line.trim();
            continue;
        }

        // JVM version line
        if (line.startsWith('Full thread dump')) {
            jvmVersion = line.replace('Full thread dump ', '').replace(':', '').trim();
            continue;
        }

        // Thread header
        if (line.startsWith('"')) {
            // Save previous thread
            if (current) {
                threads.push(current);
            }

            const match = THREAD_HEADER_RE.exec(line);
            if (match) {
                const name = match[1];
                const tid = match[4];
                const nid = match[5];
                const headerTail = match[6] || '';
                const preFlags = match[3] || '';
                const daemon = preFlags.includes('daemon');
                const prioMatch = /prio=(\d+)/.exec(preFlags);
                const priority = prioMatch ? parseInt(prioMatch[1], 10) : 5;

                current = {
                    name,
                    tid,
                    nid,
                    state: inferStateFromHeader(headerTail),
                    daemon,
                    priority,
                    stackFrames: [],
                    locks: [],
                    startLine: i,
                    raw: line,
                };
            } else {
                current = null;
            }
            continue;
        }

        if (!current) continue;

        // Thread state line (overrides header inference)
        const stateMatch = STATE_RE.exec(line);
        if (stateMatch) {
            current.state = parseState(stateMatch[1]);
            current.raw += '\n' + line;
            continue;
        }

        // Stack frame
        const frameMatch = STACK_FRAME_RE.exec(line);
        if (frameMatch) {
            current.stackFrames.push({
                className: frameMatch[1],
                methodName: frameMatch[2],
                fileName: frameMatch[3],
                lineNumber: parseInt(frameMatch[4], 10),
                raw: line.trim(),
            });
            current.raw += '\n' + line;
            continue;
        }

        // Lock line
        const lockMatch = LOCK_RE.exec(line);
        if (lockMatch) {
            current.locks.push({
                action: lockMatch[1] as LockAction,
                lockId: lockMatch[2],
                className: lockMatch[3],
            });
            current.raw += '\n' + line;
            continue;
        }

        // Other stack lines (native method, etc.)
        if (line.match(/^\s+at\s+/) || line.match(/^\s+-\s+/)) {
            current.raw += '\n' + line;
            continue;
        }

        // Empty line ends current thread
        if (line.trim() === '' && current) {
            threads.push(current);
            current = null;
        }
    }

    // Push last thread
    if (current) {
        threads.push(current);
    }

    return { timestamp, jvmVersion, threads };
}
