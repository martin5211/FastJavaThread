import * as vscode from 'vscode';

export function classNameToPath(className: string): string {
    return className.replace(/\./g, '/') + '.java';
}

export async function revealLineInEditor(uri: vscode.Uri, line: number): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
        preview: true,
        preserveFocus: false,
    });
    const range = new vscode.Range(line, 0, line, 0);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}
