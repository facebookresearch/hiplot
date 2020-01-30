/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is largely inspired from the snippet by Kai Chang
// available in http://bl.ocks.org/syntagmatic/3150059

import $ from "jquery";
import React from "react";
import * as d3 from "d3";
import * as _ from 'underscore';

import { WatchedProperty, AllDatasets, Datapoint, ParamType } from "./types";
import { ParamDefMap } from "./infertypes";
//@ts-ignore
import style from "./hiplot.css";
import { HiPlotPluginData } from "./plugin";
import { ResizableH } from "./lib/resizable";


export interface ParallelPlotInternalState {
  colorby: WatchedProperty,
  rows: AllDatasets,
  params_def: ParamDefMap,
};

export interface StringMapping<V> { [key: string]: V; };

interface ParallelPlotState {
  height: number;
  width: number;
  order: Array<string>;
  hide: Set<string>;
  invert: Set<string>;
};

interface ParallelPlotData extends HiPlotPluginData {
  order?: Array<string>;
  hide?: Set<string>;
  invert?: Set<string>;
  data: any;
};

export class ParallelPlot extends React.Component<ParallelPlotData, ParallelPlotState> {
  on_resize: () => void = null;
  on_unmount: Array<() => void> = [];
  m = [75, 0, 10, 0]; // Margins
  // Available space minus margins
  w: number;
  h: number;

  xscale: any;

  debounced_brush: any;

  // Rendering
  root_ref: React.RefObject<HTMLDivElement> = React.createRef();
  foreground_ref: React.RefObject<HTMLCanvasElement> = React.createRef();
  foreground: CanvasRenderingContext2D;
  background_ref: React.RefObject<HTMLCanvasElement> = React.createRef();
  background: CanvasRenderingContext2D;
  highlighted_ref: React.RefObject<HTMLCanvasElement> = React.createRef();
  highlighted: CanvasRenderingContext2D;
  svg: any;
  svgg: any;
  div: any;

