import React from "react";
import './style/global';
import { Datapoint, HiPlotExperiment, HiPlotLoadStatus, DatapointLookup, IDatasets } from "./types";
import { ParamDefMap } from "./infertypes";
import { PersistentState } from "./lib/savedstate";
import { HiPlotPluginData, DataProviderClass } from "./plugin";
import { ContextMenu } from "./contextmenu";
import { Filter } from "./filters";
export { PlotXY } from "./plotxy";
export { ParallelPlot } from "./parallel/parallel";
export { RowsDisplayTable } from "./rowsdisplaytable";
export { HiPlotPluginData } from "./plugin";
export { Datapoint, HiPlotExperiment, IDatasets, HiPlotLoadStatus } from "./types";
declare type PluginComponent<P> = React.Component<P, any>;
declare type PluginComponentClass<P> = React.ComponentClass<P>;
declare type PluginClass = React.ClassType<HiPlotPluginData, PluginComponent<HiPlotPluginData>, PluginComponentClass<HiPlotPluginData>>;
interface PluginsMap {
    [k: string]: PluginClass;
}
declare type LoadURIPromiseResult = {
    experiment: HiPlotExperiment;
} | {
    error: string;
};
export declare type LoadURIPromise = Promise<LoadURIPromiseResult>;
interface CancelablePromise {
    promise: LoadURIPromise;
    cancel: () => void;
}
export interface HiPlotProps {
    experiment: HiPlotExperiment | null;
    plugins: PluginsMap;
    persistentState?: PersistentState;
    onChange: {
        [k: string]: Array<(type: string, data: any) => void>;
    };
    dark: boolean;
    asserts: boolean;
    dataProvider: DataProviderClass;
}
interface HiPlotState extends IDatasets {
    experiment: HiPlotExperiment | null;
    loadStatus: HiPlotLoadStatus;
    loadPromise: CancelablePromise | null;
    error: string;
    params_def: ParamDefMap;
    params_def_unfiltered: ParamDefMap;
    dp_lookup: DatapointLookup;
    colorby: string;
    colormap: string;
    rows_filtered_filters: Array<Filter>;
    rows_selected_filter: Filter;
    persistentState: PersistentState;
    dark: boolean;
    dataProvider: DataProviderClass;
}
export declare enum DefaultPlugins {
    PARALLEL_PLOT = "PARALLEL_PLOT",
    XY = "XY",
    DISTRIBUTION = "DISTRIBUTION",
    TABLE = "TABLE"
}
export declare const defaultPlugins: PluginsMap;
export declare function createDefaultPlugins(): PluginsMap;
export declare class HiPlot extends React.Component<HiPlotProps, HiPlotState> {
    contextMenuRef: React.RefObject<ContextMenu>;
    plugins_window_state: {
        [plugin: string]: any;
    };
    plugins_ref: Array<React.RefObject<PluginClass>>;
    constructor(props: HiPlotProps);
    static defaultProps: {
        loadURI: any;
        comm: any;
        dark: boolean;
        asserts: boolean;
        plugins: PluginsMap;
        experiment: any;
        dataProvider: any;
        onChange: any;
    };
    static getDerivedStateFromError(error: Error): {
        experiment: any;
        loadStatus: HiPlotLoadStatus;
        error: string;
    };
    makeDatasets(experiment: HiPlotExperiment | null, dp_lookup: DatapointLookup, initial_filters: Array<Filter>): IDatasets;
    sendMessage(type: string, get_data: () => any): void;
    callSelectedUidsHooks: any;
    callFilteredUidsHooks: any;
    _loadExperiment(experiment: HiPlotExperiment): void;
    getColorForRow(trial: Datapoint, alpha: number): string;
    loadWithPromise(prom: LoadURIPromise): void;
    componentWillUnmount(): void;
    componentDidMount(): void;
    componentDidUpdate(prevProps: HiPlotProps, prevState: HiPlotState): void;
    columnContextMenu(column: string, cm: HTMLDivElement): void;
    createNewParamsDef(rows_filtered: Array<Datapoint>): ParamDefMap;
    restoreAllRows(): void;
    filterRows(keep: boolean): void;
    setSelected(rows: Array<Datapoint>, filter?: Filter | null): void;
    setHighlighted(rows: Array<Datapoint>): void;
    renderRowText(row: Datapoint): string;
    render(): JSX.Element;
    getPlugin<P extends HiPlotPluginData, T extends React.Component<P>>(cls: React.ClassType<P, T, React.ComponentClass<P>>): T;
}
