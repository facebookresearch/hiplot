/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";
import * as d3 from "d3";

import { HiPlotPluginData } from "../plugin";
import _ from "underscore";
import { DistributionPlot, HistogramData } from "./plot";
import { ResizableH } from "../lib/resizable";


export interface HiPlotDistributionPluginState {
    initialHeight: number,
    height: number,
    width: number,
    axis?: string,
    histData: HistogramData;
};

// DISPLAYS_DATA_DOC_BEGIN
// Corresponds to values in the dict of `exp._displays[hip.Displays.DISTRIBUTION]`
interface DistributionDisplayData {
    // Number of bins for distribution of numeric variables
    nbins: number;

    // Animation duration in ms when data changes
    animateMs: number;

    // Default axis for the distribution plot
    axis?: string;
};
// DISPLAYS_DATA_DOC_END

interface DistributionPluginProps extends HiPlotPluginData, DistributionDisplayData {
};

export class HiPlotDistributionPlugin extends React.Component<DistributionPluginProps, HiPlotDistributionPluginState> {
    container_ref: React.RefObject<HTMLDivElement> = React.createRef();
    constructor(props: DistributionPluginProps) {
        super(props);
        var axis = this.props.persistent_state.get('axis');
        if (axis !== undefined && this.props.params_def[axis] === undefined) {
            axis = undefined;
        }
        if (axis === undefined) {
            axis = this.props.axis;
        }
        if (axis && this.props.params_def[axis] === undefined) {
            axis = undefined;
        }
        const initialHeight = d3.min([d3.max([document.body.clientHeight-540, 240]), 500]);
        this.state = {
            initialHeight: initialHeight,
            height: initialHeight,
            width: 0,
            histData: {selected: [], all: props.rows_filtered},
            axis: axis,
        };
    }
    static defaultProps = {
        nbins: 10,
        animateMs: 750,
    };

    componentDidMount() {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            const me = this;
            this.props.context_menu_ref.current.addCallback(function(column, cm) {
                var contextmenu = $(cm);
                contextmenu.append($('<div class="dropdown-divider"></div>'));
                var option = $('<a class="dropdown-item" href="#">').text("View distribution");
                if (me.state.axis == column) {
                    option.addClass('disabled').css('pointer-events', 'none');
                }
                option.click(function(event) {
                    me.setState({axis: column});
                    event.preventDefault();
                });
                contextmenu.append(option);
            }, this);
        }
    }
    componentDidUpdate(prevProps: HiPlotPluginData, prevState: HiPlotDistributionPluginState) {
        if (prevState.axis != this.state.axis && this.state.axis !== undefined) {
            if (this.props.persistent_state) {
                this.props.persistent_state.set('axis', this.state.axis);
            }
        }
        if (this.state.histData.all != this.props.rows_filtered) {
            this.setState(function(s: HiPlotDistributionPluginState, p) {
                return {
                    histData: {
                        ...s.histData,
                        all: this.props.rows_filtered,
                        selected: this.props.rows_selected,
                    }
                };
            }.bind(this));
        }
        else if (this.state.histData.selected != this.props.rows_selected) {
            this.setState(function(s: HiPlotDistributionPluginState, p) {
                return {
                    histData: {
                        ...s.histData,
                        selected: this.props.rows_selected,
                    }
                };
            }.bind(this));
        }
    }
    componentWillUnmount() {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            this.props.context_menu_ref.current.removeCallbacks(this);
        }
    }
    onResize(height: number, width: number) {
        if (height != this.state.height || width != this.state.width) {
            this.setState({height: height, width: width});
        }
    }
    disable(): void {
      this.setState({width: 0, axis: undefined, height: this.state.initialHeight});
    }
    render() {
        if (this.state.axis === undefined) {
            return [];
        }
        return (<ResizableH initialHeight={this.state.height} onResize={_.debounce(this.onResize.bind(this), 150)} onRemove={this.disable.bind(this)}>
            {this.state.width > 0 && <DistributionPlot
                axis={this.state.axis}
                height={this.state.height}
                width={this.state.width}
                histData={this.state.histData}
                param_def={this.props.params_def[this.state.axis]}
                nbins={this.props.nbins}
                animateMs={this.props.animateMs}
            />}
        </ResizableH>);
    }
};
