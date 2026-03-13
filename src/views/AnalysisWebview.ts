import * as vscode from 'vscode';
import { AnalysisResult } from '../models/types';

export class AnalysisWebview {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private readonly extensionUri: vscode.Uri) {}

    show(result: AnalysisResult): void {
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

    private getHtml(webview: vscode.Webview, result: AnalysisResult): string {
        const nonce = getNonce();
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'styles.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'assets', 'main.js'));
        const cspSource = webview.cspSource;

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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; img-src ${cspSource};">
    <link rel="stylesheet" href="${styleUri}">
    <title>Thread Dump Dashboard</title>
</head>
<body>
    <h1>Thread Dump Dashboard</h1>

    <div id="deadlocks" class="deadlock-alert"></div>

    <div class="summary-grid" id="summary"></div>

    <h2>Thread State Distribution</h2>
    <div class="chart-container">
        <canvas id="stateChart"></canvas>
    </div>

    <h2>Hot Methods (Top 10)</h2>
    <div class="hot-methods" id="hotMethods"></div>

    <script nonce="${nonce}" id="dump-data" type="application/json">${escapeJsonForHtml(JSON.stringify(data))}</script>
    <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}

function escapeJsonForHtml(json: string): string {
    return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
