import React from "react";
import { ParamDefMap } from "./infertypes";
import { IDatasets, DatapointLookup, Datapoint, HiPlotExperiment, HiPlotLoadStatus } from "./types";
import { ContextMenu } from "./contextmenu";
import { PersistentState } from "./lib/savedstate";
import { Filter } from "./filters";
export interface HiPlotPluginDataWithoutDatasets {
    experiment: HiPlotExperiment;
    params_def: ParamDefMap;
    params_def_unfiltered: ParamDefMap;
    get_color_for_row: (uid: Datapoint, opacity: number) => string;
    render_row_text: (rows: Datapoint) => string;
    dp_lookup: DatapointLookup;
    context_menu_ref?: React.RefObject<ContextMenu>;
    colorby: string;
    name: string;
    rows_selected_filter: Filter;
    window_state: any;
    persistentState: PersistentState;
    sendMessage: (type: string, data: any) => void;
    setSelected: (new_selected: Array<Datapoint>, filter: Filter | null) => void;
    setHighlighted: (new_highlighted: Array<Datapoint>) => void;
    asserts: boolean;
}
export interface HiPlotPluginData extends IDatasets, HiPlotPluginDataWithoutDatasets {
}
export interface DataProviderProps {
    persistentState: PersistentState;
    loadStatus: HiPlotLoadStatus;
    hasFocus: boolean;
    onFocusChange: (hasFocus: boolean) => void;
    onLoadExperiment: (load_promise: Promise<any>) => void;
}
export declare type DataProviderComponent = React.Component<DataProviderProps, any>;
export declare type DataProviderComponentClass = React.ComponentClass<DataProviderProps>;
export declare type DataProviderClass = React.ClassType<DataProviderProps, DataProviderComponent, DataProviderComponentClass> & {
    refresh: any;
};
