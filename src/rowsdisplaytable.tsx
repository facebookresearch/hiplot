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


import { Datapoint } from "./types";
import style from "./hiplot.css";
import { HiPlotPluginData } from "./plugin";
import _ from "underscore";
import { FilterType } from "./filters";

interface RowsDisplayTableState {
};

export class RowsDisplayTable extends React.Component<HiPlotPluginData, RowsDisplayTableState> {
    table_ref: React.RefObject<HTMLTableElement> = React.createRef();
    table_container: React.RefObject<HTMLDivElement> = React.createRef();
    dt = null;
    ordered_cols: Array<string> = [];
    empty: boolean;

    setSelected_debounced: (selected: Array<Datapoint>) => void = _.debounce(this.setSelected, 150);

    constructor(props: HiPlotPluginData) {
        super(props);
        this.state = {};
    }
    componentDidMount() {
        this.mountDt();
    }
    mountDt() {
        if (!this.props.params_def["uid"]) {
            return;
        }
        const dom = $(this.table_ref.current);
        this.ordered_cols = ['', 'uid'];
        const me = this;
        $.each(this.props.params_def, function(k: string, def) {
            if (k == 'uid') {
                return;
            }
            me.ordered_cols.push(k);
        });
        dom.empty();
        var columns: Array<{[k: string]: any}> = this.ordered_cols.map(function(x) {
            const pd = me.props.params_def[x];
            return {
                'title': x == '' ? '' : $("<span />").attr("class", pd.label_css).text(x)[0].outerHTML,
                'defaultContent': 'null',
                'type': x == '' ? 'html' : (pd.numeric ? "num" : "string"),
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
        this.dt = dom.DataTable({
            columns: columns,
            data: [],
            deferRender: true, // Create HTML elements only when displayed
            headerCallback: function headerCallback(thead: HTMLTableRowElement, data: Array<Array<any>>, start: number, end: number, display) {
                Array.from(thead.cells).forEach(function(th: HTMLElement, i) {
                    const col = th.innerText;
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
        dom.on( 'search.dt', function (this: RowsDisplayTable) {
            if (!this.dt) {
                return;
            }
            const node = this.dt.buttons()[0].node;
            node.classList.remove("d-none");
            node.classList.remove("btn-secondary");
            const searchResults = this.dt.rows( { filter : 'applied'} );
            if (this.dt.search() == "" || searchResults.nodes().length == 0) {
                node.classList.add("d-none");
            }
        }.bind(this));

        this.empty = true;
        dom.find('tbody')
            .on('mouseenter', 'td', function () {
                if (!me.dt || me.empty) {
                    return;
                }
                const rowIdx = me.dt.cell(this).index().row;
                const row = me.dt.row(rowIdx);
                const individualUidColIdx = me.dt.colReorder.order().indexOf(1);

                dom.find(`.${style.highlight}`).removeClass(style.highlight);
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
        /* Sometimes we need to redraw the entire table
         * but this is super expensive, so let's do it only if
         * strictly necessary
         * aka when changing `numeric` status of a column
         * or when we add/remove columns
         */
        var shouldRemountTable = false;
        if (prevProps.params_def != this.props.params_def) {
            const k1: string[] = Object.keys(prevProps.params_def);
            const k2: string[] = Object.keys(this.props.params_def);
            k1.sort();
            k2.sort();
            if (k1.length != k2.length) {
                shouldRemountTable = true;
            }
            else {
                for (var i = 0; i < k1.length; ++i) {
                    if (k1[i] != k2[i] ||
                            prevProps.params_def[k1[i]].numeric != this.props.params_def[k2[i]].numeric) {
                        shouldRemountTable = true;
                        break;
                    }
                }
            }
        }
        if (shouldRemountTable) {
            this.destroyDt();
            this.mountDt();
        }
        else if (// Rows changed
                prevProps.rows_selected != this.props.rows_selected ||
                // Color changed - need redraw with the correct color
                prevProps.colorby != this.props.colorby ||
                // Color scale changed - need redraw with the correct color
                prevProps.params_def != this.props.params_def
        ) {
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
        var filter = {
            type: FilterType.Search,
            data: dt.search(),
        };
        if (this.props.rows_selected_filter) {
            filter = {
                type: FilterType.All,
                data: [this.props.rows_selected_filter, filter]
            };
        }
        this.props.setSelected(searchResultsDatapoints, filter);
    }
    setSelected(selected: Array<Datapoint>) {
        const dt = this.dt;
        if (!dt) {
            return;
        }
        const ordered_cols = this.ordered_cols;
        const ock = dt.colReorder.transpose([...Array(ordered_cols.length).keys()]);

        dt.clear();
        dt.rows.add(selected.map(function(row) {
            return ock.map(x => x == '' ? '' : row[ordered_cols[x]]);
        }));
        if (dt.search() == "") {
            // Hack to redraw faster
            dt.settings()[0].oFeatures.bFilter = false;
            dt.draw();
            dt.settings()[0].oFeatures.bFilter = true;
        }
        else {
            dt.draw();
        }
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
    destroyDt() {
        if (this.dt) {
            const dt = this.dt;
            this.dt = null;
            dt.destroy();
        }
    }
    componentWillUnmount() {
        this.destroyDt();
    }
}
