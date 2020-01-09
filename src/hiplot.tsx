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
import './global';

import { WatchedProperty, Datapoint, ParamType, HiPlotExperiment, AllDatasets } from "./types";
import { RowsDisplayTable } from "./rowsdisplaytable";
import { infertypes, ParamDefMap } from "./infertypes";
import { PageState } from "./lib/savedstate";
import { make_resizable } from "./lib/resizable";
import { ParallelPlot } from "./parallel";
import { DatapointsGraph, DatapointsGraphConfig } from "./datapointsgraph";
import { KeepDataBtn, ExcludeDataBtn, RestoreDataBtn, ExportDataCSVBtn, ThemeToggle, SelectedCountProgressBar } from "./controls";
import { RunsSelectionTextArea, ErrorDisplay } from "./elements";

//@ts-ignore
import IconSVG from "../hiplot/static/icon.svg";
//@ts-ignore
import LogoSVG from "../hiplot/static/logo.svg";
//@ts-ignore
import style from "./hiplot.css";

function customDecodeJSON(text: string): any {
    return eval('(' + text + ')');
}

const URL_LOAD_URI = 'load_uri';
const URL_COLOR_BY = 'color_by';
const URL_PARALLEL_PLOT_STATE = 'pp';


interface HiPlotComponentProps {
    experiment: HiPlotExperiment | null;
};

interface HiPlotComponentState {
    experiment: HiPlotExperiment | null;
    webserver: boolean;
    version: number;
    loading: boolean;
    error: string;
}


export class HiPlotComponent extends React.Component<HiPlotComponentProps, HiPlotComponentState> {
    // React refs
    domRoot: React.RefObject<HTMLDivElement> = React.createRef();
    controls: React.RefObject<HTMLDivElement> = React.createRef();
    parallelPlotRef: React.RefObject<HTMLDivElement> = React.createRef();
    datapointsGraphRef: React.RefObject<HTMLDivElement> = React.createRef();
    datatableRef: React.RefObject<HTMLTableElement> = React.createRef();

    rows = new AllDatasets();
    url_state = PageState.create_state('hip');
    parallelPlot: ParallelPlot = null;
    line_display: DatapointsGraph = null;
    params_definition: ParamDefMap = {};
    config = null;
    comm = null;
    table: RowsDisplayTable = null;

    jcontrols: JQuery;

