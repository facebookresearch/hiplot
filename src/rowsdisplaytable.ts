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

import { AllDatasets, Datapoint, DatapointLookup } from "./types";
import { ParamDefMap } from './infertypes';
//@ts-ignore
import style from "./hiplot.css";
import { HiPlotData } from "./plugin";

interface Config extends HiPlotData {
    root: HTMLDivElement,
}


export class RowsDisplayTable {
    dt = null;
    dom: JQuery;
    ordered_cols: Array<string> = [];
    config: Config;
    empty: boolean;
    setup(c: Config) {
        this.destroy();
        this.dom = $(c.root);
        this.config = c;
        this.ordered_cols = ['uid'];
        var me = this;
        $.each(this.config.params_def, function(k: string, def) {
            if (k == me.ordered_cols[0]) {
                return;
            }
            me.ordered_cols.push(k);
        });
        this.dom.empty();
        this.dt = this.dom.DataTable({
            columns: this.ordered_cols.map(function(x) {
                if (x == "uid") {
                    return {
                        'title': x,
                        'defaultContent': 'null',
                        'createdCell': function (td, cellData, rowData, row, col) {
                            var color = me.config.get_color_for_uid(cellData, 1.0);
                            // <span class="color-block" style="background: rgba(105, 230, 25, 0.85);"></span><span>099918_g1</span>
                            $(td).prepend($('<span>').addClass('color-block').css('background-color', color));
                        }
                    }
                }
                return {
                    'title': x,
                    'defaultContent': 'null'
                };
            }),
            data: [],
            deferRender: true, // Create HTML elements only when displayed
            //@ts-ignore
            colReorder: true,
            buttons: ['csv'],
        });
        this.empty = true;
        this.dom.find('tbody')
            .on('mouseenter', 'td', function () {
                if (!me.dt || me.empty) {
                    return;
                }
                var rowIdx = me.dt.cell(this).index().row;
                var row = me.dt.row(rowIdx);
                var individualUidColIdx = me.dt.colReorder.order().indexOf(0);

                $(me.dt.cells().nodes()).removeClass(style.highlight);
                $(row.nodes()).addClass(style.highlight);
                me.config.rows['highlighted'].set([me.config.dp_lookup[row.data()[individualUidColIdx]]]);
            })
            .on("mouseout", "td", function() {
                if (!me.dt || me.empty) {
                    return;
                }
                var rowIdx = me.dt.cell(this).index().row;
                $(me.dt.row(rowIdx).nodes()).removeClass(style.highlight);
                me.config.rows['highlighted'].set([]);
            });
    }
    set_selected(selected: Array<Datapoint>) {
        var dt = this.dt;
        var ordered_cols = this.ordered_cols;

        dt.clear();
        dt.rows.add(selected.map(function(row) {
            return dt.colReorder.transpose([...Array(ordered_cols.length).keys()]).map(x => row[ordered_cols[x]]);
        }));
        dt.draw();
        this.empty = selected.length == 0;
    }
    destroy() {
        if (this.dt) {
            this.dt.destroy();
        }
    }
}