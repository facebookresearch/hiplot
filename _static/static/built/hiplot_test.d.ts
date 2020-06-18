import { ParallelPlot } from "./parallel/parallel";
import { HiPlotProps, HiPlot } from "./hiplot";
import React from "react";
import { PlotXY } from "./plotxy";
interface TesterState {
    testNum: number;
    testDone: boolean;
    renderNum: number;
    width: number;
    keepCount: number;
}
export declare class HiPlotTester extends React.Component<{
    hiplotProps: HiPlotProps;
}, TesterState> {
    root: React.RefObject<HTMLDivElement>;
    hiplot: React.RefObject<HiPlot>;
    timeout: ReturnType<typeof setTimeout>;
    state: {
        testNum: number;
        testDone: boolean;
        renderNum: number;
        keepCount: number;
        width: number;
    };
    testSelection: {
        name: string;
        test: () => void;
    }[];
    testFn: any[];
    testSelect(): void;
    testSelectNone(): void;
    testSelectAll(): void;
    testHighlightAllSelected(): void;
    testButton(text: string): void;
    testChangeColor(): void;
    checkStartTesting(): void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    simulateRefresh(): void;
    render(): JSX.Element;
    pplot(): ParallelPlot;
    plotxy(): PlotXY;
}
export declare function render(element: HTMLElement, extra?: object): void;
export {};