    constructor(props: HiPlotComponentProps) {
        super(props);
        this.state = {
            experiment: props.experiment,
            webserver: props.experiment === null,
            version: 0,
            loading: false,
            error: null,
        };
        var selection_id = 0;
        var rows = this.rows;
        var me = this;
        rows['selected'].on_change(function(selection) {
            selection_id += 1;
            if (me.comm !== null) {
                me.comm.send({
                    'type': 'selection',
                    'selection_id': selection_id,
                    'selected': selection.map(row => '' + row['uid'])
                });
            }
        });
        rows['all'].on_change(function(new_data) {
            if (me.parallelPlot === null) {
                return;
            }
            me.params_definition = infertypes(me.url_state.children('params'), new_data, me.parallelPlot.state.params_def);
            me.parallelPlot.state.params_def = me.params_definition;
            me.line_display.params_def = me.params_definition;
        });
        rows['selected'].on_change(function(selection) {
            if (me.table !== null) {
                me.table.set_selected(selection);
            }
        });
    }
    clear_dom() {
        // Reset old plots if any
        if (this.parallelPlot) {
            this.parallelPlot.clear();
            this.parallelPlot = null;
        }
        if (this.line_display) {
            this.line_display.destroy();
            this.line_display = null;
        }
    }
    _loadExperiment(experiment: HiPlotExperiment) {
        console.log('Load xp', experiment);
        var me = this;
        var rows = this.rows;
        var jroot = $(me.domRoot.current);
        console.assert(this.state.experiment == experiment);
        console.assert(this.state.loading == false);
        jroot.find('.hiplot-loaded-change-class').each(function(_, n) {
            $(n).removeClass($(n).attr('data-hiplot-loaded-remove-class'));
            $(n).addClass($(n).attr('data-hiplot-loaded-add-class'));
        });

        this.clear_dom();
        var rows_dt = rows.replace_child('RowsDisplayTable');
        var rows_line = rows.replace_child('DatapointsGraphConfig');
        var rows_pp = rows.replace_child('ParallelPlot');

        // Generate dataset for Parallel Plot
        var dp_lookup = {};
        rows['experiment_all'].set(experiment.datapoints.map(function(t) {
            var csv_obj = $.extend({
                "uid": t.uid,
                "from_uid": t.from_uid,
            }, t.values);
            dp_lookup[t.uid] = csv_obj;
            return csv_obj;
        }));
        rows['all'].set(rows['experiment_all'].get());

        me.params_definition = infertypes(this.url_state.children('params'), rows['all'].get(), experiment.parameters_definition);

        this.config = {
            'rows': rows_pp,
            'params_def': me.params_definition,
            'root': this.parallelPlotRef.current,
            'controls': this.controls.current,
            'render_row_text': function(row: Datapoint) {
                return row.uid;
            },
            'url_state': this.url_state.children(URL_PARALLEL_PLOT_STATE),
            'colorby': new WatchedProperty('colorby'),
            'line_display_x_axis': new WatchedProperty('line_display_x_axis'),
            'line_display_y_axis': new WatchedProperty('line_display_y_axis'),
        };

        // Color handling
        function get_default_color() {
            function select_as_coloring_score(r) {
                var pd = me.params_definition[r];
                var score = 0;
                if (pd.colors !== null) {
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
            var possibles = Object.keys(me.params_definition).sort((a, b) => select_as_coloring_score(b) - select_as_coloring_score(a));
            return possibles[0];
        }
        this.config.colorby.set(this.url_state.get(URL_COLOR_BY, get_default_color()));
        if (me.params_definition[this.config.colorby.get()] === undefined) {
            this.config.colorby.set(get_default_color());
        }
        this.config.colorby.on_change(function(f) {
            me.url_state.set(URL_COLOR_BY, f);
        });
        this.config.get_color_for_row = function(trial_or_uid: Datapoint | string, alpha: number) {
            if (typeof trial_or_uid != 'object') {
                trial_or_uid = dp_lookup[trial_or_uid];
            }
            return me.params_definition[me.config.colorby.get()].colorScheme(trial_or_uid[me.config.colorby.get()], alpha);
        };

        // Table visualization below
        if (this.table !== null) {
            this.table.destroy();
        }
        this.table = new RowsDisplayTable();
        this.table.setup({
            'params_def': me.params_definition,
            'rows': rows_dt,
            'get_color_for_uid': this.config.get_color_for_row,
            'dp_lookup': dp_lookup,
            'root': this.datatableRef.current,
        });

        // Line display
        function init_line_display_axis(axis, default_value) {
            axis.set(me.url_state.get(axis.name, default_value));
            if (me.params_definition[axis.get()] === undefined) {
                axis.set(null);
            }
            axis.on_change(function(v) {
                me.url_state.set(axis.name, v);
            });
        }
        init_line_display_axis(this.config.line_display_x_axis, experiment.line_display.axis_x);
        init_line_display_axis(this.config.line_display_y_axis, experiment.line_display.axis_y);

        var line_display_config: DatapointsGraphConfig = {
            'rows': rows_line,
            'root': this.datapointsGraphRef.current,
            'dp_lookup': dp_lookup,
            'params_def': me.params_definition,
            'get_color_for_row': this.config.get_color_for_row,
            'render_row_text': this.config.render_row_text,
            'axis_x': this.config.line_display_x_axis,
            'axis_y': this.config.line_display_y_axis,
            'graph_display_config': experiment.line_display,
        }
        this.line_display = new DatapointsGraph(line_display_config);

        this.parallelPlot = new ParallelPlot(this.config);
    }
    loadWithPromise(prom: Promise<any>) {
        var me = this;
        var jroot = $(me.domRoot.current);
        jroot.find('.display-when-loaded').addClass('collapse');
        me.setState({loading: true, error: null});
        prom.then(function(data) {
            jroot.find('.display-when-loaded').removeClass('collapse');
            if (data.experiment === undefined) {
                me.setState({
                    loading: false,
                    experiment: null,
                    error: data.error !== undefined ? data.error : 'Unable to load experiment',
                });
                return;
            }
            me.setState(function(state, props) { return {
                experiment: data.experiment,
                version: state.version + 1,
                loading: false,
                error: null,
            }; });
        })
        .catch(
            error => {
                console.log('Error', error);
                me.setState({loading: false, experiment: null, error: 'HTTP error, check server logs / javascript console'});
                throw error;
            }
        );
    }
    setup_comm(comm_) {
        this.comm = comm_;
        console.log("Setting up communication channel", comm_);
    }
    setup_notebook() {
        $(this.domRoot.current).find(".sample-table-container").removeClass(style["min-height-100"]);
    }


    componentDidMount() {
        console.log('Component did mount', this);
        make_resizable(this.parallelPlotRef.current);
        this.componentDidUpdate();

        // Some DOM callbacks
        var me = this;
        var jcontrols = me.jcontrols = $(this.controls.current);
        jcontrols.find('.refresh-data').click(function() {
            if (me.parallelPlot) {
                me.parallelPlot.clear();
            }
            me.loadURI(me.url_state.get(URL_LOAD_URI));
        });
        var load_uri = me.url_state.get(URL_LOAD_URI);
        if (load_uri !== undefined) {
            me.loadURI(load_uri);
        }
    }
    componentDidUpdate() {
        if (this.state.experiment && !this.state.loading) {
            this._loadExperiment(this.state.experiment);
        }
        var jroot = $(this.domRoot.current);
        if (this.state.loading || this.state.experiment === null) {
            jroot.find('.display-when-loaded').addClass('collapse');
        } else {
            jroot.find('.display-when-loaded').removeClass('collapse');
        }
    }
    loadURI(uri: string) {
        this.loadWithPromise(new Promise(function(resolve, reject) {
            $.get( "/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function(data) {
                console.log("Data loading failed", data);
                if (data.readyState == 4 && data.status == 200) {
                    console.log('Unable to parse JSON :( Trying custom decoder...');
                    var decoded = customDecodeJSON(data.responseText);
                    resolve(decoded);
                    return;
                }
                reject(data);
            });
        }));
    }
    onRunsTextareaSubmitted(uri: string) {
        this.url_state.clear();
        this.url_state.set(URL_LOAD_URI, uri);
        this.loadURI(uri);
    }

    render() {
        function cn(className: string): string {
            return `${className} ${style[className]}`;
        }
        return (
        <div className="scoped_css_bootstrap">
            <div ref={this.domRoot} className={style.hiplot}>
            <SelectedCountProgressBar rows={this.rows} />
            <HeaderBar>
            {this.state.webserver &&
                <RunsSelectionTextArea
                    initialValue={this.url_state.get(URL_LOAD_URI, '')}
                    enabled={!this.state.loading}
                    minimizeWhenOutOfFocus={this.state.experiment != null && !this.state.loading}
                    onSubmit={this.onRunsTextareaSubmitted.bind(this)} />
            }
        
            <div ref={this.controls} className="col-md-8 display-when-loaded collapse">
                <RestoreDataBtn rows={this.rows} />
                <KeepDataBtn rows={this.rows} />
                <ExcludeDataBtn rows={this.rows} />
                {this.state.webserver &&
                    <button title="Refresh + restore data removed" className="refresh-data">Refresh</button>
                }
                <ExportDataCSVBtn rows={this.rows} />
                <div className="controls">
                    <strong className="rendered-count"></strong>/<strong className="selected-count"></strong>
                    {false && <div>Lines at <strong className="opacity"></strong> opacity.</div>}
                    <span className={style.settings}>
                        <button className="hide-ticks">Hide Ticks</button>
                        <button className="show-ticks" disabled={true}>Show Ticks</button>
                        <ThemeToggle root={this.domRoot} />
                    </span>
                </div>
                <div style={{clear:'both'}}></div>
            </div>
            </HeaderBar>
            {this.state.error !== null &&
                <ErrorDisplay error={this.state.error} />
            }
            {this.state.experiment === null &&
                <DocAndCredits />
            }
            <div className="display-when-loaded collapse">
            <div ref={this.parallelPlotRef} className={cn("parallel-plot-chart")} style={{height: '600px'}}>
                <React.Fragment key={'pp_' + this.state.version}>
                    <canvas className={cn("background-canvas")}></canvas>
                    <canvas className={cn("foreground-canvas")}></canvas>
                    <canvas className={cn("highlight-canvas")}></canvas>
                    <svg></svg>
                    <div className="dropdown-menu dropdown-menu-sm context-menu"></div>
                </React.Fragment>
            </div>
            <div key={'line_' + this.state.version} ref={this.datapointsGraphRef} className="checkpoints-graph display-when-dp-enabled">
                <canvas className={cn("checkpoints-graph-lines")} style={{position: 'absolute'}}></canvas>
                <canvas className={cn("checkpoints-graph-highlights")} style={{position: 'absolute'}}></canvas>
                <svg className={cn("checkpoints-graph-svg")} style={{position: 'absolute'}}></svg>
            </div>
        
            <div className={`${style.wrap} row`}>
                <div className={`col-md-12 ${style["min-height-100"]} sample-table-container`}>
                <table ref={this.datatableRef} className="sample-rows-table display table table-striped table-bordered dataTable">
                </table>
                </div>
            </div>
            </div>
            </div>
        </div>
        );
    }
}

class HeaderBar extends React.Component {
    render() {
        return (<div className={"form-row " + style.header}>
          <div className="col-md-1">
            <img style={{height: '55px'}} src={IconSVG} />
          </div>
          {this.props.children}
        </div>);
    }
};

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

export function setup_hiplot_website(element: HTMLElement, experiment?: HiPlotExperiment) {
    if (experiment === undefined) {
        experiment = null;
    }
    var ref = ReactDOM.render(<HiPlotComponent experiment={experiment}/>, element);
    return ref;
}

Object.assign(window, {
    'setup_hiplot_website': setup_hiplot_website,
});