/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import style from "./hiplot.scss";
import _ from "underscore";
import { FilterType } from "./filters";
;
var RowsDisplayTable = /** @class */ (function (_super) {
    __extends(RowsDisplayTable, _super);
    function RowsDisplayTable(props) {
        var _this = _super.call(this, props) || this;
        _this.table_ref = React.createRef();
        _this.table_container = React.createRef();
        _this.dt = null;
        _this.ordered_cols = [];
        _this.setSelected_debounced = _.debounce(_this.setSelected, 150);
        _this.state = {};
        return _this;
    }
    RowsDisplayTable.prototype.componentDidMount = function () {
        this.mountDt();
    };
    RowsDisplayTable.prototype.mountDt = function () {
        if (!this.props.params_def["uid"]) {
            return;
        }
        var dom = $(this.table_ref.current);
        this.ordered_cols = ['', 'uid'];
        var me = this;
        $.each(this.props.params_def, function (k, def) {
            if (k == 'uid') {
                return;
            }
            me.ordered_cols.push(k);
        });
        dom.empty();
        var columns = this.ordered_cols.map(function (x) {
            var pd = me.props.params_def[x];
            return {
                'title': x == '' ? '' : $("<span />").attr("class", pd.label_css).text(x)[0].outerHTML,
                'defaultContent': 'null',
                'type': x == '' ? 'html' : (pd.numeric ? "num" : "string")
            };
        });
        columns[0]['render'] = function (data, type, row, meta) {
            if (!me.dt) {
                return '';
            }
            var individualUidColIdx = me.dt.colReorder.order().indexOf(1);
            var color = me.props.get_color_for_row(me.props.dp_lookup[row[individualUidColIdx]], 1.0);
            return "<span class=\"" + style.colorBlock + "\" style=\"background-color: " + color + "\" />";
        };
        this.dt = dom.DataTable({
            columns: columns,
            data: [],
            deferRender: true,
            headerCallback: function headerCallback(thead, data, start, end, display) {
                Array.from(thead.cells).forEach(function (th, i) {
                    var col = th.innerText;
                    if (col != '' && me.dt === null && me.props.context_menu_ref !== undefined) {
                        th.addEventListener('contextmenu', function (e) {
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
            colReorder: true
        });
        var btnsContainer = $(this.table_container.current).find('.col-md-6:eq(1)');
        btnsContainer.addClass("btn-group");
        this.dt.buttons().container().appendTo(btnsContainer);
        btnsContainer.find(".dt-buttons").removeClass("btn-group");
        dom.on('search.dt', function () {
            if (!this.dt) {
                return;
            }
            var node = this.dt.buttons()[0].node;
            node.classList.remove("d-none");
            node.classList.remove("btn-secondary");
            var searchResults = this.dt.rows({ filter: 'applied' });
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
            var rowIdx = me.dt.cell(this).index().row;
            var row = me.dt.row(rowIdx);
            var individualUidColIdx = me.dt.colReorder.order().indexOf(1);
            dom.find(".table-primary").removeClass("table-primary");
            $(row.nodes()).addClass("table-primary");
            me.props.setHighlighted([me.props.dp_lookup[row.data()[individualUidColIdx]]]);
        })
            .on("mouseout", "td", function () {
            if (!me.dt || me.empty) {
                return;
            }
            var rowIdx = me.dt.cell(this).index().row;
            $(me.dt.row(rowIdx).nodes()).removeClass("table-primary");
            me.props.setHighlighted([]);
        });
        me.setSelected(me.props.rows_selected);
    };
    RowsDisplayTable.prototype.componentDidUpdate = function (prevProps) {
        /* Sometimes we need to redraw the entire table
         * but this is super expensive, so let's do it only if
         * strictly necessary
         * aka when changing `numeric` status of a column
         * or when we add/remove columns
         */
        var shouldRemountTable = false;
        if (prevProps.params_def != this.props.params_def) {
            var k1 = Object.keys(prevProps.params_def);
            var k2 = Object.keys(this.props.params_def);
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
        else if ( // Rows changed
        prevProps.rows_selected != this.props.rows_selected ||
            // Color changed - need redraw with the correct color
            prevProps.colorby != this.props.colorby ||
            // Color scale changed - need redraw with the correct color
            prevProps.params_def != this.props.params_def) {
            this.setSelected_debounced(this.props.rows_selected);
        }
    };
    RowsDisplayTable.prototype.setSelectedToSearchResult = function () {
        var dt = this.dt;
        if (!dt) {
            return;
        }
        var searchResults = dt.rows({ filter: 'applied' });
        var uidIdx = this.ordered_cols.indexOf("uid");
        var searchResultsDatapoints = [];
        $.each(searchResults.data(), function (index, value) {
            searchResultsDatapoints.push(this.props.dp_lookup[value[uidIdx]]);
        }.bind(this));
        var filter = {
            type: FilterType.Search,
            data: dt.search()
        };
        if (this.props.rows_selected_filter) {
            filter = {
                type: FilterType.All,
                data: [this.props.rows_selected_filter, filter]
            };
        }
        this.props.setSelected(searchResultsDatapoints, filter);
    };
    RowsDisplayTable.prototype.setSelected = function (selected) {
        var dt = this.dt;
        if (!dt) {
            return;
        }
        var ordered_cols = this.ordered_cols;
        var ock = dt.colReorder.transpose(Array.from(Array(ordered_cols.length).keys()), 'toOriginal');
        dt.clear();
        dt.rows.add(selected.map(function (row) {
            return ock.map(function (x) { return x == '' ? '' : row[ordered_cols[x]]; });
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
    };
    RowsDisplayTable.prototype.render = function () {
        return (React.createElement("div", { className: style.wrap + " container-fluid " + style["horizontal-scrollable"] },
            React.createElement("div", { className: "row" },
                React.createElement("div", { ref: this.table_container, className: "col-md-12 sample-table-container" },
                    React.createElement("table", { ref: this.table_ref, className: "table-hover table-sm sample-rows-table display table-striped table-bordered dataTable" })))));
    };
    RowsDisplayTable.prototype.destroyDt = function () {
        if (this.dt) {
            var dt_1 = this.dt;
            this.dt = null;
            dt_1.destroy();
        }
    };
    RowsDisplayTable.prototype.componentWillUnmount = function () {
        this.destroyDt();
        this.setSelected_debounced.cancel();
    };
    return RowsDisplayTable;
}(React.Component));
export { RowsDisplayTable };
