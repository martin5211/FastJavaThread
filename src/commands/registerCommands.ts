import * as vscode from 'vscode';
import { parseThreadDump } from '../parser/parser';
import { detectDeadlocks } from '../utils/deadlock';
import { groupByState, getHotMethods } from '../utils/grouping';
import { revealLineInEditor } from '../utils/navigation';
import { ThreadTreeProvider } from '../views/ThreadTreeProvider';
import { AnalysisWebview } from '../views/AnalysisWebview';
import { AnalysisResult } from '../models/types';

let lastResult: AnalysisResult | undefined;

export function registerCommands(
    context: vscode.ExtensionContext,
    treeProvider: ThreadTreeProvider,
    output: vscode.OutputChannel,
): void {
    const webview = new AnalysisWebview(context.extensionUri);

    context.subscriptions.push(
        vscode.commands.registerCommand('fast-java-thread.analyzeThreadDump', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor. Open a .tdump file first.');
                return;
            }

            const text = editor.document.getText();
            const result = analyze(text, output);
            lastResult = result;

            treeProvider.update(result.dump.threads, editor.document.uri);

            const deadlockCount = result.deadlocks.length;
            if (deadlockCount > 0) {
                vscode.window.showWarningMessage(
                    `Found ${deadlockCount} deadlock cycle(s)! Open the dashboard for details.`,
                );
            }

            output.appendLine(`Analyzed ${result.dump.threads.length} threads, ${deadlockCount} deadlock(s)`);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('fast-java-thread.showDashboard', () => {
            if (!lastResult) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const text = editor.document.getText();
                    lastResult = analyze(text, output);
                    treeProvider.update(lastResult.dump.threads, editor.document.uri);
                } else {
                    vscode.window.showWarningMessage('No thread dump analyzed yet. Open and analyze a .tdump file first.');
                    return;
                }
            }
            webview.show(lastResult);
        }),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('fast-java-thread.navigateToThread', async (uri: vscode.Uri, line: number) => {
            await revealLineInEditor(uri, line);
        }),
    );
}

function analyze(text: string, output: vscode.OutputChannel): AnalysisResult {
    output.appendLine('Parsing thread dump...');
    const dump = parseThreadDump(text);
    const stateGroups = groupByState(dump.threads);
    const hotMethods = getHotMethods(dump.threads);
    const deadlocks = detectDeadlocks(dump.threads);
    return { dump, stateGroups, hotMethods, deadlocks };
}

export function getLastResult(): AnalysisResult | undefined {
    return lastResult;
}
