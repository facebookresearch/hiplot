/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import $ from "jquery";
import * as _ from 'underscore';
import React from "react";
import ReactDOM from "react-dom";
//@ts-ignore
import JSON5 from "json5";
import './global';

import { Datapoint, ParamType, HiPlotExperiment, HiPlotLoadStatus, PSTATE_COLOR_BY, PSTATE_LOAD_URI, PSTATE_PARAMS, DatapointLookup, IDatasets } from "./types";
import { RowsDisplayTable } from "./rowsdisplaytable";
import { infertypes, colorScheme, ParamDefMap } from "./infertypes";
import { PersistentState, PersistentStateInMemory, PersistentStateInURL } from "./lib/savedstate";
import { ParallelPlot } from "./parallel/parallel";
import { PlotXY } from "./plotxy";
import { SelectedCountProgressBar, HiPlotDataControlProps } from "./controls";
import { ErrorDisplay, HeaderBar } from "./elements";
import { HiPlotPluginData, HiPlotPluginDataWithoutDatasets } from "./plugin";

//@ts-ignore
import LogoSVG from "../hiplot/static/logo.svg";
//@ts-ignore
import style from "./hiplot.css";
import { ContextMenu } from "./contextmenu";
import { HiPlotDistributionPlugin } from "./distribution/plugin";

// Exported from HiPlot
export { PlotXY } from "./plotxy";
export { ParallelPlot } from "./parallel/parallel";
export { RowsDisplayTable } from "./rowsdisplaytable";
export { HiPlotPluginData } from "./plugin";
export { Datapoint, HiPlotExperiment, IDatasets, HiPlotLoadStatus } from "./types";


interface PluginInfo {
    name: string;
    render: (plugin_data: HiPlotPluginData) => JSX.Element;
};

export interface HiPlotProps {
    experiment: HiPlotExperiment | null;
    is_webserver: boolean;
    plugins: Array<PluginInfo>;
    persistent_state?: PersistentState;
    comm: any; // Communication object for Jupyter notebook
};

interface HiPlotState extends IDatasets {
    experiment: HiPlotExperiment | null;
    version: number;
    loadStatus: HiPlotLoadStatus;
    error: string;
    params_def: ParamDefMap;
    dp_lookup: DatapointLookup;
    colorby: string;
    colormap: string;
    // Data that persists upon page reload, sharing link etc...
    persistent_state: PersistentState;
}

export class HiPlot extends React.Component<HiPlotProps, HiPlotState> {
    // React refs
    contextMenuRef = React.createRef<ContextMenu>();

    comm_message_id: number = 0;

    plugins_window_state: {[plugin: string]: any} = {};
    onSelectedChange_debounced: () => void;

