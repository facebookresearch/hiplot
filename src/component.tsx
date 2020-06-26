/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import * as _ from 'underscore';
import React from "react";
import './style/global';

import { Datapoint, ParamType, HiPlotExperiment, HiPlotLoadStatus, PSTATE_COLOR_BY, PSTATE_PARAMS, DatapointLookup, IDatasets, PSTATE_FILTERS } from "./types";
import { RowsDisplayTable } from "./rowsdisplaytable";
import { infertypes, colorScheme, ParamDefMap } from "./infertypes";
import { PersistentState, PersistentStateInMemory } from "./lib/savedstate";
import { ParallelPlot } from "./parallel/parallel";
import { PlotXY } from "./plotxy";
import { SelectedCountProgressBar, HiPlotDataControlProps } from "./controls";
import { ErrorDisplay, HeaderBar } from "./header";
import { HiPlotPluginData, DataProviderClass } from "./plugin";
import { StaticDataProvider } from "./dataproviders/static";

//@ts-ignore
import LogoSVG from "../hiplot/static/logo.svg";
//@ts-ignore
import LogoSVGW from "../hiplot/static/logo-w.svg";
//@ts-ignore
import style from "./hiplot.scss";
import { ContextMenu } from "./contextmenu";
import { HiPlotDistributionPlugin } from "./distribution/plugin";
import { Filter, FilterType, apply_filters, apply_filter } from "./filters";

// Exported from HiPlot
export { PlotXY } from "./plotxy";
export { ParallelPlot } from "./parallel/parallel";
export { RowsDisplayTable } from "./rowsdisplaytable";
export { HiPlotPluginData } from "./plugin";
export { Datapoint, HiPlotExperiment, IDatasets, HiPlotLoadStatus } from "./types";


type PluginComponent<P> = React.Component<P, any>;
type PluginComponentClass<P> = React.ComponentClass<P>;
type PluginClass = React.ClassType<HiPlotPluginData, PluginComponent<HiPlotPluginData>, PluginComponentClass<HiPlotPluginData>>;
interface PluginsMap {[k: string]: PluginClass; };

type LoadURIPromiseResult = {experiment: HiPlotExperiment} | {error: string};
export type LoadURIPromise = Promise<LoadURIPromiseResult>;

// Makes a Promise cancelable
interface CancelablePromise {
    promise: LoadURIPromise;
    cancel: () => void;
}
const makeCancelable = (promise: LoadURIPromise): CancelablePromise => {
    let hasCanceled_ = false;

    const wrappedPromise = new Promise((resolve: (r: LoadURIPromiseResult) => void, reject) => {
        promise.then(
            val => hasCanceled_ ? reject({isCanceled: true}) : resolve(val),
            error => hasCanceled_ ? reject({isCanceled: true}) : reject(error)
        );
    });

    return {
        promise: wrappedPromise,
        cancel() {
            hasCanceled_ = true;
        },
    };
};

// BEGIN_HIPLOT_PROPS
export interface HiPlotProps {
    // Experiment to be displayed. Can be created with `hip.Experiment.from_iterable`
    experiment: HiPlotExperiment | null;
    // Display plugins (by default parallel plot, plotxy, distribution and table)
    plugins: PluginsMap;
    // An object where we can persist changes
    // If not provided, will create a `PersistentStateInMemory` object
    persistentState?: PersistentState;
    // Callbacks when selection changes, filtering, or brush extents change
    onChange: {[k: string]: (type: string, data: any) => void};
    // Enable dark-mode
    dark: boolean;
    // Adds extra assertions (disabled by default)
    asserts: boolean;
    /* A class that can be used to dynamically fetch experiments
    Examples:
    - WebserverDataProvider: textarea to input URI, fetches experiments from server
    - UploadDataProvider: upload CSV files in your browser
    */
    dataProvider: DataProviderClass;
};
// END_HIPLOT_PROPS


interface HiPlotState extends IDatasets {
    experiment: HiPlotExperiment | null;
    loadStatus: HiPlotLoadStatus;
    loadPromise: CancelablePromise | null;
    error: string;
    params_def: ParamDefMap;
    params_def_unfiltered: ParamDefMap;
    dp_lookup: DatapointLookup;
    colorby: string;
    colormap: string;

