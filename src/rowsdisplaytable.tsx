/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import React from "react";

//@ts-ignore
import dt from "datatables.net";
//@ts-ignore
import dtBs4 from "datatables.net-bs4";
//@ts-ignore
import dtReorder from "datatables.net-colreorder";
//@ts-ignore
import dtReorderBs4 from "datatables.net-colreorder-bs4";
//@ts-ignore
import dtButtons from "datatables.net-buttons";
//@ts-ignore
import dtButtonsBs4 from "datatables.net-buttons-bs4";

dt(window, $);
dtBs4(window, $);
dtReorder(window, $);
dtReorderBs4(window, $);
dtButtons(window, $);
dtButtonsBs4(window, $);


import { Datapoint, ParamType } from "./types";
import style from "./hiplot.css";
import { HiPlotPluginData } from "./plugin";
import _ from "underscore";

interface RowsDisplayTableState {
};

export class RowsDisplayTable extends React.Component<HiPlotPluginData, RowsDisplayTableState> {
    table_ref: React.RefObject<HTMLTableElement> = React.createRef();
    table_container: React.RefObject<HTMLDivElement> = React.createRef();
    dt = null;
    dom: JQuery;
    ordered_cols: Array<string> = [];
    empty: boolean;

    setSelected_debounced: (selected: Array<Datapoint>) => void = _.debounce(this.setSelected, 150);

    constructor(props: HiPlotPluginData) {
        super(props);
        this.state = {};
    }
    componentDidMount() {
        this.dom = $(this.table_ref.current);
        this.ordered_cols = ['', 'uid'];
        const me = this;
        $.each(this.props.params_def, function(k: string, def) {
            if (k == 'uid') {
                return;
            }
            me.ordered_cols.push(k);
        });
        this.dom.empty();
        var columns: Array<{[k: string]: any}> = this.ordered_cols.map(function(x) {
            return {
                'title': x,
                'defaultContent': 'null',
                'type': x == '' ? 'html' : (me.props.params_def[x].numeric ? "num" : "string"),
            };
        });
        columns[0]['render'] = function(data, type, row, meta) {
            if (!me.dt) {
                return '';
            }
            const individualUidColIdx = me.dt.colReorder.order().indexOf(1);
            const color = me.props.get_color_for_row(me.props.dp_lookup[row[individualUidColIdx]], 1.0);
            return `<span class="${style.colorBlock}" style="background-color: ${color}" />`;
        };
        this.dt = this.dom.DataTable({
            columns: columns,
            data: [],
            deferRender: true, // Create HTML elements only when displayed
            headerCallback: function headerCallback(thead: HTMLTableRowElement, data: Array<Array<any>>, start: number, end: number, display) {
                Array.from(thead.cells).forEach(function(th, i) {
                    const col = th.innerHTML;
                    if (col != '' && me.dt === null && me.props.context_menu_ref !== undefined) {
                        th.addEventListener('contextmenu', e => {
                            me.props.context_menu_ref.current.show(e.pageX, e.pageY, col);
                            e.preventDefault();
                            e.stopPropagation();
                        });
                    }
                });
            },
            //@ts-ignore
            buttons: [
                {
                    text: 'Select results',
                    className: 'btn-sm btn-outline-primary d-none',
                    action: this.setSelectedToSearchResult.bind(this)
                }
            ],
            //@ts-ignore
            colReorder: true,
        });
        const btnsContainer = $(this.table_container.current).find('.col-md-6:eq(1)');
        btnsContainer.addClass("btn-group");
        this.dt.buttons().container().appendTo(btnsContainer);
        btnsContainer.find(".dt-buttons").removeClass("btn-group");
        this.dom.on( 'search.dt', function () {
            const node = this.dt.buttons()[0].node;
            node.classList.remove("d-none");
            node.classList.remove("btn-secondary");
            const searchResults = this.dt.rows( { filter : 'applied'} );
            if (this.dt.search() == "" || searchResults.nodes().length == 0) {
                node.classList.add("d-none");
            }
        }.bind(this));

        this.empty = true;
        this.dom.find('tbody')
            .on('mouseenter', 'td', function () {
                if (!me.dt || me.empty) {
                    return;
                }
                const rowIdx = me.dt.cell(this).index().row;
                const row = me.dt.row(rowIdx);
                const individualUidColIdx = me.dt.colReorder.order().indexOf(1);

                $(me.dt.cells().nodes()).removeClass(style.highlight);
                $(row.nodes()).addClass(style.highlight);
                me.props.setHighlighted([me.props.dp_lookup[row.data()[individualUidColIdx]]]);
            })
            .on("mouseout", "td", function() {
                if (!me.dt || me.empty) {
                    return;
                }
                const rowIdx = me.dt.cell(this).index().row;
                $(me.dt.row(rowIdx).nodes()).removeClass(style.highlight);
                me.props.setHighlighted([]);
            });

        me.setSelected(me.props.rows_selected);
    }
    componentDidUpdate(prevProps: HiPlotPluginData): void {
        if (prevProps.rows_selected != this.props.rows_selected) {
            this.setSelected_debounced(this.props.rows_selected);
        }
    }
    setSelectedToSearchResult() {
        const dt = this.dt;
        if (!dt) {
            return;
        }
        const searchResults = dt.rows( { filter : 'applied'} );
        const uidIdx = this.ordered_cols.indexOf("uid");
        var searchResultsDatapoints = [];
        $.each(searchResults.data(), function(index, value) {
            searchResultsDatapoints.push(this.props.dp_lookup[value[uidIdx]]);
        }.bind(this));
        this.props.setSelected(searchResultsDatapoints);
    }
    setSelected(selected: Array<Datapoint>) {
        const dt = this.dt;
        if (!dt) {
            return;
        }
        const ordered_cols = this.ordered_cols;

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
            <div ref={this.table_container} className={`col-md-12 sample-table-container`}>
            <table ref={this.table_ref} className="sample-rows-table display table table-striped table-bordered dataTable">
            </table>
            </div>
        </div>
        </div>
        );
    }
    componentWillUnmount() {
        if (this.dt) {
            const dt = this.dt;
            this.dt = null;
            dt.destroy();
        }
    }
}
