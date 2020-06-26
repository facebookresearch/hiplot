import React from "react";
import { HiPlotLoadStatus, IDatasets } from "./types";
import { HiPlotDataControlProps } from "./controls";
import { DataProviderClass } from "./plugin";
import { PersistentState } from "./lib/savedstate";
interface HeaderBarProps extends IDatasets, HiPlotDataControlProps {
    loadStatus: HiPlotLoadStatus;
    persistentState: PersistentState;
    onLoadExperiment: (load_promise: Promise<any>) => void;
    dark: boolean;
    dataProvider: DataProviderClass;
}
interface HeaderBarState {
    isTextareaFocused: boolean;
    hasTutorial: boolean;
}
export declare class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {
    dataProviderRef: React.RefObject<DataProviderClass>;
    selected_count_ref: React.RefObject<HTMLElement>;
    selected_pct_ref: React.RefObject<HTMLElement>;
    total_count_ref: React.RefObject<HTMLElement>;
    controls_root_ref: React.RefObject<HTMLDivElement>;
    constructor(props: HeaderBarProps);
    recomputeMetrics(): void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    onToggleTutorial(): void;
    onRefresh(): void;
    renderControls(): JSX.Element;
    render(): JSX.Element;
}
interface ErrorDisplayProps {
    error: string;
}
export declare class ErrorDisplay extends React.Component<ErrorDisplayProps> {
    render(): JSX.Element;
}
export {};