    rows_filtered_filters: Array<Filter>; // `rows_all` -> `rows_filtered`
    rows_selected_filter: Filter; // `rows_filtered` -> `rows_selected`

    // Data that persists upon page reload, sharing link etc...
    persistentState: PersistentState;
    dark: boolean;
    dataProvider: DataProviderClass;
}

function detectIsDarkTheme(): boolean {
    // Hack: detect dark/light theme in Jupyter Lab
    const jupyterLabAttrLightTheme = "data-jp-theme-light";
    if (document.body.hasAttribute(jupyterLabAttrLightTheme)) {
        return document.body.getAttribute(jupyterLabAttrLightTheme) == "false";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export enum DefaultPlugins {
    // Names correspond to values of (python) hip.Displays
    PARALLEL_PLOT = "PARALLEL_PLOT",
    XY = "XY",
    DISTRIBUTION = "DISTRIBUTION",
    TABLE = "TABLE"
}

export const defaultPlugins: PluginsMap = {
    // @ts-ignore
    [DefaultPlugins.PARALLEL_PLOT]: ParallelPlot,
    // @ts-ignore
    [DefaultPlugins.XY]: PlotXY,
    // @ts-ignore
    [DefaultPlugins.DISTRIBUTION]: HiPlotDistributionPlugin,
    // @ts-ignore
    [DefaultPlugins.TABLE]: RowsDisplayTable,
};

export function createDefaultPlugins(): PluginsMap {
    return Object.assign({}, defaultPlugins);
};

export class HiPlot extends React.Component<HiPlotProps, HiPlotState> {
    // React refs
    contextMenuRef = React.createRef<ContextMenu>();

    plugins_window_state: {[plugin: string]: any} = {};

    plugins_ref: Array<React.RefObject<PluginClass>> = []; // For debugging/tests

    constructor(props: HiPlotProps) {
        super(props);
        this.state = {
            experiment: props.experiment,
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
            dark: this.props.dark === null ? detectIsDarkTheme() : this.props.dark,
            persistentState: props.persistentState !== undefined && props.persistentState !== null ? props.persistentState : new PersistentStateInMemory("", {}),
            dataProvider: this.props.dataProvider ? this.props.dataProvider : StaticDataProvider
        };
        Object.keys(props.plugins).forEach((name, index) => {
            this.plugins_window_state[name] = {};
            this.plugins_ref[index] = React.createRef<PluginClass>();
        });
    }
    static defaultProps = {
        loadURI: null,
        comm: null,
        dark: false,
        asserts: false,
        plugins: defaultPlugins,
        experiment: null,
        dataProvider: null,
        onChange: null,
    };
    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return {
            experiment: null,
            loadStatus: HiPlotLoadStatus.Error,
            error: error.toString(),
        };
    }
    makeDatasets(experiment: HiPlotExperiment | null, dp_lookup: DatapointLookup, initial_filters: Array<Filter>): IDatasets {
        if (experiment) {
            const rows_all_unfiltered = experiment.datapoints.map(function(t) {
                var obj_with_uid = $.extend({
                    "uid": t.uid,
                    "from_uid": t.from_uid,
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
            } catch (err) {
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
    }
    sendMessage(type: string, get_data: () => any): void {
        if (this.props.onChange !== null && this.props.onChange[type]) {
            const data = get_data();
            this.props.onChange[type](type, data);
        }
    }
    callSelectedUidsHooks = _.debounce(function(this: HiPlot): void {
        this.sendMessage("selected_uids", function() { return this.state.rows_selected.map(row => '' + row['uid'])}.bind(this));
    }.bind(this), 200);
    callFilteredUidsHooks = _.debounce(function(this: HiPlot): void {
        this.sendMessage("filtered_uids", function() { return this.state.rows_filtered.map(row => '' + row['uid'])}.bind(this));
    }.bind(this), 200);
    _loadExperiment(experiment: HiPlotExperiment) {
        // Generate dataset for Parallel Plot
        var dp_lookup = {};
        var initFilters = this.state.persistentState.get(PSTATE_FILTERS, []);
        const datasets = this.makeDatasets(experiment, dp_lookup, initFilters);
        if (datasets.rows_all_unfiltered == datasets.rows_filtered) {
            initFilters = [];
        }
        const params_def = infertypes(this.state.persistentState.children(PSTATE_PARAMS), datasets.rows_filtered, experiment.parameters_definition);
        const params_def_unfiltered = infertypes(this.state.persistentState.children(PSTATE_PARAMS), datasets.rows_all_unfiltered, experiment.parameters_definition);

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
            };
            var possibles = Object.keys(params_def).sort((a, b) => select_as_coloring_score(b) - select_as_coloring_score(a));
            return possibles[0];
        }
        var colorby = this.state.persistentState.get(PSTATE_COLOR_BY, get_default_color());
        if (params_def[colorby] === undefined) {
            colorby = get_default_color();
        }
        this.setState(function(state, props) { return {
            experiment: experiment,
            colormap: experiment.colormap,
            loadStatus: HiPlotLoadStatus.Loaded,
            dp_lookup: dp_lookup,
            colorby: colorby,
            params_def: params_def,
            params_def_unfiltered: params_def_unfiltered,
            rows_filtered_filters: initFilters,
            ...datasets,
        }; });
    }
    getColorForRow(trial: Datapoint, alpha: number): string {
        return colorScheme(this.state.params_def[this.state.colorby], trial[this.state.colorby], alpha, this.state.colormap);
    };
    loadWithPromise(prom: LoadURIPromise) {
        var me = this;
        me.setState({
            loadStatus: HiPlotLoadStatus.Loading,
            loadPromise: makeCancelable(prom)
        });
    }
    componentWillUnmount() {
        if (this.contextMenuRef.current) {
            this.contextMenuRef.current.removeCallbacks(this);
        }
        if (this.state.loadPromise) {
            this.state.loadPromise.cancel();
        }
        this.callSelectedUidsHooks.cancel();
        this.callFilteredUidsHooks.cancel();
    }
    componentDidMount() {
        // Setup contextmenu when we right-click a parameter
        this.contextMenuRef.current.addCallback(this.columnContextMenu.bind(this), this);

        // Load experiment provided in constructor if any
        if (this.props.experiment) {
            this.loadWithPromise(new Promise(function(resolve, reject) {
                resolve({experiment: this.props.experiment});
            }.bind(this)));
        }
    }
    componentDidUpdate(prevProps: HiPlotProps, prevState: HiPlotState): void {
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
                this.loadWithPromise(new Promise(function(resolve, reject) {
                    resolve({experiment: this.props.experiment});
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
            const prom = this.state.loadPromise.promise;
            const me = this;
            prom.then(function(data: {error?: string, experiment?: HiPlotExperiment}) {
                if (data.error !== undefined) {
                    console.log("Experiment loading failed", data);
                    me.setState({
                        loadStatus: HiPlotLoadStatus.Error,
                        experiment: null,
                        error: data.error,
                    });
                    return;
                }
                me._loadExperiment(data.experiment);
            })
            .catch(
                error => {
                    if (error.isCanceled) {
                        return;
                    }
                    console.log('Error', error);
                    me.setState({loadStatus: HiPlotLoadStatus.Error, experiment: null, error: 'HTTP error, check server logs / javascript console'});
                    throw error;
                }
            );
        }
    }
    columnContextMenu(column: string, cm: HTMLDivElement) {
        const VAR_TYPE_TO_NAME = {
            [ParamType.CATEGORICAL]: 'Categorical',
            [ParamType.NUMERIC]: 'Number',
            [ParamType.NUMERICLOG]: 'Number (log-scale)',
            [ParamType.NUMERICPERCENTILE]: 'Number (percentile-scale)',
            [ParamType.TIMESTAMP]: 'Timestamp',
        };

        var contextmenu = $(cm);
        contextmenu.append($('<h6 class="dropdown-header">Data scaling</h6>'));
        this.state.params_def[column].type_options.forEach(function(this: HiPlot, possible_type) {
          var option = $('<a class="dropdown-item" href="#">').text(VAR_TYPE_TO_NAME[possible_type]);
          if (possible_type == this.state.params_def[column].type) {
            option.addClass('disabled').css('pointer-events', 'none');
          }
          option.click(function(this: HiPlot, event) {
            contextmenu.css('display', 'none');
            this.setState(function(state: Readonly<HiPlotState>, props) { return {
                    params_def: {
                        ...state.params_def,
                        [column]: {
                            ...state.params_def[column],
                            type: possible_type
                        }
                    }
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
        link_colorize.click(function(this: HiPlot, event) {
            this.setState({
                colorby: column,
            });
            event.preventDefault();
        }.bind(this));
        if (this.state.colorby == column) {
            link_colorize.addClass('disabled').css('pointer-events', 'none');
        }
        contextmenu.append(link_colorize);
    }
    createNewParamsDef(rows_filtered: Array<Datapoint>): ParamDefMap {
        var new_pd = Object.assign({}, this.state.params_def);
        Object.assign(new_pd, infertypes(this.state.persistentState.children(PSTATE_PARAMS), rows_filtered, this.state.params_def))
        return new_pd;
    }
    restoreAllRows(): void {
        /**
         * When we hit `Restore` button
         */
        this.setState(function(this: HiPlot, state: Readonly<HiPlotState>, props): Partial<HiPlotState> {
            const all_rows = state.rows_all_unfiltered;
            const new_pd = this.createNewParamsDef(all_rows);
            return {
                rows_selected: all_rows,
                rows_selected_filter: null,
                rows_filtered: all_rows,
                rows_filtered_filters: [],
                params_def: new_pd,
            };
        }.bind(this));
    };
    filterRows(keep: boolean): void {
        /**
         * When we hit Keep (keep=true), or Exclude (keep=false) buttons
         */
        this.setState(function(this: HiPlot, state: Readonly<HiPlotState>, props): Partial<HiPlotState> {
            const new_filtered = keep ? state.rows_selected : _.difference(state.rows_filtered, state.rows_selected);
            var filter: Filter = state.rows_selected_filter;
            if (!keep) {
                filter = {
                    type: FilterType.Not,
                    data: filter,
                };
            }
            const new_pd = this.createNewParamsDef(new_filtered);
            return {
                rows_filtered: new_filtered,
                params_def: new_pd,
                rows_selected_filter: null,
                rows_filtered_filters: state.rows_filtered_filters.concat([filter]),
            };
        }.bind(this));
    };
    setSelected(rows: Array<Datapoint>, filter: Filter | null = null): void {
        if (filter && _.isEqual(filter, this.state.rows_selected_filter)) {
            return;
        }
        if (filter && this.props.asserts) {
            const new_rows = apply_filter(this.state.rows_filtered, filter);
            if (new_rows.length != rows.length || _.difference(new_rows, rows).length) {
                console.error("Warning! Filter ", filter, " does not match given rows", rows, " Computed rows with filter:", new_rows);
            }
        }
        this.setState({
            rows_selected: rows,
            rows_selected_filter: filter
        });
    }
    setHighlighted(rows: Array<Datapoint>): void {
        this.setState({rows_highlighted: rows});
    }
    renderRowText(row: Datapoint): string {
        return row.uid;
    };
    render() {
        const datasets: IDatasets = {
            rows_all_unfiltered: this.state.rows_all_unfiltered,
            rows_filtered: this.state.rows_filtered,
            rows_highlighted: this.state.rows_highlighted,
            rows_selected: this.state.rows_selected
        };
        const controlProps: HiPlotDataControlProps = {
            restoreAllRows: this.restoreAllRows.bind(this),
            filterRows: this.filterRows.bind(this),
            ...datasets
        };
        const createPluginProps = function(this: HiPlot, idx: number, name: string): React.ClassAttributes<React.ComponentClass<HiPlotPluginData>> & HiPlotPluginData {
            return {
                ref: this.plugins_ref[idx],
                ...(this.state.experiment.display_data && this.state.experiment.display_data[name] ? this.state.experiment.display_data[name] : {}),
                ...datasets,
                rows_selected_filter: this.state.rows_selected_filter,
                name: name,
                persistentState: this.state.persistentState.children(name),
                window_state: this.plugins_window_state[name],
                sendMessage: this.sendMessage.bind(this),
                get_color_for_row: this.getColorForRow.bind(this),
                experiment: this.state.experiment,
                params_def: this.state.params_def,
                params_def_unfiltered: this.state.params_def_unfiltered,
                dp_lookup: this.state.dp_lookup,
                colorby: this.state.colorby,
                render_row_text: this.renderRowText.bind(this),
                context_menu_ref: this.contextMenuRef,
                setSelected: this.setSelected.bind(this),
                setHighlighted: this.setHighlighted.bind(this),
                asserts: this.props.asserts,
            };
        }.bind(this);
        return (
        <div className={`hip_thm--${this.state.dark ? "dark" : "light"}`}>
            <div className={`${style.hiplot} ${this.state.dark ? style.dark : ""}`}>
            <SelectedCountProgressBar {...controlProps} />
            <HeaderBar
                onLoadExperiment={this.loadWithPromise.bind(this)}
                persistentState={this.state.persistentState}
                dataProvider={this.state.dataProvider}
                loadStatus={this.state.loadStatus}
                dark={this.state.dark}
                {...controlProps}
            />
            {this.state.loadStatus == HiPlotLoadStatus.Error &&
                <ErrorDisplay error={this.state.error} />
            }
            {this.state.loadStatus != HiPlotLoadStatus.Loaded &&
                <DocAndCredits dark={this.state.dark} />
            }
            <ContextMenu ref={this.contextMenuRef}/>
            {this.state.loadStatus == HiPlotLoadStatus.Loaded &&
            <div>
                {Object.entries(this.props.plugins).map((plugin, idx) => <React.Fragment key={idx}>{React.createElement(plugin[1], createPluginProps(idx, plugin[0]))}</React.Fragment>)}
            </div>
            }
            </div>
        </div>
        );
    }
    getPlugin<P extends HiPlotPluginData, T extends React.Component<P>>(cls: React.ClassType<P, T, React.ComponentClass<P>>): T {
        const entries = Object.entries(this.props.plugins);
        for (var i = 0; i < entries.length; ++i) {
            if (entries[i][1] == cls) {
                return this.plugins_ref[i].current as unknown as T;
            }
        }
       throw new Error("Can not find plugin" + cls);
    }
}

interface DocsCreditsProps {
    dark: boolean;
};

class DocAndCredits extends React.Component<DocsCreditsProps> {
    render() {
        return (
            <div className="container hide-when-loaded">
              <div className="row">
                <div className="col-md-3"></div>
                <div className="col-md-6">
                    <img src={this.props.dark ? LogoSVGW : LogoSVG} />
                </div>
                <div className="col-md-3"></div>
                <div className="col-md-6">
                    <h3>Controls</h3>
                    <p>
                      <strong>Brush</strong>: Drag vertically along an axis.<br/>
                      <strong>Remove Brush</strong>: Tap the axis background.<br/>
                      <strong>Reorder Axes</strong>: Drag a label horizontally.<br/>
                      <strong>Invert Axis</strong>: Tap an axis label.<br/>
                      <strong>Remove Axis</strong>: Drag axis label to the left edge.<br/>
                    </p>
                  </div>
                  <div className="cold-md-6">
                    <h3>Credits &amp; License</h3>
                      <p>
                      Adapted from examples by<br/>
                      <a href="http://bl.ocks.org/syntagmatic/3150059">Kai</a>, <a href="http://bl.ocks.org/1341021">Mike Bostock</a> and <a href="http://bl.ocks.org/1341281">Jason Davies</a><br/>
                      </p>
                      <p>
                        Released under the <strong>MIT License</strong>.
                      </p>
                  </div>
                </div>
            </div>
        );
    }
};
