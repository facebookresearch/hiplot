/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";
import style from "./style.scss";

interface TutorialStepProps {
    rootRef: React.RefObject<HTMLElement>;
};

class StepParallelPlot extends React.Component<TutorialStepProps, {}> {
    componentDidMount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-root').addClass(style.highlightElement);
    }
    componentWillUnmount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-root').removeClass(style.highlightElement);
    }
    render() {
        return (
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Step 1/4: The parallel plot</h4>
            <p>The first plot you see above is a <strong>Parallel Plot</strong>.
                Parallel plots are a convenient way to visualize and filter high-dimensional data.
                HiPlot will draw one vertical scaled axis for each metric you have in your dataset,
                and each training/data point is a continuous line that goes through its value on each of the axes.
            </p>
            <hr/>
            <p className="mb-0">
            Learn more about <a href="https://en.wikipedia.org/wiki/Parallel_coordinates">Parallel coordinates</a> on Wikipedia.
            </p>
        </div>
        )
    }
}

class StepLearnToSlice extends React.Component<TutorialStepProps, {}> {
    componentDidMount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-brush').addClass(style.highlightElement);
    }
    componentWillUnmount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-brush').removeClass(style.highlightElement);
    }
    render() {
        return (
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Step 2/4: Slicing data</h4>
            <p>Slicing along an axis allows to discover patterns in the data. <strong>Drag vertically along an axis</strong> to display only a subset of the data.
                You also can do it on several axis at the same time.
            </p>
            <hr/>
            <p className="mb-0">
            To remove a slicing on an axis, click on the axis.
            </p>
        </div>
        )
    }
}

class StepMoveAndRemoveColumns extends React.Component<TutorialStepProps, {}> {
    componentDidMount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').addClass(style.highlightText);
    }
    componentWillUnmount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').removeClass(style.highlightText);
    }
    render() {
        return (
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Step 3/4: Move and remove axis</h4>
            <p>Move an axis by <strong>dragging its label above</strong>.
                In parallel plots, we can very easily spot relationships between nearby axis.
                You can also <strong>remove</strong> an axis by moving it all the way to the left or to the right.
            </p>
        </div>
        )
    }
}

class StepDataTypeAndScaling extends React.Component<TutorialStepProps, {}> {
    componentDidMount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').addClass(style.highlightText);
    }
    componentWillUnmount() {
        $(this.props.rootRef.current.parentElement).find('.pplot-label').removeClass(style.highlightText);
    }
    render() {
        return (
        <div className="alert alert-info" role="alert">
            <h4 className="alert-heading">Step 4/4: Data type and scaling</h4>
            <p><strong>Right click on an axis</strong> to see options.
                You can chose how to color your datapoints, change the scaling and more!
            </p>
            <hr/>
            <p className="mb-0">
            In this same menu, you can enable an <strong>XY plot</strong> by selecting an X and Y axis.
            </p>
        </div>
        )
    }
}

class StepTutorialDone extends React.Component<TutorialStepProps, {}> {
    render() {
        return (
        <div className="alert alert-success" role="alert">
            <h4 className="alert-heading">Well done!</h4>
            <p>Aww yeah, you successfully finished the tutorial!
                We hope you enjoy using HiPlot :)<br />
                <a href="https://facebookresearch.github.io/hiplot/">Check the documentation</a> to learn more, or
                click <strong>Done</strong> to finish the tutorial.
            </p>
            <hr/>
            <p className="mb-0">
                Did you know that you can use HiPlot in your ipython notebooks as well?
            </p>
        </div>
        )
    }
}
interface Props {
    onTutorialDone: () => void;
    navbarRoot: React.RefObject<HTMLDivElement>;
};

interface State {
    stepNum: number;
};

export class HiPlotTutorial extends React.Component<Props, State> {
    steps = [
        (p: TutorialStepProps) => <StepParallelPlot {...p} />,
        (p: TutorialStepProps) => <StepLearnToSlice {...p} />,
        (p: TutorialStepProps) => <StepMoveAndRemoveColumns {...p} />,
        (p: TutorialStepProps) => <StepDataTypeAndScaling {...p} />,
        (p: TutorialStepProps) => <StepTutorialDone {...p} />,
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            stepNum: 0
        };
    }
    onClickNextTutorial() {
        this.setState(function(prevState, prevProps) {
            return {
                stepNum: Math.min(prevState.stepNum + 1, this.steps.length - 1)
            };
        });
    }
    onClickPreviousTutorial() {
        this.setState(function(prevState, prevProps) {
            return {
                stepNum: Math.max(prevState.stepNum - 1, 0)
            };
        });
    }

    render() {
        return (
            <div className={`row ${style.tutoAlert}`}>
                <div className="col-md-9">{this.steps[this.state.stepNum]({
                    rootRef: this.props.navbarRoot
                })}</div>
                <div className="col-md-3">
                    {this.state.stepNum > 0 && <button className="btn btn-outline-primary" onClick={this.onClickPreviousTutorial.bind(this)}>Previous</button>}
                    {this.state.stepNum + 1 < this.steps.length &&
                        <button className="btn btn-outline-primary" onClick={this.onClickNextTutorial.bind(this)}>Next</button>
                    }
                    {this.state.stepNum + 1 == this.steps.length &&
                        <button className="btn btn-outline-primary" onClick={() => this.props.onTutorialDone()}>Done</button>
                    }
                </div>
            </div>
        )
    }
}
