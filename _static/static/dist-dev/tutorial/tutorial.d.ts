import React from "react";
interface TutorialStepProps {
    rootRef: React.RefObject<HTMLElement>;
}
interface Props {
    onTutorialDone: () => void;
    navbarRoot: React.RefObject<HTMLDivElement>;
}
interface State {
    stepNum: number;
}
export declare class HiPlotTutorial extends React.Component<Props, State> {
    steps: ((p: TutorialStepProps) => JSX.Element)[];
    constructor(props: Props);
    onClickNextTutorial(): void;
    onClickPreviousTutorial(): void;
    render(): JSX.Element;
}
export {};
