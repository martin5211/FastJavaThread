export const TreeItem = class {
    label: string;
    collapsibleState?: number;
    constructor(label: string, collapsibleState?: number) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
};

export enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2,
}

export const ThemeIcon = class {
    id: string;
    constructor(id: string) {
        this.id = id;
    }
};

export const EventEmitter = class {
    event = jest.fn();
    fire = jest.fn();
};

export const Uri = {
    file: (path: string) => ({ fsPath: path, scheme: 'file' }),
    joinPath: (base: any, ...parts: string[]) => ({
        fsPath: [base.fsPath, ...parts].join('/'),
        scheme: 'file',
    }),
};

export const workspace = {
    openTextDocument: jest.fn(),
};

export const window = {
    showTextDocument: jest.fn(),
};

export const Range = class {
    start: any;
    end: any;
    constructor(sl: number, sc: number, el: number, ec: number) {
        this.start = { line: sl, character: sc };
        this.end = { line: el, character: ec };
    }
};

export const Selection = class {
    anchor: any;
    active: any;
    constructor(anchor: any, active: any) {
        this.anchor = anchor;
        this.active = active;
    }
};

export enum TextEditorRevealType {
    Default = 0,
    InCenter = 1,
    InCenterIfOutsideViewport = 2,
    AtTop = 3,
}
