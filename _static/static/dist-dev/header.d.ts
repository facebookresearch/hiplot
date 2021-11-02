import React from "react";
import { HiPlotLoadStatus, IDatasets } from "./types";
import { HiPlotDataControlProps } from "./controls";
import { DataProviderClass } from "./plugin";
import { PersistentState } from "./lib/savedstate";
interface HeaderBarProps extends IDatasets, HiPlotDataControlProps {
    weightColumn?: string;
    loadStatus: HiPlotLoadStatus;
    persistentState: PersistentState;
    onLoadExperiment: (load_promise: Promise<any>) => void;
    dark: boolean;
    dataProvider: DataProviderClass;
}
interface HeaderBarState {
    isTextareaFocused: boolean;
    hasTutorial: boolean;
    selectedPct: string;
    selectedPctWeighted: string;
}
export declare class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {
    dataProviderRef: React.RefObject<DataProviderClass>;
    controls_root_ref: React.RefObject<HTMLDivElement>;
    constructor(props: HeaderBarProps);
    recomputeMetrics(): void;
    recomputeSelectedWeightedSum(): void;
    componentDidMount(): void;
    componentDidUpdate(prevProps: HeaderBarProps, prevState: HeaderBarState): void;
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
