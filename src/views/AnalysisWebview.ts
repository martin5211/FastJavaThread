import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { AnalysisResult } from '../models/types';

export class AnalysisWebview implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    get isVisible(): boolean {
        return this.panel !== undefined;
    }

    dispose(): void {
        this.panel?.dispose();
    }

    show(result?: AnalysisResult): void {
        if (this.panel) {
            this.panel.reveal();
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'fastJavaThreadDashboard',
                'Thread Dump Dashboard',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'assets')],
                },
            );
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }

        this.panel.webview.html = this.getHtml(this.panel.webview, result);
    }

    update(result: AnalysisResult): void {
        if (this.panel) {
            this.panel.webview.html = this.getHtml(this.panel.webview, result);
        }
    }

    private getHtml(webview: vscode.Webview, result?: AnalysisResult): string {
        const nonce = getNonce();
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'styles.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'main.js'));
        const chartUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'chart.umd.js'));
        const cspSource = webview.cspSource;

        if (!result) {
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'; img-src ${cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>Thread Dump Dashboard</title>
</head>
<body>
    <h1>Thread Dump Dashboard</h1>
    <div class="empty-state">
        <p>Open a <code>.tdump</code> file to analyze its thread dump.</p>
    </div>
</body>
</html>`;
        }

        const stateGroups: Record<string, number> = {};
        for (const [state, threads] of result.stateGroups) {
            stateGroups[state] = threads.length;
        }

        const deadlockData = result.deadlocks.map(cycle => ({
            threads: cycle.threads.map(t => ({ name: t.name, state: t.state })),
            locks: cycle.locks.map(l => ({ lockId: l.lockId, className: l.className })),
        }));

        const data = {
            totalThreads: result.dump.threads.length,
            stateGroups,
            hotMethods: result.hotMethods,
            deadlocks: deadlockData,
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'; img-src ${cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>Thread Dump Dashboard</title>
</head>
<body>
    <h1>Thread Dump Dashboard</h1>

    <div id="deadlocks" class="deadlock-alert hidden"></div>

    <div class="summary-grid" id="summary"></div>

    <h2>Thread State Distribution</h2>
    <div class="chart-container">
        <canvas id="stateChart"></canvas>
    </div>

    <h2>Hot Methods (Top 10)</h2>
    <div class="hot-methods" id="hotMethods"></div>

    <script nonce="${nonce}" id="dump-data" type="application/json">${escapeJsonForHtml(JSON.stringify(data))}</script>
    <script nonce="${nonce}" src="${chartUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    return crypto.randomBytes(16).toString('hex');
}

function escapeJsonForHtml(json: string): string {
    return json.replace(/&/g, '\\u0026').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