  // Dimensions, scaling and axis
  dimensions: Array<string> = [];
  yscale: StringMapping<any> = {}; // d3.scale
  axis: any; // d3.scale
  d3brush = d3.brushY();
  constructor(props: ParallelPlotData) {
    super(props);
    this.state = {
      height: props.data.height ? props.data.height : 600,
      width: document.body.clientWidth,
      order: props.order ? props.order : props.url_state.get('order', []),
      hide: new Set(props.hide ? props.hide : props.url_state.get('hide', [])),
      invert: new Set(props.invert ? props.invert : props.url_state.get('invert', [])),
    };
  }
  static defaultProps = {
    data: {}
  }
  componentWillUnmount() {
    this.svg.selectAll("*").remove();
    $(window).off("resize", this.onWindowResize);
    this.props.rows.off(this);
    this.props.colorby.off(this);
    this.on_unmount.forEach(fn => fn());
    this.on_unmount = [];
  };
  componentDidUpdate(prevProps, prevState) {
    if (prevState.height != this.state.height || prevState.width != this.state.width) {
        if (this.on_resize != null) {
          this.on_resize();
        }
    }
    if (prevState.invert != this.state.invert) {
      this.props.url_state.set('invert', Array.from(this.state.invert));
    }
    if (prevState.hide != this.state.hide) {
      this.props.url_state.set('hide', Array.from(this.state.hide));
    }
    if (prevState.order != this.state.order) {
      this.props.url_state.set('order', this.state.order);
    }
    this.props.data.height = this.state.height;
  }
  onResizeH(height: number): void {
    this.setState({height: height});
  }
  onWindowResize = function() {
    this.setState({width: document.body.clientWidth});
  }.bind(this)
  render() {
    return (
    <ResizableH initialHeight={this.state.height} onResize={this.onResizeH.bind(this)}>
    <div ref={this.root_ref} className={style["parallel-plot-chart"]} style={{"height": this.state.height}}>
          <canvas ref={this.foreground_ref} className={style["background-canvas"]}></canvas>
          <canvas ref={this.background_ref} className={style["foreground-canvas"]}></canvas>
          <canvas ref={this.highlighted_ref} className={style["highlight-canvas"]}></canvas>
          <svg></svg>
    </div>
    </ResizableH>);
  }
  componentDidMount() {
    var me = this;
    var props = this.props;

    var dragging: {[dim: string]: number} = {},
        dimensions_dom = null,
        render_speed = 10,
        brush_count = 0;

    var div = this.div = d3.select(me.root_ref.current);
    var svg = this.svg = div.select('svg');
    var svgg = this.svgg = svg.append("svg:g");

    // Foreground canvas for primary view
    me.foreground = this.foreground_ref.current.getContext('2d');
    me.foreground.globalCompositeOperation = "destination-over";

    // Highlight canvas for temporary interactions
    me.highlighted = this.highlighted_ref.current.getContext('2d');

    // Background canvas
    me.background = this.background_ref.current.getContext('2d');

    function isColHidden(k: string) {
      var pd = me.props.params_def[k];
      return pd === undefined ||
        pd.special_values.length + pd.distinct_values.length <= 1 ||
        (pd.type == ParamType.CATEGORICAL && pd.distinct_values.length > 80) ||
        me.state.hide.has(k);
    }
    // SVG for ticks, labels, and interactions

    // Load the data and visualization
    function _loadWithProvidedData() {
      // Extract the list of numerical dimensions and create a scale for each.
      me.xscale.domain(me.dimensions = d3.keys(props.params_def).filter(function(k) {
        if (isColHidden(k)) {
          return false;
        }
        me.yscale[k] = me.createScale(k);
        return true;
      }).sort(function(a, b) {
        var pda = me.state.order.findIndex((e) => e == a);
        var pdb = me.state.order.findIndex((e) => e == b);
        return (pda == -1 ? me.state.order.length : pda) - (pdb == -1 ? me.state.order.length : pdb);
      }));
      me.setState({order: Array.from(me.dimensions)});

      // Add a group element for each dimension.
      function create_drag_beh() {
        var drag_origin: {[dim: string]: number} = {};
        var is_dragged: {[dim: string]: boolean} = {};
        return d3.drag().on("start", function(d: string) {
          dragging[d] = drag_origin[d] = me.xscale(d);
          is_dragged[d] = false;
          d3.select(me.foreground_ref.current).style("opacity", "0.35");
        })
        .on("drag", function(d: string) {
          dragging[d] = Math.min(me.w, Math.max(0, drag_origin[d] += d3.event.dx));
          me.dimensions.sort(function(a, b) { return position(a) - position(b); });
          me.xscale.domain(me.dimensions);
          dimensions_dom.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
          brush_count++;
          is_dragged[d] = true;

          // Feedback for axis deletion if dropped
          if (dragging[d] < 12 || dragging[d] > me.w-12) {
            d3.select(this).select("." + style.brush).style('fill', 'red');
          } else {
            d3.select(this).select("." + style.brush).style('fill', null);
          }
        })
        .on("end", function(d: string) {
          if (!is_dragged[d]) {
            // no movement, invert axis
            var extent = invert_axis(d);

          } else {
            // reorder axes
            d3.select(this).transition().attr("transform", "translate(" + me.xscale(d) + ")");

            var extents = brush_extends();
            extent = extents[d];
          }

          // remove axis if dragged all the way left
          if (dragging[d] < 12 || dragging[d] > me.w-12) {
            remove_axis(d);
          }
          me.setState({order: Array.from(me.dimensions)});

          me.xscale.domain(me.dimensions);
          update_ticks(d, extent);

          // rerender
          d3.select(me.foreground_ref.current).style("opacity", null);
          brush();
          delete is_dragged[d];
          delete drag_origin[d];
          delete dragging[d];
        });
      }
      dimensions_dom = svgg.selectAll(".dimension")
          .data(me.dimensions)
        .enter().append("svg:g")
          .attr("class", "dimension")
          .attr("transform", function(d) { return "translate(" + me.xscale(d) + ")"; })
          //@ts-ignore
          .call(create_drag_beh());

      // Add an axis and title.
      dimensions_dom.append("svg:g")
          .attr("class", style.axis)
          .attr("transform", "translate(0,0)")
          .each(function(d) { d3.select(this).call(me.axis.scale(me.yscale[d])); })
        .append("svg:text")
          .attr("text-anchor", "middle")
          .attr("y", function(d,i) { return -14 - 16 * (i%3); } )
          .attr("x", 0)
          .attr("class", style.label)
          .text(String)
          .on("contextmenu", function(d) {
            if (me.props.context_menu_ref !== undefined) {
              me.props.context_menu_ref.current.show(d3.event.pageX, d3.event.pageY, d);
            }
            d3.event.preventDefault();
          })
          .append("title")
            .text("Click to invert. Drag to reorder");

      // Add and store a brush for each axis.
      dimensions_dom.append("svg:g")
          .attr("class", style.brush)
          .each(function(d) { d3.select(this).call(me.d3brush); })
        .selectAll("rect")
          .style("visibility", null)
          .append("title")
            .text("Drag up or down to brush along this axis");

      dimensions_dom.selectAll(".extent")
          .append("title")
            .text("Drag or resize this filter");

      // Render full foreground
      brush();
    };

    // render polylines i to i+render_speed
    function render_range(selection: Array<Datapoint>, i: number, max: number, opacity: number) {
      var s = selection.slice(i,max);
      props.rows['rendered'].append(s);
      s.forEach(function(d) {
        path(d, me.foreground, props.get_color_for_row(d, opacity));
      });
    };

    // Adjusts rendering speed
    function optimize(timer) {
      var delta = (new Date()).getTime() - timer;
      render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
      render_speed = Math.min(render_speed, 300);
      return (new Date()).getTime();
    }

    // Highlight polylines
    props.rows['highlighted'].on_change(function(highlighted_rows) {
      me.highlighted.clearRect(0, 0, me.w, me.h);
      if (highlighted_rows.length == 0) {
        d3.select(me.foreground_ref.current).style("opacity", null);
        return;
      }
      d3.select(me.foreground_ref.current).style("opacity", "0.25");
      highlighted_rows.forEach(function(dp) {
        path(dp, me.highlighted, props.get_color_for_row(dp, 1));
      })
    }, me);

    function invert_axis(d: string) {
      // save extent before inverting
      var extents = brush_extends();
      var extent = extents[d] !== null ? [me.h - extents[d][1], me.h - extents[d][0]] : null;

      if (me.state.invert.has(d)) {
        me.setState(function(prevState, props) {
          var newInvert = new Set(prevState.invert);
          newInvert.delete(d);
          return {
            invert: newInvert
          };
        });
        me.setScaleRange(d);
        div.selectAll("." + style.label)
          .filter(function(p) { return p == d; })
          .style("text-decoration", null);
      } else {
        me.setState(function(prevState, props) {
          var newInvert = new Set(prevState.invert);
          newInvert.add(d);
          return {
            invert: newInvert
          };
        });
        me.setScaleRange(d);
        div.selectAll("." + style.label)
          .filter(function(p) { return p == d; })
          .style("text-decoration", "underline");
      }
      return extent;
    }

    function path(d: Datapoint, ctx: CanvasRenderingContext2D, color?: string) {
      if (color) ctx.strokeStyle = color;
      var has_started = false;
      var x0: number, y0: number;
      me.dimensions.map(function(p,i) {
        var err = d[p] === undefined;
        if (!err && (d[p] == 'inf' || d[p] == '-inf') && props.params_def[p].numeric) {
          err = true;
        }
        var x = me.xscale(p),
            y = me.yscale[p](d[p]);
        if (isNaN(y)) {
          err = true;
        }
        if (err) {
          // Skip this one
          if (has_started) {
            ctx.lineTo(x0+15, y0);                               // right edge
            ctx.stroke();
          }
          has_started = false;
          return;
        }
        if (!has_started) {
          x0 = x-15;
          y0 = y;
          ctx.moveTo(x0,y0);
          ctx.beginPath();
          has_started = true;
        }
        var cp1x = x - 0.88*(x-x0);
        var cp1y = y0;
        var cp2x = x - 0.12*(x-x0);
        var cp2y = y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        x0 = x;
        y0 = y;
      });
      if (has_started) {
        ctx.lineTo(x0+15, y0);                               // right edge
        ctx.stroke();
      }
    };

    function position(d) {
      var v = dragging[d];
      return v == null ? me.xscale(d) : v;
    }

    function brush_extends() {
      var extents = {};
      dimensions_dom.selectAll("." + style.brush).each(function(dim) {
        extents[dim] = d3.brushSelection(this);
      });
      return extents;
    }

    function brush_clear_all() {
      // Reset brushes - but only trigger call to "brush" once
      me.d3brush.on("brush", null).on("end", null);
      me.d3brush.move(dimensions_dom.selectAll("." + style.brush), null);
      me.d3brush.on("brush", me.debounced_brush).on("end", me.debounced_brush);
      me.debounced_brush();
    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
      if (me.props.context_menu_ref !== undefined) {
        me.props.context_menu_ref.current.hide();
      }
      brush_count++;
      var extents = brush_extends();
      var actives = me.dimensions.filter(function(p) { return extents[p] !== null; });

      // hack to hide ticks beyond extent
      var b = dimensions_dom
        .each(function(dimension) {
          if (_.include(actives, dimension)) {
            var scale = me.yscale[dimension];
            var extent = extents[dimension];
            d3.select(this)
              .selectAll('text')
              .style('font-weight', 'bold')
              .style('font-size', '13px')
              .style('display', function() {
                if (d3.select(this).classed(style.label)) {
                  return null;
                }
                var value = d3.select(this).data();
                return extent[0] <= scale(value) && scale(value) <= extent[1] ? null : "none";
              });
          } else {
            d3.select(this)
              .selectAll('text')
              .style('font-size', null)
              .style('font-weight', null)
              .style('display', null);
          }
          d3.select(this)
            .selectAll("." + style.label)
            .style('display', null);
        });
        ;

      // bold dimensions with label
      div.selectAll("." + style.label)
        .style("font-weight", function(dimension) {
          if (_.include(actives, dimension)) return "bold";
          return null;
        });

      // Get lines within extents
      var selected = [];
      var all_data = props.rows['all'].get();
      all_data
        .map(function(d) {
          return actives.every(function(dimension) {
            var scale = me.yscale[dimension];
            var extent = extents[dimension];
            var value = d[dimension];
            return extent[0] <= scale(value) && scale(value) <= extent[1];
          }) ? selected.push(d) : null;
        });

      props.rows['selected'].set(selected);
    }
    this.debounced_brush = _.throttle(brush.bind(this), 75);

    props.rows['selected'].on_change(function(selected) {
      // Render selected lines
      paths(selected, me.foreground, brush_count);
    }, me);

    // render a set of polylines on a canvas
    function paths(selected: Array<Datapoint>, ctx: CanvasRenderingContext2D, count: number) {
      var n = selected.length,
          i = 0,
          opacity = d3.min([2/Math.pow(n,0.3),1]),
          timer = (new Date()).getTime();

      var shuffled_data: Array<Datapoint> = _.shuffle(selected);

      props.rows['rendered'].set([]);
      ctx.clearRect(0,0,me.w+1,me.h+1);

      // render all lines until finished or a new brush event
      function animloop(){
        if (i >= n || count < brush_count) return true;
        var max = d3.min([i+render_speed, n]);
        render_range(shuffled_data, i, max, opacity);
        i = max;
        timer = optimize(timer);  // adjusts render_speed
      };

      var t = d3.timer(animloop);
      me.on_unmount.push(function() {t.stop();});
    }

    // transition ticks for reordering, rescaling and inverting
    function update_ticks(d?, extent?) {
      // update brushes
      if (d) {
        var brush_el = svg.selectAll("." + style.brush)
            .filter(function(key) { return key == d; });
        //@ts-ignore
        me.d3brush.move(brush_el, extent);
      } else {
        // all ticks
        svg.selectAll("." + style.brush)
          .each(function(d) { d3.select(this).call(me.d3brush); })
      }

      brush_count++;

      // show ticks
      div.selectAll("." + style.axis + " g").style("display", null);
      div.selectAll(".background").style("visibility", null);

      // update axes
      div.selectAll("." + style.axis)
        .each(function(d: string,i) {
          // hide lines for better performance
          d3.select(this).selectAll('line').style("display", "none");

          // transition axis numbers
          d3.select(this)
            .transition()
            .duration(720)
            .call(me.axis.scale(me.yscale[d]));

          // bring lines back
          d3.select(this).selectAll('line').transition().delay(800).style("display", null);

          d3.select(this)
            .selectAll('text')
            .style('font-weight', null)
            .style('font-size', null)
            .style('display', null);
        });
    }

    // Rescale to new dataset domain:
    // reset yscales, preserving inverted state
    props.rows['all'].on_change(function(new_data) {
      brush_clear_all();

      // When removing data, some columns might no longer exist
      // and we want to remove those
      var drop_scales = [];
      me.dimensions.forEach(function(d) {
        var new_scale = me.createScale(d);
        if (new_scale === null) {
          drop_scales.push(d);
          return;
        }
        me.yscale[d] = new_scale;
      });
      drop_scales.forEach(function(d, i) {
        remove_axis(d);
      });

      update_ticks();

      // Render selected data
      paths(new_data, me.foreground, brush_count);
    }, me);

    // scale to window size
    this.on_resize = _.debounce(function() {
      me.compute_dimensions();

      div.selectAll(".dimension")
        .attr("transform", function(d: string) {
          return "translate(" + me.xscale(d) + ")";
      })
      // update brush placement
      svg.selectAll("." + style.brush)
        .each(function(d) { d3.select(this).call(me.d3brush); })
      brush_count++;

      // update axis placement
      me.axis = me.axis.ticks(1+me.state.height/50);
      div.selectAll("." + style.axis)
        .each(function(d: string) {
          d3.select(this).call(me.axis.scale(me.yscale[d]));
      });

      // render data
      brush();
    }, 100);
    $(window).on("resize", this.onWindowResize);

    function remove_axis(d) {
      var pd = props.params_def[d];
      if (pd !== undefined) {
        me.setState(function(prevState, props) {
          var newHide = new Set(prevState.hide);
          newHide.add(d);
          return {
            hide: newHide
          };
        });
      }
      var g = svgg.selectAll(".dimension");
      me.dimensions = _.difference(me.dimensions, [d]);
      me.xscale.domain(me.dimensions);
      g.attr("transform", function(p) { return "translate(" + position(p) + ")"; });
      dimensions_dom.filter(function(p) { return p == d; }).remove();
      update_ticks();
    }

    me.compute_dimensions();
    _loadWithProvidedData();

    me.props.colorby.on_change(brush, me);
  }

