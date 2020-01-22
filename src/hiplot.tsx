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

import { WatchedProperty, Datapoint, ParamType, HiPlotExperiment, AllDatasets } from "./types";
import { RowsDisplayTable } from "./rowsdisplaytable";
import { infertypes } from "./infertypes";
import { PageState } from "./lib/savedstate";
import { ParallelPlot } from "./parallel";
import { DatapointsGraph } from "./datapointsgraph";
import { KeepDataBtn, ExcludeDataBtn, RestoreDataBtn, ExportDataCSVBtn, ThemeToggle, SelectedCountProgressBar } from "./controls";
import { RunsSelectionTextArea, ErrorDisplay } from "./elements";
import { HiPlotData } from "./plugin";


//@ts-ignore
import IconSVG from "../hiplot/static/icon.svg";
//@ts-ignore
import LogoSVG from "../hiplot/static/logo.svg";
//@ts-ignore
import style from "./hiplot.css";
import { ContextMenu } from "./contextmenu";

const URL_LOAD_URI = 'load_uri';
const URL_COLOR_BY = 'color_by';


interface HiPlotComponentProps {
    experiment: HiPlotExperiment | null;
    is_notebook: boolean;
};

enum HiPlotLoadStatus {
    None,
    Loading,
    Loaded,
    Error
};

interface HiPlotComponentState {
    experiment: HiPlotExperiment | null;
    webserver: boolean;
    version: number;
    load_status: HiPlotLoadStatus;
    error: string;
}

function make_hiplot_data(): HiPlotData {
    return {
        params_def: {},
        rows: new AllDatasets(),
        get_color_for_uid: null,
        get_color_for_row: null,
        render_row_text: function(row: Datapoint) {
            return row.uid;
        },
        dp_lookup: {},
        context_menu_ref: React.createRef(),
        colorby: new WatchedProperty('colorby'),
        experiment: null,
        url_state: PageState.create_state('hip'),
        is_notebook: false,
    };
}
export class HiPlotComponent extends React.Component<HiPlotComponentProps, HiPlotComponentState> {
    // React refs
    domRoot: React.RefObject<HTMLDivElement> = React.createRef();
    controls: React.RefObject<HTMLDivElement> = React.createRef();
    parallelPlotRef: React.RefObject<HTMLDivElement> = React.createRef();

    parallelPlot: ParallelPlot = null;
    comm = null;
    table: RowsDisplayTable = null;

    jcontrols: JQuery;
    data: HiPlotData = make_hiplot_data();

