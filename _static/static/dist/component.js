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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var _a;
import $ from "jquery";
import * as _ from 'underscore';
import React from "react";
import './style/global';
import { ParamType, HiPlotLoadStatus, PSTATE_COLOR_BY, PSTATE_PARAMS, PSTATE_FILTERS } from "./types";
import { RowsDisplayTable } from "./rowsdisplaytable";
import { infertypes, colorScheme } from "./infertypes";
import { PersistentStateInMemory } from "./lib/savedstate";
import { ParallelPlot } from "./parallel/parallel";
import { PlotXY } from "./plotxy";
import { SelectedCountProgressBar } from "./controls";
import { ErrorDisplay, HeaderBar } from "./header";
import { StaticDataProvider } from "./dataproviders/static";
import { uncompress } from "./lib/compress";
import { setupBrowserCompat } from "./lib/browsercompat";
//@ts-ignore
import LogoSVG from "../hiplot/static/logo.svg";
//@ts-ignore
import LogoSVGW from "../hiplot/static/logo-w.svg";
//@ts-ignore
import style from "./hiplot.scss";
import { ContextMenu } from "./contextmenu";
import { HiPlotDistributionPlugin } from "./distribution/plugin";
import { FilterType, apply_filters, apply_filter } from "./filters";
// Exported from HiPlot
export { PlotXY } from "./plotxy";
export { ParallelPlot } from "./parallel/parallel";
export { RowsDisplayTable } from "./rowsdisplaytable";
export { HiPlotLoadStatus } from "./types";
;
var makeCancelable = function (promise) {
    var hasCanceled_ = false;
    var wrappedPromise = new Promise(function (resolve, reject) {
        promise.then(function (val) { return hasCanceled_ ? reject({ isCanceled: true }) : resolve(val); }, function (error) { return hasCanceled_ ? reject({ isCanceled: true }) : reject(error); });
    });
    return {
        promise: wrappedPromise,
        cancel: function () {
            hasCanceled_ = true;
        }
    };
};
;
function detectIsDarkTheme() {
    // Hack: detect dark/light theme in Jupyter Lab
    var jupyterLabAttrLightTheme = "data-jp-theme-light";
    if (document.body.hasAttribute(jupyterLabAttrLightTheme)) {
        return document.body.getAttribute(jupyterLabAttrLightTheme) == "false";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
export var DefaultPlugins;
(function (DefaultPlugins) {
    // Names correspond to values of (python) hip.Displays
    DefaultPlugins["PARALLEL_PLOT"] = "PARALLEL_PLOT";
    DefaultPlugins["XY"] = "XY";
    DefaultPlugins["DISTRIBUTION"] = "DISTRIBUTION";
    DefaultPlugins["TABLE"] = "TABLE";
})(DefaultPlugins || (DefaultPlugins = {}));
export var defaultPlugins = (_a = {},
    // @ts-ignore
    _a[DefaultPlugins.PARALLEL_PLOT] = ParallelPlot,
    // @ts-ignore
    _a[DefaultPlugins.XY] = PlotXY,
    // @ts-ignore
    _a[DefaultPlugins.DISTRIBUTION] = HiPlotDistributionPlugin,
    // @ts-ignore
    _a[DefaultPlugins.TABLE] = RowsDisplayTable,
    _a);
export function createDefaultPlugins() {
    return Object.assign({}, defaultPlugins);
}
;
var HiPlot = /** @class */ (function (_super) {
    __extends(HiPlot, _super);
    function HiPlot(props) {
        var _this = _super.call(this, props) || this;
        // React refs
        _this.contextMenuRef = React.createRef();
        _this.rootRef = React.createRef();
        _this.plugins_window_state = {};
        _this.plugins_ref = {}; // For debugging/tests
        _this.callSelectedUidsHooks = _.debounce(function () {
            this.sendMessage("selected_uids", function () { return this.state.rows_selected.map(function (row) { return '' + row['uid']; }); }.bind(this));
        }.bind(_this), 200);
        _this.callFilteredUidsHooks = _.debounce(function () {
            this.sendMessage("filtered_uids", function () { return this.state.rows_filtered.map(function (row) { return '' + row['uid']; }); }.bind(this));
        }.bind(_this), 200);
        _this.state = {
            experiment: null,
            colormap: null,
            loadStatus: HiPlotLoadStatus.None,
            loadPromise: null,
            error: null,
            dp_lookup: {},
            rows_all_unfiltered: [],
            rows_filtered: [],
            rows_filtered_filters: [],
            rows_selected: [],
            rows_selected_filter: null,
            rows_highlighted: [],
            params_def: {},
            params_def_unfiltered: {},
            colorby: null,
            dark: _this.props.dark === null ? detectIsDarkTheme() : _this.props.dark,
            persistentState: props.persistentState !== undefined && props.persistentState !== null ? props.persistentState : new PersistentStateInMemory("", {}),
            dataProvider: _this.props.dataProvider ? _this.props.dataProvider : StaticDataProvider
        };
        Object.keys(props.plugins).forEach(function (name, index) {
            _this.plugins_window_state[name] = {};
            _this.plugins_ref[name] = React.createRef();
        });
        return _this;
    }
    HiPlot.getDerivedStateFromError = function (error) {
        // Update state so the next render will show the fallback UI.
        return {
            experiment: null,
            loadStatus: HiPlotLoadStatus.Error,
            error: error.toString()
        };
    };
    HiPlot.prototype.makeDatasets = function (experiment, dp_lookup, initial_filters) {
        if (experiment) {
            var rows_all_unfiltered = experiment.datapoints.map(function (t) {
                var obj_with_uid = $.extend({
                    "uid": t.uid,
                    "from_uid": t.from_uid
                }, t.values);
                dp_lookup[t.uid] = obj_with_uid;
                return obj_with_uid;
            });
            var rows_filtered = rows_all_unfiltered;
            try {
                rows_filtered = apply_filters(rows_all_unfiltered, initial_filters);
                if (!rows_filtered.length) {
                    rows_filtered = rows_all_unfiltered;
                    console.log("Not reapplying filters (would filter out all rows)");
                }
            }
            catch (err) {
                console.error("Error trying to apply filters", initial_filters, ":", err);
            }
            return {
                rows_all_unfiltered: rows_all_unfiltered,
                rows_filtered: rows_filtered,
                rows_selected: rows_filtered,
                rows_highlighted: []
            };
        }
        return {
            rows_all_unfiltered: [],
            rows_filtered: [],
            rows_selected: [],
            rows_highlighted: []
        };
    };
    HiPlot.prototype.sendMessage = function (type, get_data) {
        if (this.props.onChange !== null && this.props.onChange[type]) {
            var data = get_data();
            this.props.onChange[type](type, data);
        }
    };
    HiPlot.prototype._loadExperiment = function (experiment) {
        // Uncompress if compressed
        if (experiment.datapoints === undefined) {
            experiment.datapoints = uncompress(experiment.datapoints_compressed);
        }
        // Generate dataset for Parallel Plot
        var dp_lookup = {};
        var initFilters = this.state.persistentState.get(PSTATE_FILTERS, []);
        var datasets = this.makeDatasets(experiment, dp_lookup, initFilters);
        if (datasets.rows_all_unfiltered == datasets.rows_filtered) {
            initFilters = [];
        }
        var params_def = infertypes(this.state.persistentState.children(PSTATE_PARAMS), datasets.rows_filtered, experiment.parameters_definition);
        var params_def_unfiltered = infertypes(this.state.persistentState.children(PSTATE_PARAMS), datasets.rows_all_unfiltered, experiment.parameters_definition);
        // Color handling
        function get_default_color() {
            if (experiment.colorby && params_def[experiment.colorby]) {
                return experiment.colorby;
            }
            function select_as_coloring_score(r) {
                var pd = params_def[r];
                var score = 0;
                if (pd.colors || pd.colormap) {
                    score += 100;
                }
                if (pd.type == ParamType.CATEGORICAL) {
                    score -= 20;
                }
                if (pd.optional) {
                    score -= 40;
                }
                return score;
            }
            ;
            var possibles = Object.keys(params_def).sort(function (a, b) { return select_as_coloring_score(b) - select_as_coloring_score(a); });
            return possibles[0];
        }
        var colorby = this.state.persistentState.get(PSTATE_COLOR_BY, get_default_color());
        if (params_def[colorby] === undefined) {
            colorby = get_default_color();
        }
        this.setState(function (state, props) {
            return __assign({ experiment: experiment, colormap: experiment.colormap, loadStatus: HiPlotLoadStatus.Loaded, dp_lookup: dp_lookup, colorby: colorby, params_def: params_def, params_def_unfiltered: params_def_unfiltered, rows_filtered_filters: initFilters }, datasets);
        });
    };
    HiPlot.prototype.getColorForRow = function (trial, alpha) {
        return colorScheme(this.state.params_def[this.state.colorby], trial[this.state.colorby], alpha, this.state.colormap);
    };
    ;
    HiPlot.prototype.loadWithPromise = function (prom) {
        this.setState({
            loadStatus: HiPlotLoadStatus.Loading,
            loadPromise: makeCancelable(prom)
        });
    };
    HiPlot.prototype.componentWillUnmount = function () {
        if (this.contextMenuRef.current) {
            this.contextMenuRef.current.removeCallbacks(this);
        }
        if (this.state.loadPromise) {
            this.state.loadPromise.cancel();
        }
        this.callSelectedUidsHooks.cancel();
        this.callFilteredUidsHooks.cancel();
    };
    HiPlot.prototype.componentDidMount = function () {
        setupBrowserCompat(this.rootRef.current);
        // Setup contextmenu when we right-click a parameter
        this.contextMenuRef.current.addCallback(this.columnContextMenu.bind(this), this);
        // Load experiment provided in constructor if any
        if (this.props.experiment) {
            this.loadWithPromise(new Promise(function (resolve, reject) {
                resolve({ experiment: this.props.experiment });
            }.bind(this)));
        }
    };
    HiPlot.prototype.componentDidUpdate = function (prevProps, prevState) {
        if (prevState.rows_filtered_filters != this.state.rows_filtered_filters) {
            this.state.persistentState.set(PSTATE_FILTERS, this.state.rows_filtered_filters);
        }
        if (prevState.colorby != this.state.colorby && this.state.colorby) {
            this.state.persistentState.set(PSTATE_COLOR_BY, this.state.colorby);
        }
        if (this.state.loadStatus != HiPlotLoadStatus.Loading) {
            if (this.props.experiment !== null &&
                ((this.state.loadStatus == HiPlotLoadStatus.Error && this.props.experiment !== prevProps.experiment) ||
                    (this.state.loadStatus != HiPlotLoadStatus.Error && this.props.experiment !== this.state.experiment))) {
                this.loadWithPromise(new Promise(function (resolve, reject) {
                    resolve({ experiment: this.props.experiment });
                }.bind(this)));
            }
            else {
                if (prevState.rows_selected != this.state.rows_selected) {
                    this.callSelectedUidsHooks();
                }
                if (prevState.rows_filtered != this.state.rows_filtered) {
                    this.callFilteredUidsHooks();
                }
            }
        }
        if (this.state.loadStatus == HiPlotLoadStatus.Loading &&
            this.state.loadPromise != prevState.loadPromise) {
            var prom = this.state.loadPromise.promise;
            var me_1 = this;
            prom.then(function (data) {
                if (data.error !== undefined) {
                    console.log("Experiment loading failed", data);
                    me_1.setState({
                        loadStatus: HiPlotLoadStatus.Error,
                        experiment: null,
                        error: data.error
                    });
                    return;
                }
                me_1._loadExperiment(data.experiment);
            })["catch"](function (error) {
                if (error.isCanceled) {
                    return;
                }
                console.log('Error', error);
                me_1.setState({ loadStatus: HiPlotLoadStatus.Error, experiment: null, error: 'HTTP error, check server logs / javascript console' });
                throw error;
            });
        }
    };
    HiPlot.prototype.columnContextMenu = function (column, cm) {
        var _a;
        var VAR_TYPE_TO_NAME = (_a = {},
            _a[ParamType.CATEGORICAL] = 'Categorical',
            _a[ParamType.NUMERIC] = 'Number',
            _a[ParamType.NUMERICLOG] = 'Number (log-scale)',
            _a[ParamType.NUMERICPERCENTILE] = 'Number (percentile-scale)',
            _a[ParamType.TIMESTAMP] = 'Timestamp',
            _a);
        var contextmenu = $(cm);
        contextmenu.append($('<h6 class="dropdown-header">Data scaling</h6>'));
        this.state.params_def[column].type_options.forEach(function (possible_type) {
            var option = $('<a class="dropdown-item" href="#">').text(VAR_TYPE_TO_NAME[possible_type]);
            if (possible_type == this.state.params_def[column].type) {
                option.addClass('disabled').css('pointer-events', 'none');
            }
            option.click(function (event) {
                contextmenu.css('display', 'none');
                this.setState(function (state, props) {
                    var _a;
                    return {
                        params_def: __assign(__assign({}, state.params_def), (_a = {}, _a[column] = __assign(__assign({}, state.params_def[column]), { type: possible_type }), _a))
                    };
                });
                this.state.persistentState.children(PSTATE_PARAMS).children(column).set('type', possible_type);
                event.preventDefault();
            }.bind(this));
            contextmenu.append(option);
        }.bind(this));
        contextmenu.append($('<div class="dropdown-divider"></div>'));
        // Color by
        var link_colorize = $('<a class="dropdown-item" href="#">Use for coloring</a>');
        link_colorize.click(function (event) {
            this.setState({
                colorby: column
            });
            event.preventDefault();
        }.bind(this));
        if (this.state.colorby == column) {
            link_colorize.addClass('disabled').css('pointer-events', 'none');
        }
        contextmenu.append(link_colorize);
    };
    HiPlot.prototype.createNewParamsDef = function (rows_filtered) {
        var new_pd = Object.assign({}, this.state.params_def);
        Object.assign(new_pd, infertypes(this.state.persistentState.children(PSTATE_PARAMS), rows_filtered, this.state.params_def));
        return new_pd;
    };
    HiPlot.prototype.restoreAllRows = function () {
        /**
         * When we hit `Restore` button
         */
        this.setState(function (state, props) {
            var all_rows = state.rows_all_unfiltered;
            var new_pd = this.createNewParamsDef(all_rows);
            return {
                rows_selected: all_rows,
                rows_selected_filter: null,
                rows_filtered: all_rows,
                rows_filtered_filters: [],
                params_def: new_pd
            };
        }.bind(this));
    };
    ;
    HiPlot.prototype.filterRows = function (keep) {
        /**
         * When we hit Keep (keep=true), or Exclude (keep=false) buttons
         */
        this.setState(function (state, props) {
            var new_filtered = keep ? state.rows_selected : _.difference(state.rows_filtered, state.rows_selected);
            var filter = state.rows_selected_filter;
            if (!keep) {
                filter = {
                    type: FilterType.Not,
                    data: filter
                };
            }
            var new_pd = this.createNewParamsDef(new_filtered);
            return {
                rows_filtered: new_filtered,
                params_def: new_pd,
                rows_selected_filter: null,
                rows_filtered_filters: state.rows_filtered_filters.concat([filter])
            };
        }.bind(this));
    };
    ;
    HiPlot.prototype.setSelected = function (rows, filter) {
        if (filter === void 0) { filter = null; }
        if (filter && _.isEqual(filter, this.state.rows_selected_filter)) {
            return;
        }
        if (filter && this.props.asserts) {
            var new_rows = apply_filter(this.state.rows_filtered, filter);
            if (new_rows.length != rows.length || _.difference(new_rows, rows).length) {
                console.error("Warning! Filter ", filter, " does not match given rows", rows, " Computed rows with filter:", new_rows);
            }
        }
        this.setState({
            rows_selected: rows,
            rows_selected_filter: filter
        });
    };
    HiPlot.prototype.setHighlighted = function (rows) {
        this.setState({ rows_highlighted: rows });
    };
    HiPlot.prototype.renderRowText = function (row) {
        return row.uid;
    };
    ;
    HiPlot.prototype.render = function () {
        var datasets = {
            rows_all_unfiltered: this.state.rows_all_unfiltered,
            rows_filtered: this.state.rows_filtered,
            rows_highlighted: this.state.rows_highlighted,
            rows_selected: this.state.rows_selected
        };
        var controlProps = __assign({ restoreAllRows: this.restoreAllRows.bind(this), filterRows: this.filterRows.bind(this) }, datasets);
        var createPluginProps = function (name) {
            return __assign(__assign(__assign({ ref: this.plugins_ref[name] }, (this.state.experiment.display_data && this.state.experiment.display_data[name] ? this.state.experiment.display_data[name] : {})), datasets), { rows_selected_filter: this.state.rows_selected_filter, name: name, persistentState: this.state.persistentState.children(name), window_state: this.plugins_window_state[name], sendMessage: this.sendMessage.bind(this), get_color_for_row: this.getColorForRow.bind(this), experiment: this.state.experiment, params_def: this.state.params_def, params_def_unfiltered: this.state.params_def_unfiltered, dp_lookup: this.state.dp_lookup, colorby: this.state.colorby, render_row_text: this.renderRowText.bind(this), context_menu_ref: this.contextMenuRef, setSelected: this.setSelected.bind(this), setHighlighted: this.setHighlighted.bind(this), asserts: this.props.asserts });
        }.bind(this);
        return (React.createElement("div", { ref: this.rootRef, className: "hip_thm--" + (this.state.dark ? "dark" : "light") },
            React.createElement("div", { className: style.hiplot },
                React.createElement(SelectedCountProgressBar, __assign({}, controlProps)),
                React.createElement(HeaderBar, __assign({ weightColumn: this.state.experiment ? this.state.experiment.weightcolumn : undefined, onLoadExperiment: this.loadWithPromise.bind(this), persistentState: this.state.persistentState, dataProvider: this.state.dataProvider, loadStatus: this.state.loadStatus, dark: this.state.dark }, controlProps)),
                this.state.loadStatus == HiPlotLoadStatus.Error &&
                    React.createElement(ErrorDisplay, { error: this.state.error }),
                this.state.loadStatus != HiPlotLoadStatus.Loaded &&
                    React.createElement(DocAndCredits, { dark: this.state.dark }),
                React.createElement(ContextMenu, { ref: this.contextMenuRef }),
                this.state.loadStatus == HiPlotLoadStatus.Loaded &&
                    React.createElement("div", null, (this.state.experiment.enabled_displays !== undefined ? this.state.experiment.enabled_displays : Object.keys(this.props.plugins)).map(function (display_name) {
                        var plugin = this.props.plugins[display_name];
                        return React.createElement(React.Fragment, { key: display_name }, React.createElement(plugin, createPluginProps(display_name)));
                    }.bind(this))))));
    };
    HiPlot.prototype.getPlugin = function (cls) {
        var entries = Object.entries(this.props.plugins);
        for (var i = 0; i < entries.length; ++i) {
            if (entries[i][1] == cls) {
                return this.plugins_ref[entries[i][0]].current;
            }
        }
        throw new Error("Can not find plugin" + cls);
    };
    HiPlot.defaultProps = {
        loadURI: null,
        comm: null,
        dark: false,
        asserts: false,
        plugins: defaultPlugins,
        experiment: null,
        dataProvider: null,
        onChange: null
    };
    return HiPlot;
}(React.Component));
export { HiPlot };
;
var DocAndCredits = /** @class */ (function (_super) {
    __extends(DocAndCredits, _super);
    function DocAndCredits() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DocAndCredits.prototype.render = function () {
        return (React.createElement("div", { className: "container hide-when-loaded" },
            React.createElement("div", { className: "row" },
                React.createElement("div", { className: "col-md-3" }),
                React.createElement("div", { className: "col-md-6" },
                    React.createElement("img", { src: this.props.dark ? LogoSVGW : LogoSVG })),
                React.createElement("div", { className: "col-md-3" }),
                React.createElement("div", { className: "col-md-6" },
                    React.createElement("h3", null, "Controls"),
                    React.createElement("p", null,
                        React.createElement("strong", null, "Brush"),
                        ": Drag vertically along an axis.",
                        React.createElement("br", null),
                        React.createElement("strong", null, "Remove Brush"),
                        ": Tap the axis background.",
                        React.createElement("br", null),
                        React.createElement("strong", null, "Reorder Axes"),
                        ": Drag a label horizontally.",
                        React.createElement("br", null),
                        React.createElement("strong", null, "Invert Axis"),
                        ": Tap an axis label.",
                        React.createElement("br", null),
                        React.createElement("strong", null, "Remove Axis"),
                        ": Drag axis label to the left edge.",
                        React.createElement("br", null))),
                React.createElement("div", { className: "cold-md-6" },
                    React.createElement("h3", null, "Credits & License"),
                    React.createElement("p", null,
                        "Adapted from examples by",
                        React.createElement("br", null),
                        React.createElement("a", { href: "http://bl.ocks.org/syntagmatic/3150059" }, "Kai"),
                        ", ",
                        React.createElement("a", { href: "http://bl.ocks.org/1341021" }, "Mike Bostock"),
                        " and ",
                        React.createElement("a", { href: "http://bl.ocks.org/1341281" }, "Jason Davies"),
                        React.createElement("br", null)),
                    React.createElement("p", null,
                        "Released under the ",
                        React.createElement("strong", null, "MIT License"),
                        ".")))));
    };
    return DocAndCredits;
}(React.Component));
;
