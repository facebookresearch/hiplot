import React from "react";
import * as d3 from "d3";
import { ParamDef } from "../infertypes";
import { Datapoint } from "../types";
interface BinsDrawData {
    bins: d3.Bin<any, any>[];
    g: SVGSVGElement;
    draw_fn: any;
}
export interface HistogramData {
    all: Datapoint[];
    selected: Datapoint[];
}
export interface DistributionPlotData {
    height: number;
    width: number;
    nbins: number;
    axis: string;
    histData: HistogramData;
    param_def: ParamDef;
    animateMs: number;
}
export declare class DistributionPlot extends React.Component<DistributionPlotData, {}> {
    /**
     * Supports both vertical and horizontal bar plots.
     * Will switch to vertical if we are plotting categorical data with too many distinct values.
     */
    axisBottom: React.RefObject<SVGSVGElement>;
    axisLeft: React.RefObject<SVGSVGElement>;
    axisRight: React.RefObject<SVGSVGElement>;
    axisBottomName: React.RefObject<SVGGElement>;
    svgContainer: React.RefObject<SVGSVGElement>;
    histAll: React.RefObject<SVGSVGElement>;
    histSelected: React.RefObject<SVGSVGElement>;
    dataScale: any;
    isVertical(): boolean;
    figureWidth(): number;
    figureHeight(): number;
    createDataAxis(dataScale: any, animate: boolean): void;
    createDataScaleAndAxis(): void;
    createHistogram(): d3.HistogramGeneratorNumber<any, any>;
    drawAllHistograms(animate: boolean): void;
    drawHistogramLines(hist: BinsDrawData, densityScale: d3.ScaleLinear<number, number>, animate: boolean, binsOrdering: number[]): void;
    drawHistogramRects(hist: BinsDrawData, densityScale: d3.ScaleLinear<number, number>, animate: boolean, binsOrdering: number[]): void;
    componentDidMount(): void;
    componentDidUpdate(prevProps: DistributionPlotData, prevState: {}): void;
    render(): JSX.Element;
}
export {};
