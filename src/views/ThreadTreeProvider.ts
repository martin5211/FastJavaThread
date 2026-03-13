import * as vscode from 'vscode';
import { ThreadInfo, ThreadState } from '../models/types';
import { groupByState } from '../utils/grouping';

const STATE_ICONS: Record<ThreadState, string> = {
    RUNNABLE: 'run',
    BLOCKED: 'debug-pause',
    WAITING: 'loading',
    TIMED_WAITING: 'loading',
    NEW: 'circle-outline',
    TERMINATED: 'circle-slash',
    UNKNOWN: 'warning',
};

class StateGroupItem extends vscode.TreeItem {
    constructor(
        public readonly state: ThreadState,
        public readonly threads: ThreadInfo[],
    ) {
        super(`${state} (${threads.length})`, vscode.TreeItemCollapsibleState.Expanded);
        this.iconPath = new vscode.ThemeIcon(STATE_ICONS[state]);
        this.contextValue = 'stateGroup';
    }
}

class ThreadItem extends vscode.TreeItem {
    constructor(public readonly thread: ThreadInfo, public readonly fileUri?: vscode.Uri) {
        super(thread.name, vscode.TreeItemCollapsibleState.None);
        this.description = thread.tid;
        this.iconPath = new vscode.ThemeIcon(STATE_ICONS[thread.state]);
        this.contextValue = 'thread';
        if (fileUri) {
            this.command = {
                command: 'fast-java-thread.navigateToThread',
                title: 'Go to Thread',
                arguments: [fileUri, thread.startLine],
            };
        }
    }
}

type TreeElement = StateGroupItem | ThreadItem;

export class ThreadTreeProvider implements vscode.TreeDataProvider<TreeElement> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private threads: ThreadInfo[] = [];
    private fileUri?: vscode.Uri;

    update(threads: ThreadInfo[], fileUri?: vscode.Uri): void {
        this.threads = threads;
        this.fileUri = fileUri;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TreeElement): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeElement): TreeElement[] {
        if (!element) {
            // Root: state groups
            const groups = groupByState(this.threads);
            const order: ThreadState[] = ['BLOCKED', 'RUNNABLE', 'WAITING', 'TIMED_WAITING', 'NEW', 'TERMINATED', 'UNKNOWN'];
            const items: StateGroupItem[] = [];
            for (const state of order) {
                const threads = groups.get(state);
                if (threads && threads.length > 0) {
                    items.push(new StateGroupItem(state, threads));
                }
            }
            return items;
        }

        if (element instanceof StateGroupItem) {
            return element.threads.map(t => new ThreadItem(t, this.fileUri));
        }

        return [];
    }
}
