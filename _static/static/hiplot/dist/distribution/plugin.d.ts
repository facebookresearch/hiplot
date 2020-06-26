import React from "react";
import { HiPlotPluginData } from "../plugin";
import { HistogramData } from "./plot";
export interface HiPlotDistributionPluginState {
    initialHeight: number;
    height: number;
    width: number;
    axis: string | null;
    histData: HistogramData;
}
export interface DistributionDisplayData {
    nbins: number;
    animateMs: number;
    axis?: string;
}
interface DistributionPluginProps extends HiPlotPluginData, DistributionDisplayData {
}
export declare class HiPlotDistributionPlugin extends React.Component<DistributionPluginProps, HiPlotDistributionPluginState> {
    container_ref: React.RefObject<HTMLDivElement>;
    constructor(props: DistributionPluginProps);
    static defaultProps: {
        nbins: number;
        animateMs: number;
    };
    componentDidMount(): void;
    componentDidUpdate(prevProps: HiPlotPluginData, prevState: HiPlotDistributionPluginState): void;
    componentWillUnmount(): void;
    onResize: any;
    disable(): void;
    render(): any[] | JSX.Element;
}
export {};
