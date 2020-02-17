/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";
//@ts-ignore
import dt from "datatables.net-bs4";
dt(window, $);
//@ts-ignore
import dtReorder from "datatables.net-colreorder-bs4";
dtReorder(window, $);

import { Datapoint, ParamType } from "./types";
import style from "./hiplot.css";
import { HiPlotPluginData } from "./plugin";
import _ from "underscore";

interface RowsDisplayTableState {
};

export class RowsDisplayTable extends React.Component<HiPlotPluginData, RowsDisplayTableState> {
    table_ref: React.RefObject<HTMLTableElement> = React.createRef();
    dt = null;
    dom: JQuery;
    ordered_cols: Array<string> = [];
    empty: boolean;
    constructor(props: HiPlotPluginData) {
        super(props);
        this.state = {};
    }
    componentDidMount() {
        this.dom = $(this.table_ref.current);
        this.ordered_cols = ['', 'uid'];
        var me = this;
        $.each(this.props.params_def, function(k: string, def) {
            if (k == 'uid') {
                return;
            }
            me.ordered_cols.push(k);
        });
        this.dom.empty();
        var params_def = this.props.params_def;
        var columns: Array<{[k: string]: any}> = this.ordered_cols.map(function(x) {
            return {
                'title': x,
                'defaultContent': 'null',
                'type': x == '' ? 'html' : (params_def[x].numeric ? "num" : "string"),
            };
        });
        columns[0]['render'] = function(data, type, row, meta) {
            var individualUidColIdx = me.dt.colReorder.order().indexOf(1);
            var color = me.props.get_color_for_row(me.props.dp_lookup[row[individualUidColIdx]], 1.0);
            return `<span class="${style.colorBlock}" style="background-color: ${color}" />`;
        };
        this.dt = this.dom.DataTable({
            columns: columns,
            data: [],
            deferRender: true, // Create HTML elements only when displayed
            //@ts-ignore
            colReorder: true,
        });
        this.empty = true;
        this.dom.find('tbody')
            .on('mouseenter', 'td', function () {
                if (!me.dt || me.empty) {
                    return;
                }
                var rowIdx = me.dt.cell(this).index().row;
                var row = me.dt.row(rowIdx);
                var individualUidColIdx = me.dt.colReorder.order().indexOf(1);

                $(me.dt.cells().nodes()).removeClass(style.highlight);
                $(row.nodes()).addClass(style.highlight);
                me.props.rows['highlighted'].set([me.props.dp_lookup[row.data()[individualUidColIdx]]]);
            })
            .on("mouseout", "td", function() {
                if (!me.dt || me.empty) {
                    return;
                }
                var rowIdx = me.dt.cell(this).index().row;
                $(me.dt.row(rowIdx).nodes()).removeClass(style.highlight);
                me.props.rows['highlighted'].set([]);
            });

        me.set_selected(me.props.rows['selected'].get());
        me.props.rows['selected'].on_change(_.debounce(function(selection) {
            me.set_selected(selection);
        }, 150), this);
    }
    set_selected(selected: Array<Datapoint>) {
        var dt = this.dt;
        var ordered_cols = this.ordered_cols;

        dt.clear();
        dt.rows.add(selected.map(function(row) {
            return dt.colReorder.transpose([...Array(ordered_cols.length).keys()]).map(x => x == '' ? '' : row[ordered_cols[x]]);
        }));
        dt.draw();
        this.empty = selected.length == 0;
    }
    render() {
        return (
        <div className={`${style.wrap} container-fluid ${style["horizontal-scrollable"]}`}>
        <div className={"row"}>
            <div className={`col-md-12 sample-table-container`}>
            <table ref={this.table_ref} className="sample-rows-table display table table-striped table-bordered dataTable">
            </table>
            </div>
        </div>
        </div>
        );
    }
    componentWillUnmount() {
        if (this.dt) {
            this.dt.destroy();
        }
        this.props.rows.off(this);
    }
}
