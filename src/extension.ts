import * as vscode from 'vscode';
import { ThreadTreeProvider } from './views/ThreadTreeProvider';
import { registerCommands } from './commands/registerCommands';
import { parseThreadDump } from './parser/parser';

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
    output = vscode.window.createOutputChannel('Fast Java Thread');
    context.subscriptions.push(output);

    const treeProvider = new ThreadTreeProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('fastJavaThreadView', treeProvider),
    );

    registerCommands(context, treeProvider, output);

    // Auto-parse on .tdump file open/switch
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.uri.fsPath.endsWith('.tdump')) {
                const text = editor.document.getText();
                const dump = parseThreadDump(text);
                treeProvider.update(dump.threads, editor.document.uri);
                output.appendLine(`Auto-parsed ${dump.threads.length} threads from ${editor.document.uri.fsPath}`);
            }
        }),
    );

    // Parse if already open
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.fsPath.endsWith('.tdump')) {
        const text = activeEditor.document.getText();
        const dump = parseThreadDump(text);
        treeProvider.update(dump.threads, activeEditor.document.uri);
    }

    output.appendLine('Fast Java Thread extension activated');
}

export function deactivate(): void {
    // cleanup handled by disposables
}
