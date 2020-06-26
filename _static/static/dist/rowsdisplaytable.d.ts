import React from "react";
import { Datapoint } from "./types";
import { HiPlotPluginData } from "./plugin";
import _ from "underscore";
interface RowsDisplayTableState {
}
export declare class RowsDisplayTable extends React.Component<HiPlotPluginData, RowsDisplayTableState> {
    table_ref: React.RefObject<HTMLTableElement>;
    table_container: React.RefObject<HTMLDivElement>;
    dt: any;
    ordered_cols: Array<string>;
    empty: boolean;
    setSelected_debounced: ((selected: Datapoint[]) => void) & _.Cancelable;
    constructor(props: HiPlotPluginData);
    componentDidMount(): void;
    mountDt(): void;
    componentDidUpdate(prevProps: HiPlotPluginData): void;
    setSelectedToSearchResult(): void;
    setSelected(selected: Array<Datapoint>): void;
    render(): JSX.Element;
    destroyDt(): void;
    componentWillUnmount(): void;
}
export {};
