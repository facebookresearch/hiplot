import React from "react";
import { IDatasets } from "./types";
export interface HiPlotDataControlProps extends IDatasets {
    restoreAllRows: () => void;
    filterRows: (keep: boolean) => void;
}
interface HiPlotDataControlState {
    btnEnabled: boolean;
}
export declare class KeepOrExcludeDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    btnRef: React.RefObject<HTMLButtonElement>;
    keep: boolean;
    title: string;
    label: string;
    style: string;
    constructor(props: HiPlotDataControlProps);
    btnEnabled(): boolean;
    componentDidUpdate(): void;
    onClick(): void;
    render(): JSX.Element;
}
export declare class KeepDataBtn extends KeepOrExcludeDataBtn {
    keep: boolean;
    title: string;
    label: string;
    style: string;
}
export declare class ExcludeDataBtn extends KeepOrExcludeDataBtn {
    keep: boolean;
    title: string;
    label: string;
    style: string;
}
export declare class ExportDataCSVBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    onClick(): void;
    render(): JSX.Element;
}
export declare class RestoreDataBtn extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    constructor(props: HiPlotDataControlProps);
    btnEnabled(): boolean;
    componentDidUpdate(): void;
    onClick(): void;
    render(): JSX.Element;
}
export declare class SelectedCountProgressBar extends React.Component<HiPlotDataControlProps, HiPlotDataControlState> {
    selectedBar: React.RefObject<HTMLDivElement>;
    componentDidMount(): void;
    componentDidUpdate(): void;
    updateBarWidth(): void;
    render(): JSX.Element;
}
export {};
