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
    axis: string | null,
    histData: HistogramData;
};

// DISPLAYS_DATA_DOC_BEGIN
// Corresponds to values in the dict of `exp.display_data(hip.Displays.DISTRIBUTION)`
export interface DistributionDisplayData {
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
        var axis = this.props.persistentState.get('axis', null);
        if (axis && this.props.params_def[axis] === undefined) {
            axis = null;
        }
        if (!axis) {
            axis = this.props.axis;
        }
        if (axis && this.props.params_def[axis] === undefined) {
            axis = null;
        }
        const initialHeight = d3.min([d3.max([document.body.clientHeight-540, 240]), 500]);
        this.state = {
            initialHeight: initialHeight,
            height: initialHeight,
            width: 0,
            histData: {selected: [], all: props.rows_filtered},
            axis: axis !== undefined ? axis : null, // Convert undefined into null
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
        if (prevState.axis != this.state.axis) {
            if (this.props.persistentState) {
                this.props.persistentState.set('axis', this.state.axis);
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
        this.onResize.cancel();
    }
    onResize = _.debounce(function(height: number, width: number) {
        if (height != this.state.height || width != this.state.width) {
            this.setState({height: height, width: width});
        }
    }.bind(this), 150);
    disable(): void {
      this.setState({width: 0, axis: null, height: this.state.initialHeight});
    }
    render() {
        if (this.state.axis === null) {
            return [];
        }
        const param_def = this.props.params_def[this.state.axis];
        console.assert(param_def !== undefined, this.state.axis);
        return (<ResizableH initialHeight={this.state.height} onResize={this.onResize} onRemove={this.disable.bind(this)}>
            {this.state.width > 0 && <DistributionPlot
                axis={this.state.axis}
                height={this.state.height}
                width={this.state.width}
                histData={this.state.histData}
                param_def={param_def}
                nbins={this.props.nbins}
                animateMs={this.props.animateMs}
            />}
        </ResizableH>);
    }
};
