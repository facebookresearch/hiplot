import { HiPlotPluginData } from "./plugin";
import React from "react";
import _ from "underscore";
import { ContextMenu } from "./contextmenu";
export interface PlotXYDisplayData {
    axis_x: string | null;
    axis_y: string | null;
    lines_thickness: number;
    lines_opacity: number;
    dots_thickness: number;
    dots_highlighed_thickness: number;
    dots_opacity: number;
    height?: number;
}
interface PlotXYProps extends HiPlotPluginData, PlotXYDisplayData {
}
interface PlotXYState extends PlotXYDisplayData {
    width: number;
    initialHeight: number;
    height: number;
    hover_uid: string | null;
    highlightType: string;
}
interface PlotXYInternal {
    clear_canvas: () => void;
    update_axis: () => void;
    recompute_scale: () => void;
    draw_selected_rows: () => void;
    draw_highlighted: () => void;
    on_resize: (() => void) & _.Cancelable;
}
export declare class PlotXY extends React.Component<PlotXYProps, PlotXYState> {
    plot: PlotXYInternal;
    svg: any;
    root_ref: React.RefObject<HTMLDivElement>;
    container_ref: React.RefObject<HTMLDivElement>;
    canvas_lines_ref: React.RefObject<HTMLCanvasElement>;
    canvas_highlighted_ref: React.RefObject<HTMLCanvasElement>;
    plotXYcontextMenuRef: React.RefObject<ContextMenu>;
    constructor(props: PlotXYProps);
    static defaultProps: {
        axis_x: any;
        axis_y: any;
        lines_thickness: number;
        lines_opacity: any;
        dots_highlighed_thickness: number;
        dots_thickness: number;
        dots_opacity: any;
        data: {};
    };
    componentDidMount(): void;
    mountPlotXY(this: PlotXY): PlotXYInternal;
    onResize: any;
    disable(): void;
    render(): any[] | JSX.Element;
    componentWillUnmount(): void;
    isEnabled(): boolean;
    drawSelected: any;
    drawSelectedThrottled: any;
    componentDidUpdate(prevProps: PlotXYProps, prevState: any): void;
}
export {};
