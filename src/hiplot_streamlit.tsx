/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { ReactNode } from "react"
import {
  withStreamlitConnection,
  StreamlitComponentBase,
  Streamlit,
} from "./streamlit"
import { HiPlot } from "./hiplot";

import ReactDOM from "react-dom";
import { ComponentProps } from "./streamlit/StreamlitReact";


interface State {
  selected_uids: Array<string>;
  filtered_uids: Array<string>;
  brush_extents: Array<any>;
  experiment: any;
  experimentJson: string;
};

class ReactTemplate extends StreamlitComponentBase<State> {
  constructor(props: ComponentProps) {
    super(props);
    this.state = {
      selected_uids: null,
      filtered_uids: null,
      brush_extents: null,
      experiment: eval('(' + props.args.experiment + ')'),
      experimentJson: props.args.experiment,
    };
  }
  public render = (): ReactNode => {
    // Arguments that are passed to the plugin in Python are accessible
    // via `this.props.args`. Here, we access the "name" arg.
    var onChangeHandlers = {
      'selected_uids': this.onChange.bind(this),
      'filtered_uids': this.onChange.bind(this),
      'brush_extents': this.onChange.bind(this),
    };
    return <HiPlot experiment={this.state.experiment} onChange={onChangeHandlers} />;
  }

  public onChange = (type: string, data: any): void => {
    // @ts-ignore
    this.setState({[type]: data});
    Streamlit.setFrameHeight();
  }

  public componentDidUpdate(prevProps, prevState: State): void {
    const ret: Array<string> = this.props.args["ret"];
    var changed = false;
    const py_ret = ret.map(function(r) {
      if (this.state[r] != prevState[r]) {
        console.log(r, "changed");
        changed = true;
      }
      return this.state[r];
    }.bind(this));
    if (changed || JSON.stringify(this.props.args.ret) != JSON.stringify(prevProps.args.ret)) {
      console.log("hiplot update return", py_ret, {
        'prevProps.args.ret': prevProps.args.ret,
        'this.props.args.ret': this.props.args.ret,
        'changed': changed
      });
      Streamlit.setComponentValue(py_ret);
    }
    const newExp = this.props.args['experiment'];
    const lastExp = prevProps.args['experiment'];
    if (newExp != this.state.experimentJson) {
      this.setState({
        experiment: eval('(' + newExp + ')'),
        experimentJson: newExp
      });
    }
    Streamlit.setFrameHeight();
  }


  // Streamlit.setComponentValue( ... python return value )
}

const componentWrapped = withStreamlitConnection(ReactTemplate)


ReactDOM.render(
  <React.StrictMode>
    {React.createElement(componentWrapped)}
  </React.StrictMode>,
  document.getElementById("root")
)