    constructor(props: HiPlotProps) {
        super(props);
        this.state = {
            experiment: props.experiment,
            colormap: null,
            version: 0,
            loadStatus: HiPlotLoadStatus.None,
            error: null,
            dp_lookup: {},
            rows_all_unfiltered: [],
            rows_filtered: [],
            rows_selected: [],
            rows_highlighted: [],
            params_def: {},
            colorby: null,
            persistent_state: props.persistent_state !== undefined && props.persistent_state !== null ? props.persistent_state : new PersistentStateInMemory("", {}),
        };
        props.plugins.forEach((info) => { this.plugins_window_state[info.name] = {}; });
        this.onSelectedChange_debounced = _.debounce(this.onSelectedChange.bind(this), 200);
    }
    static defaultProps = {
        is_webserver: false,
        comm: null,
    };
    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return {
            experiment: null,
            loadStatus: HiPlotLoadStatus.Error,
            error: error.toString(),
        };
    }
    makeDatasets(experiment: HiPlotExperiment | null, dp_lookup: DatapointLookup): IDatasets {
        if (experiment) {
            const rows_all_unfiltered = experiment.datapoints.map(function(t) {
                var obj_with_uid = $.extend({
                    "uid": t.uid,
                    "from_uid": t.from_uid,
                }, t.values);
                dp_lookup[t.uid] = obj_with_uid;
                return obj_with_uid;
            });
            return {
                rows_all_unfiltered: rows_all_unfiltered,
                rows_filtered: rows_all_unfiltered,
                rows_selected: rows_all_unfiltered,
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
    sendMessage(type: string, data: any): void {
        if (this.props.comm !== null) {
            this.props.comm.send({
                'type': type,
                'message_id': this.comm_message_id,
                'data': data,
            });
            this.comm_message_id += 1;
        }
    }
    onSelectedChange(): void {
        this.sendMessage("selection", {
            'selected': this.state.rows_selected.map(row => '' + row['uid'])
        })
    }
    _loadExperiment(experiment: HiPlotExperiment) {
        //console.log('Load xp', experiment);
        // Generate dataset for Parallel Plot
        var dp_lookup = {};
        const datasets = this.makeDatasets(experiment, dp_lookup);
        const params_def = infertypes(this.state.persistent_state.children(PSTATE_PARAMS), datasets.rows_filtered, experiment.parameters_definition);

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
        var colorby = this.state.persistent_state.get(PSTATE_COLOR_BY, get_default_color());
        if (params_def[colorby] === undefined) {
            colorby = get_default_color();
        }
        this.setState(function(state, props) { return {
            experiment: experiment,
            colormap: experiment.colormap,
            version: state.version + 1,
            loadStatus: HiPlotLoadStatus.Loaded,
            dp_lookup: dp_lookup,
            colorby: colorby,
            params_def: params_def,
            ...datasets,
        }; });
    }
    getColorForRow(trial: Datapoint, alpha: number): string {
        return colorScheme(this.state.params_def[this.state.colorby], trial[this.state.colorby], alpha, this.state.colormap);
    };
    loadWithPromise(prom: Promise<any>) {
        var me = this;
        me.setState({loadStatus: HiPlotLoadStatus.Loading});
        prom.then(function(data) {
            if (data.experiment === undefined) {
                console.log("Experiment loading failed", data);
                me.setState({
                    loadStatus: HiPlotLoadStatus.Error,
                    experiment: null,
                    error: data.error !== undefined ? data.error : 'Unable to load experiment',
                });
                return;
            }
            me._loadExperiment(data.experiment);
        })
        .catch(
            error => {
                console.log('Error', error);
                me.setState({loadStatus: HiPlotLoadStatus.Error, experiment: null, error: 'HTTP error, check server logs / javascript console'});
                throw error;
            }
        );
    }
    componentWillUnmount() {
        if (this.contextMenuRef.current) {
            this.contextMenuRef.current.removeCallbacks(this);
        }
    }
    componentDidMount() {
        // Setup contextmenu when we right-click a parameter
        this.contextMenuRef.current.addCallback(this.columnContextMenu.bind(this), this);

        // Load experiment provided in constructor if any
        if (this.props.experiment !== null) {
            this.loadWithPromise(new Promise(function(resolve, reject) {
                resolve({experiment: this.props.experiment});
            }.bind(this)));
        }
        else {
            var load_uri = this.state.persistent_state.get(PSTATE_LOAD_URI);
            if (load_uri !== undefined) {
                this.loadURI(load_uri);
            }
        }
    }
    componentDidUpdate(prevProps: HiPlotProps, prevState: HiPlotState): void {
        if (prevState.rows_selected != this.state.rows_selected) {
            this.onSelectedChange_debounced();
        }
        if (prevState.colorby != this.state.colorby && this.state.colorby) {
            this.state.persistent_state.set(PSTATE_COLOR_BY, this.state.colorby);
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
            this.state.persistent_state.children(PSTATE_PARAMS).children(column).set('type', possible_type);
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
    onRefreshDataBtn() {
        this.loadURI(this.state.persistent_state.get(PSTATE_LOAD_URI));
    }
    loadURI(uri: string) {
        this.loadWithPromise(new Promise(function(resolve, reject) {
            $.get( "/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function(data) {
                //console.log("Data loading failed", data);
                if (data.readyState == 4 && data.status == 200) {
                    console.log('Unable to parse JSON with JS default decoder (Maybe it contains NaNs?). Trying custom decoder');
                    var decoded = JSON5.parse(data.responseText);
                    resolve(decoded);
                }
                else if (data.status == 0) {
                    resolve({
                        'experiment': undefined,
                        'error': 'Network error'
                    });
                    return;
                }
                else {
                    reject(data);
                }
            });
        }));
    }
    onRunsTextareaSubmitted(uri: string) {
        this.state.persistent_state.set(PSTATE_LOAD_URI, uri);
        this.loadURI(uri);
    }
    createNewParamsDef(rows_filtered: Array<Datapoint>): ParamDefMap {
        var new_pd = Object.assign({}, this.state.params_def);
        Object.assign(new_pd, infertypes(this.state.persistent_state.children(PSTATE_PARAMS), rows_filtered, this.state.params_def))
        return new_pd;
    }
    restoreAllRows(): void {
        /**
         * When we hit `Restore` button
         */
        this.setState(function(this: HiPlot, state: Readonly<HiPlotState>, props): Partial<HiPlotState> {
            const new_filtered = state.rows_all_unfiltered;
            const new_pd = this.createNewParamsDef(new_filtered);
            return {
                rows_filtered: new_filtered,
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
            const new_pd = this.createNewParamsDef(new_filtered);
            return {
                rows_filtered: new_filtered,
                params_def: new_pd,
            };
        }.bind(this));
    };
    setSelected(rows: Array<Datapoint>): void {
        this.setState({rows_selected: rows});
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
        return (
        <div className="scoped_css_bootstrap">
            <div className={style.hiplot}>
            <SelectedCountProgressBar {...controlProps} />
            <HeaderBar
                onRequestLoadExperiment={this.props.is_webserver ? this.onRunsTextareaSubmitted.bind(this) : null}
                onRequestRefreshExperiment={this.props.is_webserver ? this.onRefreshDataBtn.bind(this) : null}
                loadStatus={this.state.loadStatus}
                initialLoadUri={this.state.persistent_state.get(PSTATE_LOAD_URI, '')}
                {...controlProps}
            />
            {this.state.loadStatus == HiPlotLoadStatus.Error &&
                <ErrorDisplay error={this.state.error} />
            }
            {this.state.loadStatus != HiPlotLoadStatus.Loaded &&
                <DocAndCredits />
            }
            <ContextMenu ref={this.contextMenuRef}/>
            {this.state.loadStatus == HiPlotLoadStatus.Loaded &&
            <div>
                {this.props.plugins.map((plugin_info, idx) => <React.Fragment key={idx}>{plugin_info.render({
                    ...(this.state.experiment._displays[plugin_info.name] ? this.state.experiment._displays[plugin_info.name] : {}),
                    ...datasets,
                    name: plugin_info.name,
                    persistent_state: this.state.persistent_state.children(plugin_info.name),
                    window_state: this.plugins_window_state[plugin_info.name],
                    sendMessage: this.sendMessage.bind(this),
                    get_color_for_row: this.getColorForRow.bind(this),
                    experiment: this.state.experiment,
                    params_def: this.state.params_def,
                    dp_lookup: this.state.dp_lookup,
                    colorby: this.state.colorby,
                    render_row_text: this.renderRowText.bind(this),
                    context_menu_ref: this.contextMenuRef,
                    setSelected: this.setSelected.bind(this),
                    setHighlighted: this.setHighlighted.bind(this),
                })}</React.Fragment>)}
            </div>
            }
            </div>
        </div>
        );
    }
}

class DocAndCredits extends React.Component {
    render() {
        return (
            <div className="container hide-when-loaded">
              <div className="row">
                <div className="col-md-3"></div>
                <div className="col-md-6">
                    <img src={LogoSVG} />
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

export const defaultPlugins = [
    // Names correspond to values of hip.Displays
    {name: "PARALLEL_PLOT", render: (plugin_data: HiPlotPluginData) => <ParallelPlot {...plugin_data} />},
    {name: "XY", render: (plugin_data: HiPlotPluginData) => <PlotXY {...plugin_data} />},
    {name: "DISTRIBUTION", render: (plugin_data: HiPlotPluginData) => <HiPlotDistributionPlugin {...plugin_data} />},
    {name: "TABLE", render: (plugin_data: HiPlotPluginData) => <RowsDisplayTable {...plugin_data} />},
];

export function hiplot_setup(element: HTMLElement, extra?: any) {
    var props: HiPlotProps = {
        experiment: null,
        is_webserver: true,
        persistent_state: new PersistentStateInURL("hip"),
        plugins: defaultPlugins,
        comm: null,
    };
    if (extra !== undefined) {
        Object.assign(props, extra);
    }
    if (extra.persistent_state_url_prefix !== undefined) {
        props.persistent_state = new PersistentStateInURL(extra.persistent_state_url_prefix);
    }
    return ReactDOM.render(<HiPlot {...props} />, element);
}

Object.assign(window, {
    'hiplot_setup': hiplot_setup,
});