    constructor(props: HiPlotComponentProps) {
        super(props);
        this.state = {
            experiment: props.experiment,
            webserver: props.experiment === null,
            version: 0,
            load_status: HiPlotLoadStatus.None,
            error: null,
        };
        this.data.is_notebook = props.is_notebook;
        var selection_id = 0;
        var rows = this.data.rows;
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
        }, me);
        rows['all'].on_change(function(new_data) {
            if (me.parallelPlot === null) {
                return;
            }
            me.data.params_def = infertypes(me.data.url_state.children('params'), new_data, me.data.params_def);
            //me.parallelPlot.state.params_def = me.data.params_def; // TODO
            //me.line_display.params_def = me.data.params_def; // TODO
        }, me);
        if (this.props.experiment !== null) {
            this._loadExperiment(this.props.experiment);
        }
    }
    _loadExperiment(experiment: HiPlotExperiment) {
        //console.log('Load xp', experiment);
        var me = this;
        me.data.experiment = experiment;
        var rows = this.data.rows;
        var jroot = $(me.domRoot.current);
        jroot.find('.hiplot-loaded-change-class').each(function(_, n) {
            $(n).removeClass($(n).attr('data-hiplot-loaded-remove-class'));
            $(n).addClass($(n).attr('data-hiplot-loaded-add-class'));
        });

        // Generate dataset for Parallel Plot
        me.data.dp_lookup = {};
        rows['experiment_all'].set(experiment.datapoints.map(function(t) {
            var csv_obj = $.extend({
                "uid": t.uid,
                "from_uid": t.from_uid,
            }, t.values);
            me.data.dp_lookup[t.uid] = csv_obj;
            return csv_obj;
        }));
        rows['all'].set(rows['experiment_all'].get());
        rows['selected'].set(rows['experiment_all'].get());

        me.data.params_def = infertypes(this.data.url_state.children('params'), rows['all'].get(), experiment.parameters_definition);

        // Color handling
        function get_default_color() {
            function select_as_coloring_score(r) {
                var pd = me.data.params_def[r];
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
            var possibles = Object.keys(me.data.params_def).sort((a, b) => select_as_coloring_score(b) - select_as_coloring_score(a));
            return possibles[0];
        }
        this.data.colorby.set(this.data.url_state.get(URL_COLOR_BY, get_default_color()));
        if (me.data.params_def[this.data.colorby.get()] === undefined) {
            this.data.colorby.set(get_default_color());
        }
        this.data.colorby.on_change(function(f) {
            me.data.url_state.set(URL_COLOR_BY, f);
        }, this);
        this.data.get_color_for_row = function(trial: Datapoint, alpha: number) {
            return me.data.params_def[me.data.colorby.get()].colorScheme(trial[me.data.colorby.get()], alpha);
        };
        this.data.get_color_for_uid = function(uid: string, alpha: number) {
            var trial = me.data.dp_lookup[uid];
            return me.data.params_def[me.data.colorby.get()].colorScheme(trial[me.data.colorby.get()], alpha);
        };
    }
    loadWithPromise(prom: Promise<any>) {
        var me = this;
        me.setState({load_status: HiPlotLoadStatus.Loading});
        prom.then(function(data) {
            if (data.experiment === undefined) {
                me.setState({
                    load_status: HiPlotLoadStatus.Error,
                    experiment: null,
                    error: data.error !== undefined ? data.error : 'Unable to load experiment',
                });
                return;
            }
            me._loadExperiment(data.experiment);
            me.setState(function(state, props) { return {
                experiment: data.experiment,
                version: state.version + 1,
                load_status: HiPlotLoadStatus.Loaded,
            }; });
        })
        .catch(
            error => {
                console.log('Error', error);
                me.setState({load_status: HiPlotLoadStatus.Error, experiment: null, error: 'HTTP error, check server logs / javascript console'});
                throw error;
            }
        );
    }
    setup_comm(comm_) {
        this.comm = comm_;
        console.log("Setting up communication channel", comm_);
    }
    componentWillUnmount() {
        this.data.context_menu_ref.current.removeCallbacks(this);
        this.data.rows.off(this);
        this.data.colorby.off(this);
    }
    componentDidMount() {
        // Setup contextmenu when we right-click a parameter
        var me = this;
        me.data.context_menu_ref.current.addCallback(function(column, cm) {
            const VAR_TYPE_TO_NAME = {
                [ParamType.CATEGORICAL]: 'Categorical',
                [ParamType.NUMERIC]: 'Number',
                [ParamType.NUMERICLOG]: 'Number (log-scale)',
                [ParamType.NUMERICPERCENTILE]: 'Number (percentile-scale)',
            };

            var contextmenu = $(cm);
            contextmenu.append($('<h6 class="dropdown-header">Data scaling</h6>'));
            me.data.params_def[column].type_options.forEach(function(possible_type) {
              var option = $('<a class="dropdown-item" href="#">').text(VAR_TYPE_TO_NAME[possible_type]);
              if (possible_type == me.data.params_def[column].type) {
                option.addClass('disabled').css('pointer-events', 'none');
              }
              option.click(function(event) {
                contextmenu.css('display', 'none');
                me.data.params_def[column].type = possible_type;
                me.data.params_def[column].__url_state__.set('type', possible_type);
                me.data.rows['all'].append([]); // Trigger recomputation of the parameters + rerendering
                event.preventDefault();
              });
              contextmenu.append(option);
            });
            contextmenu.append($('<div class="dropdown-divider"></div>'));
        
            // Color by
            var link_colorize = $('<a class="dropdown-item" href="#">Use for coloring</a>');
            link_colorize.click(function(event) {
            me.data.colorby.set(column);
            event.preventDefault();
            });
            if (me.data.colorby.get() == column) {
                link_colorize.addClass('disabled').css('pointer-events', 'none');
            }
            contextmenu.append(link_colorize);
        }, this);
        var load_uri = this.data.url_state.get(URL_LOAD_URI);
        if (load_uri !== undefined) {
            this.loadURI(load_uri);
        }
    }
    componentDidUpdate() {
        if (this.state.load_status == HiPlotLoadStatus.None) {
            this.data = make_hiplot_data();
        }
    }
    onRefreshDataBtn() {
        this.loadURI(this.data.url_state.get(URL_LOAD_URI));
    }
    loadURI(uri: string) {
        this.loadWithPromise(new Promise(function(resolve, reject) {
            $.get( "/data?uri=" + encodeURIComponent(uri), resolve, "json").fail(function(data) {
                //console.log("Data loading failed", data);
                if (data.readyState == 4 && data.status == 200) {
                    console.log('Unable to parse JSON :( Trying custom decoder...');
                    var decoded = JSON5.parse(data.responseText);
                    resolve(decoded);
                    return;
                }
                reject(data);
            });
        }));
    }
    onRunsTextareaSubmitted(uri: string) {
        this.data.url_state.clear();
        this.data.url_state.set(URL_LOAD_URI, uri);
        this.loadURI(uri);
    }

    render() {
        return (
        <div className="scoped_css_bootstrap">
            <div ref={this.domRoot} className={style.hiplot}>
            <SelectedCountProgressBar rows={this.data.rows} />
            <HeaderBar>
            {this.state.webserver &&
                <RunsSelectionTextArea
                    initialValue={this.data.url_state.get(URL_LOAD_URI, '')}
                    enabled={this.state.load_status != HiPlotLoadStatus.Loading}
                    minimizeWhenOutOfFocus={this.state.load_status == HiPlotLoadStatus.Loaded}
                    onSubmit={this.onRunsTextareaSubmitted.bind(this)} />
            }
        
            <div ref={this.controls} className="col-md-8">
            {this.state.load_status == HiPlotLoadStatus.Loaded &&
                <React.Fragment>
                    <RestoreDataBtn rows={this.data.rows} />
                    <KeepDataBtn rows={this.data.rows} />
                    <ExcludeDataBtn rows={this.data.rows} />
                    <button onClick={() => this.setState({load_status: HiPlotLoadStatus.None, experiment: null})}>UNLOAD</button>
                    {this.state.webserver &&
                        <button title="Refresh + restore data removed" onClick={this.onRefreshDataBtn.bind(this)}>Refresh</button>
                    }
                    <ExportDataCSVBtn rows={this.data.rows} />
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
                </React.Fragment>
            }
            </div>
            </HeaderBar>
            {this.state.load_status == HiPlotLoadStatus.Error &&
                <ErrorDisplay error={this.state.error} />
            }
            {this.state.load_status != HiPlotLoadStatus.Loaded &&
                <DocAndCredits />
            }
            <ContextMenu ref={this.data.context_menu_ref}/>
            {this.state.load_status == HiPlotLoadStatus.Loaded &&
            <div>
                <ParallelPlot {...this.data} />
                <DatapointsGraph {...this.data} />
                <RowsDisplayTable {...this.data} />
            </div>
            }
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

export function setup_hiplot_website(element: HTMLElement, experiment?: HiPlotExperiment, extra?: object) {
    var props: HiPlotComponentProps = {
        experiment: null,
        is_notebook: false,
    };
    if (experiment !== undefined) {
        props.experiment = experiment;
    }
    if (extra !== undefined) {
        //@ts-ignore
        if (extra.is_notebook !== undefined) {
            //@ts-ignore
            props.is_notebook = extra.is_notebook;
        }
    }
    return ReactDOM.render(<HiPlotComponent {...props} />, element);
}

export function setup_hiplot_notebook(element: HTMLElement, experiment: HiPlotExperiment) {
    if (experiment === undefined) {
        experiment = null;
    }
    return ReactDOM.render(<HiPlotComponent experiment={experiment} is_notebook={true} />, element);
}

Object.assign(window, {
    'setup_hiplot_website': setup_hiplot_website,
    'setup_hiplot_notebook': setup_hiplot_notebook,
});