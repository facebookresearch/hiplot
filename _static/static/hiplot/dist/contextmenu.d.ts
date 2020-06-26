import React from "react";
interface ContextMenuProps {
}
interface ContextMenuState {
    visible: boolean;
    column: string;
    top: number;
    left: number;
}
export declare class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
    context_menu_div: React.RefObject<HTMLDivElement>;
    trigger_callbacks: Array<{
        cb: (column: string, element: HTMLDivElement) => void;
        obj: any;
    }>;
    hide: any;
    constructor(props: ContextMenuProps);
    addCallback(fn: (column: string, element: HTMLDivElement) => void, obj: any): void;
    removeCallbacks(obj: any): void;
    show(pageX: number, pageY: number, column: string): void;
    onContextMenu: any;
    componentWillUnmount(): void;
    componentDidUpdate(prevProps: Readonly<ContextMenuProps>, prevState: Readonly<ContextMenuState>): void;
    render(): JSX.Element;
}
export {};