  setScaleRange(k: string) {
    var range = [this.h, 0];
    if (this.state.invert.has(k)) {
      range = [0, this.h];
    }
    this.yscale[k].range(range);
  }

  createScale(k: string) {
    var pd = this.props.params_def[k];
    if (pd === undefined) {
      return null;
    }
    var range = [this.h, 0];
    if (this.state.invert.has(k)) {
      range = [0, this.h];
    }
    var scale = pd.create_d3_scale();
    scale.range(range);
    scale.parallel_plot_axis = k;
    return scale;
  }

  compute_dimensions() {
    this.w = this.state.width - this.m[1] - this.m[3];
    this.h = this.state.height - this.m[0] - this.m[2];
    this.axis = d3.axisLeft(d3.scaleLinear() /* placeholder */).ticks(1+this.state.height/50);
    this.d3brush.extent([[-23, 0], [15, this.h]]).on("brush", this.debounced_brush).on("end", this.debounced_brush);
    // Scale chart and canvas height
    this.div.style("height", (this.state.height) + "px")

    this.div.selectAll("canvas")
        .attr("width", this.w)
        .attr("height", this.h)
        .style("padding", this.m.join("px ") + "px");
    this.svg.attr("width", this.state.width)
      .attr("height", this.state.height)
      .select("g")
     .attr("transform", "translate(" + this.m[3] + "," + this.m[0] + ")");
    this.xscale = d3.scalePoint().range([40, this.w - 40]).domain(this.dimensions);
    var me = this;
    this.dimensions.forEach(function(d: string) {
      me.setScaleRange(d);
    });
    this.highlighted.lineWidth = 4;
  }
}
