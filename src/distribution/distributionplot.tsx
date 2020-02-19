/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";
import * as d3 from "d3";
//@ts-ignore
import dt from "datatables.net-bs4";
dt(window, $);
//@ts-ignore
import dtReorder from "datatables.net-colreorder-bs4";
dtReorder(window, $);

import { HiPlotPluginData } from "../plugin";
import _ from "underscore";
import { ParamType, Datapoint } from "../types";
import { DistributionNumericPlot } from "./distributionnumeric";
import { ResizableH } from "../lib/resizable";
import { ParamDef } from "../infertypes";

export interface DistributionPlotState {
    height: number,
    width: number,
    nbins: number,
    axis?: string,
    histData: Array<Datapoint>;
};

export interface DistributionPlotData {
    height: number,
    width: number,
    nbins: number,
    axis: string,
    histData: Array<Datapoint>;
    param_def: ParamDef;
};

export class DistributionPlot extends React.Component<HiPlotPluginData, DistributionPlotState> {
    container_ref: React.RefObject<HTMLDivElement> = React.createRef();
    constructor(props: HiPlotPluginData) {
        super(props);
        var axis = this.props.persistent_state.get('axis');
        if (axis && this.props.params_def[axis] === undefined) {
            axis = undefined;
        }
        this.state = {
            height: d3.min([d3.max([document.body.clientHeight-540, 240]), 500]),
            width: 0,
            nbins: 10,
            histData: [],
            axis: axis,
        };
    }
    componentDidMount() {
        if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
            const me = this;
            this.props.context_menu_ref.current.addCallback(function(column, cm) {
                var contextmenu = $(cm);
                contextmenu.append($('<div class="dropdown-divider"></div>'));
                contextmenu.append($(`<h6 class="dropdown-header">Distribution</h6>`));
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
        this.props.rows.selected.on_change(function(new_dps) {
            this.setState({histData: new_dps});
        }.bind(this), this);
    }
    componentDidUpdate(prevProps: HiPlotPluginData, prevState: DistributionPlotState) {
        if (prevState.axis != this.state.axis) {
            if (this.props.persistent_state) {
                this.props.persistent_state.set('axis', this.state.axis);
            }
        }
    }
    componentWillUnmount() {
        this.props.rows.off(this);
    }
    onResize(height: number, width: number) {
        if (height != this.state.height || width != this.state.width) {
            this.setState({height: height, width: width});
        }
    }
    render() {
        if (this.state.axis === undefined) {
            return [];
        }
        const pd = this.props.params_def[this.state.axis];
        if (pd.type === ParamType.CATEGORICAL) {
            return <p>Not supported for categorical params yet</p>;
        }
        return (<ResizableH initialHeight={this.state.height} onResize={_.debounce(this.onResize.bind(this), 150)}>
            {this.state.width > 0 && <DistributionNumericPlot
                axis={this.state.axis}
                height={this.state.height}
                width={this.state.width}
                nbins={this.state.nbins}
                histData={this.state.histData}
                param_def={this.props.params_def[this.state.axis]}
            />}
        </ResizableH>);
    }
};
