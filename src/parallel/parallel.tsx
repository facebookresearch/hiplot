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
import _ from 'underscore';

import { Datapoint, ParamType } from "../types";
import { create_d3_scale, scale_pixels_range, ParamDef } from "../infertypes";
import style from "../hiplot.scss";
import { HiPlotPluginData } from "../plugin";
import { ResizableH } from "../lib/resizable";
import { Filter, FilterType, apply_filters } from "../filters";
import { foDynamicSizeFitContent, foCreateAxisLabel } from "../lib/svghelpers";

interface StringMapping<V> { [key: string]: V; };

interface ParallelPlotState {
  height: number;
  width: number;
  order: Array<string>;
  hide: Set<string>;
  invert: Set<string>;
  dimensions: Array<string>;
  brush_count: number;

  dragging: {col: string, pos: number, origin: number, dragging: boolean};
};

interface PPlotInternal {
  redraw_axis: () => void;
  brush: () => void;
};


// DISPLAYS_DATA_DOC_BEGIN
// Corresponds to values in the dict of `exp.display_data(hip.Displays.PARALLEL_PLOT)`
export interface ParallelPlotDisplayData {
  // Ordering of the columns
  order?: Array<string>;

  // Hidden columns, that won't appear in the parallel plot
  // NOTE: Categorical columns with more than `categoricalMaximumValues` distinct values will be hidden
  // NOTE: Columns with a single value won't appear either unless you provide a min/max
  //       eg: `exp.parameters_definition["column_name"].force_range(0, 100)`
  hide?: Array<string>;

  // These columns will be inverted (higher values are below)
  invert?: Array<string>;

  // Categorical columns with more distinct values that this won't be displayed
  categoricalMaximumValues: number;
}
// DISPLAYS_DATA_DOC_END

export interface ParallelPlotData extends HiPlotPluginData, ParallelPlotDisplayData {
};

export class ParallelPlot extends React.Component<ParallelPlotData, ParallelPlotState> {
  on_resize: () => void = null;
  m = [75, 0, 10, 0]; // Margins
  // Available space minus margins
  w: number;
  h: number;

  pplot: PPlotInternal;

  dimensions_dom: d3.Selection<SVGGElement, string, SVGGElement, unknown> = null;
  render_speed = 10;
  animloop: d3.Timer = null;

  xscale: any;

  brush: any;

  // Rendering
  root_ref: React.RefObject<HTMLDivElement> = React.createRef();
  foreground_ref: React.RefObject<HTMLCanvasElement> = React.createRef();
  foreground: CanvasRenderingContext2D;
  highlighted_ref: React.RefObject<HTMLCanvasElement> = React.createRef();
  highlighted: CanvasRenderingContext2D;

  svg_ref: React.RefObject<SVGSVGElement> = React.createRef();
  svgg_ref: React.RefObject<SVGGElement> = React.createRef();

  div: any;

  // Dimensions, scaling and axis
  yscale: StringMapping<any> = {}; // d3.scale
  axis: d3.Axis<number>;
  d3brush = d3.brushY();

  constructor(props: ParallelPlotData) {
    super(props);
    this.state = {
      height: props.persistentState.get('height', props.window_state.height ? props.window_state.height : 600),
      width: 0, // Will be initiatialize to element width
      order: props.persistentState.get('order', props.order ? props.order : []),
      hide: new Set(props.persistentState.get('hide', props.hide ? props.hide : [])),
      invert: new Set(props.persistentState.get('invert', props.invert ? props.invert : [])),
      dimensions: [],
      brush_count: 0,
      dragging: null,
    };
  }
  static defaultProps = {
    categoricalMaximumValues: 80,
    data: {}
  }
  componentWillUnmount() {
    d3.select(this.svgg_ref.current).selectAll("*").remove();
    if (this.animloop) {
      this.animloop.stop();
    }
    if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
        this.props.context_menu_ref.current.removeCallbacks(this);
    }
    this.onBrushChange.cancel();
    this.sendBrushExtents.cancel();
  };
  componentDidUpdate(prevProps: ParallelPlotData, prevState: ParallelPlotState) {
    if (prevState.height != this.state.height || prevState.width != this.state.width) {
        if (this.on_resize != null) {
          this.on_resize();
        }
    }
    if (prevState.invert != this.state.invert) {
      this.props.persistentState.set('invert', Array.from(this.state.invert));
    }
    if (prevState.hide != this.state.hide) {
      this.props.persistentState.set('hide', Array.from(this.state.hide));
    }
    if (prevState.order != this.state.order) {
      this.props.persistentState.set('order', this.state.order);
    }
    if (prevState.dimensions != this.state.dimensions && this.xscale !== undefined) {
      var g: any = d3.select(this.svgg_ref.current).selectAll(".dimension");
      this.xscale.domain(this.state.dimensions);
      this.dimensions_dom.filter(function(this: ParallelPlot, p) { return this.state.dimensions.indexOf(p) == -1; }.bind(this)).remove();
      this.dimensions_dom = this.dimensions_dom.filter(function(this: ParallelPlot, p) { return this.state.dimensions.indexOf(p) !== -1; }.bind(this));
      if (!this.state.dragging) {
        g = g.transition();
      }
      g.attr("transform", function(this: ParallelPlot, p) { return "translate(" + this.position(p) + ")"; }.bind(this));
      this.update_ticks();
    }
    // Highlight polylines
    if (prevProps.rows_highlighted != this.props.rows_highlighted) {
      this.highlighted.clearRect(0, 0, this.w, this.h);
      if (this.props.rows_highlighted.length == 0) {
        d3.select(this.foreground_ref.current).style("opacity", null);
      }
      else {
        d3.select(this.foreground_ref.current).style("opacity", "0.25");
        this.props.rows_highlighted.forEach(function(this: ParallelPlot, dp: Datapoint) {
          this.path(dp, this.highlighted, this.props.get_color_for_row(dp, 1));
        }.bind(this));
      }
    }
    // Recompute scales - when dimensions got removed, or scaling changed for one
    if (this.pplot && (this.state.dimensions != prevState.dimensions || prevProps.params_def != this.props.params_def)) {
      var drop_scales = [];
      this.state.dimensions.forEach(function(this: ParallelPlot, d: string) {
        var new_scale = this.createScale(d);
        if (new_scale === null) {
          drop_scales.push(d);
          return;
        }
        this.yscale[d] = new_scale;
      }.bind(this));
      drop_scales.forEach(function(this: ParallelPlot, d: string) {
        this.remove_axis(d);
      }.bind(this));
    }
    // Dimension added - redraw missing axis
    const oldDimsSet = new Set(prevState.dimensions);
    if (this.pplot && ![...this.state.dimensions].every(value => oldDimsSet.has(value))) {
      this.pplot.redraw_axis();
    }
    // Rescale to new dataset domain
    if (this.pplot && prevProps.params_def != this.props.params_def) {
      this.brush_clear_all();
      this.update_ticks();

      if (this.animloop) {
        this.animloop.stop();
      }
    }
    // When we need to redraw lines
    if (prevProps.rows_selected != this.props.rows_selected || prevProps.colorby != this.props.colorby || prevState.height != this.state.height || prevState.width != this.state.width) {
      this.setState(function(prevState) { return { brush_count: prevState.brush_count + 1}; });
    }
    else if (prevState.brush_count != this.state.brush_count) {
      this.paths(this.props.rows_selected, this.foreground, this.state.brush_count);
    }
    this.props.window_state.height = this.state.height;
  }
  onBrushChange = _.throttle(function(this: ParallelPlot): void {
    this.sendBrushExtents();
    this.pplot.brush();
  }.bind(this), 75);
  onResize(height: number, width: number): void {
    if (this.state.height != height || this.state.width != width) {
      this.setState({height: height, width: width});
    }
  }
  render() {
    return (
    <ResizableH initialHeight={this.state.height} onResize={this.onResize.bind(this)}>
    <div ref={this.root_ref} className={`${style["parallel-plot-chart"]} pplot-root`} style={{"height": this.state.height}}>
          <canvas ref={this.foreground_ref} className={style["background-canvas"]}></canvas>
          <canvas ref={this.highlighted_ref} className={style["highlight-canvas"]}></canvas>
          <svg ref={this.svg_ref} width={this.state.width} height={this.state.height}>
            <g ref={this.svgg_ref} transform={`translate(${this.m[3]}, ${this.m[0]})`}></g>
          </svg>
    </div>
    </ResizableH>);
  }
  sendBrushExtents = _.debounce(function(this: ParallelPlot): void {
    this.props.sendMessage("brush_extents", function(this: ParallelPlot) {
      const yscales = this.yscale;
      var colToScale = {};
      this.dimensions_dom.selectAll("." + style.brush).each(function(this: SVGGElement, dim: string) {
        const sel: d3.BrushSelection = d3.brushSelection(this);
        if (sel === null) {
          return;
        }
        colToScale[dim] = scale_pixels_range(yscales[dim], sel as [number, number]);
      });
      return colToScale;
    }.bind(this));
  }.bind(this), 400);
  forceHideColumn = function(pd: ParamDef) {
    return pd === undefined ||
      pd.special_values.length + pd.distinct_values.length <= 1 ||
      (pd.type == ParamType.CATEGORICAL && pd.distinct_values.length > this.props.categoricalMaximumValues)
  }.bind(this);
  componentDidMount() {
    var dimensions = d3.keys(this.props.params_def).filter(function(this: ParallelPlot, k: string) {
      if (this.forceHideColumn(this.props.params_def_unfiltered[k]) || this.state.hide.has(k)) {
        return false;
      }
      this.yscale[k] = this.createScale(k);
      return true;
    }.bind(this)).sort(function(this: ParallelPlot, a: string, b: string) {
      const pda = this.state.order.findIndex((e) => e == a);
      const pdb = this.state.order.findIndex((e) => e == b);
      return (pda == -1 ? this.state.order.length : pda) - (pdb == -1 ? this.state.order.length : pdb);
    }.bind(this));
    this.setState({
      width: this.state.width == 0 ? this.root_ref.current.offsetWidth : this.state.width,
      dimensions: dimensions,
      order: Array.from(dimensions),
    }, this.initParallelPlot.bind(this));

    if (this.props.context_menu_ref && this.props.context_menu_ref.current) {
        this.props.context_menu_ref.current.addCallback(this.columnContextMenu.bind(this), this);
    }
  }
  columnContextMenu(column: string, cm: HTMLDivElement) {
    if (!this.can_restore_axis(column)) {
      return;
    }
    var restore_btn = $(`<a class="dropdown-item" href="#">Restore in Parallel Plot</a>`);
    restore_btn.click(function(this: ParallelPlot, event) {
        this.restore_axis(column);
        event.preventDefault();
    }.bind(this));
    $(cm).append(restore_btn);
  }

  position = function(this: ParallelPlot, d: string): number {
    if (this.state.dragging && d == this.state.dragging.col) {
      return this.state.dragging.pos;
    }
    return this.xscale(d);
  }.bind(this);

  initParallelPlot(this: ParallelPlot) {
    const me = this;

    var div = this.div = d3.select(me.root_ref.current);
    var svg = d3.select(me.svg_ref.current);

    // Foreground canvas for primary view
    me.foreground = this.foreground_ref.current.getContext('2d');
    me.foreground.globalCompositeOperation = "destination-over";

    // Highlight canvas for temporary interactions
    me.highlighted = this.highlighted_ref.current.getContext('2d');

    // SVG for ticks, labels, and interactions

    // Load the data and visualization
    function redraw_axis() {
      // Extract the list of numerical dimensions and create a scale for each.
      me.xscale.domain(me.state.dimensions);

      // Add a group element for each dimension.
      function create_drag_beh() {
        return d3.drag().on("start", function(d: string) {
          me.setState({
            dragging: {
              col: d,
              pos: me.xscale(d),
              origin: me.xscale(d),
              dragging: false
            }
          });
          d3.select(me.foreground_ref.current).style("opacity", "0.35");
        })
        .on("drag", function(d: string) {
          const eventdx = d3.event.dx;
          const brushEl = d3.select(this).select("." + style.brush);
          me.setState(function(prevState, _) { return {
            dragging: {
              col: d,
              pos: Math.min(me.w, Math.max(0, prevState.dragging.pos + eventdx)),
              origin: prevState.dragging.origin,
              dragging: true
            }
          };}, function() {
            // Feedback for axis deletion if dropped
            if (me.state.dragging.pos < 12 || me.state.dragging.pos > me.w-12) {
              brushEl.style('fill', 'red');
            } else {
              brushEl.style('fill', null);
            }
          });

          var new_dimensions = Array.from(me.state.dimensions);
          new_dimensions.sort(function(a, b) { return me.position(a) - me.position(b); });
          if (!new_dimensions.every(function(val, idx) { return val == me.state.dimensions[idx]; })) {
            me.setState({dimensions: new_dimensions});
          }
          me.dimensions_dom.attr("transform", function(d) { return "translate(" + me.position(d) + ")"; });
        })
        .on("end", function(d: string) {
          if (!me.state.dragging.dragging) {
            // no movement, invert axis
            var extent = invert_axis(d);
          } else {
            // reorder axes
            d3.select(this).transition().attr("transform", "translate(" + me.xscale(d) + ")");
            var extents = brush_extends();
            extent = extents[d];
          }

          // remove axis if dragged all the way left
          if (me.state.dragging.pos < 12 || me.state.dragging.pos > me.w-12) {
            me.remove_axis(d);
          } else {
            me.setState({order: Array.from(me.state.dimensions)});
          }

          me.update_ticks(d, extent);

          // rerender
          d3.select(me.foreground_ref.current).style("opacity", null);
          me.setState({dragging: null});
        });
      }
      if (me.dimensions_dom) {
        me.dimensions_dom.remove();
      }
      me.dimensions_dom = d3.select(me.svgg_ref.current).selectAll<SVGGElement, string>(".dimension")
          .data(me.state.dimensions)
        .enter().append<SVGGElement>("svg:g")
          .attr("class", "dimension")
          .attr("transform", function(d) { return "translate(" + me.xscale(d) + ")"; })
          //@ts-ignore
          .call(create_drag_beh());

      // Add an axis and title.
      me.dimensions_dom.append("svg:g")
          .attr("class", style.axis)
          .attr("transform", "translate(0,0)")
          .each(function(d) { console.assert(me.yscale[d], d, me.yscale, this); d3.select(this).call(me.axis.scale(me.yscale[d])); })
        .append(function(dim) { return foCreateAxisLabel(me.props.params_def[dim], me.props.context_menu_ref, "Drag to move, right click for options"); })
          .attr("y", function(d: string, i: number) { return -21 - 16 * (i%3); } )
          .attr("text-anchor", "middle")
          .attr("title", "Click to invert. Drag to reorder. Right click for options.") // TODO
          .classed("pplot-label", true);
      me.dimensions_dom.selectAll(".pplot-label").each(function(this: SVGForeignObjectElement, d: string) {
        foDynamicSizeFitContent(this, [-me.xscale(d) + 5, -me.xscale(d) + me.state.width - 5]);
      })

      // Add and store a brush for each axis.
      me.dimensions_dom.append("svg:g")
          .classed(style.brush, true)
          .classed("pplot-brush", true)
          .each(function(d) { d3.select(this).call(me.d3brush); })
        .selectAll("rect")
          .style("visibility", null)
          .append("title")
            .text("Drag up or down to brush along this axis");

      me.dimensions_dom.selectAll(".extent")
          .append("title")
            .text("Drag or resize this filter");
    };

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

    function brush_extends() {
      var extents = {};
      me.dimensions_dom.selectAll("." + style.brush).each(function(this: SVGGElement, dim: string) {
        extents[dim] = d3.brushSelection(this);
      });
      return extents;
    }

    function brush() {
      /**
       * Called whenever a brush happens. Recomputes which points are selected.
       */
      if (me.props.context_menu_ref !== undefined) {
        me.props.context_menu_ref.current.hide();
      }
      var extents = brush_extends();
      var actives = me.state.dimensions.filter(function(p) { return extents[p] !== null && extents[p] !== undefined; });

      // hack to hide ticks beyond extent
      me.dimensions_dom
        .each(function(dimension) {
          if (_.include(actives, dimension)) {
            var scale = me.yscale[dimension];
            var extent = extents[dimension];
            d3.select(this)
              .selectAll('text')
              .classed(style.tickSelected, true)
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
              .classed(style.tickSelected, false)
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
      var filters: Array<Filter> = actives.map(function(dimension) {
        const scale = me.yscale[dimension];
        var extent = extents[dimension];
        const range = scale_pixels_range(scale, extent);
        if (range.type == ParamType.CATEGORICAL && !range.values) {
          // Select nothing
          return {
            type: FilterType.Not,
            data: {
              type: FilterType.All,
              data: [],
            }
          };
        }
        var min, max;
        if (range.type == ParamType.CATEGORICAL) {
          if (range.values.length == 0) {
            return {
              type: FilterType.None,
              data: {}
            };
          }
          min = range.values[0];
          max = range.values[range.values.length - 1];
          console.assert(typeof min == typeof max, min, max);
        }
        else {
          min = Math.min(...range.range);
          max = Math.max(...range.range);
        }
        return {
          type: FilterType.Range,
          data: {
            col: dimension,
            type: range.type,
            min: min,
            max: max,
            include_infnans: range.include_infnans,
          }
        };
      });
      const selected = apply_filters(me.props.rows_filtered, filters);

      if (me.props.asserts) {
          // Check that pixel-based selected rows
          // match filters-based selected rows
          // But relax the verification a bit - math errors can happen
          // and we only require a 1 pixel precision
          var selected_pixels_minset = [];
          var selected_pixels_maxset = [];
          me.props.rows_filtered
            .forEach(function(d) {
              if (actives.every(function(dimension) {
                var scale = me.yscale[dimension];
                var extent = extents[dimension];
                var value = d[dimension];
                return extent[0] + 1 <= scale(value) && scale(value) <= extent[1] - 1;
              })) {
                selected_pixels_minset.push(d);
              }
              if (actives.every(function(dimension) {
                var scale = me.yscale[dimension];
                var extent = extents[dimension];
                var value = d[dimension];
                return extent[0] - 1 <= scale(value) && scale(value) <= extent[1] + 1;
              })) {
                selected_pixels_maxset.push(d);
              }
            });
          const missed = _.difference(selected_pixels_minset, selected);
          const overselected = _.difference(selected, selected_pixels_maxset);
          if (overselected.length || missed.length) {
              console.error(`Warning! Filter on ${actives.join(" ")} (`, filters, ") does not match actually selected rows",
                " Computed rows with filter:", selected,
                " Missed:", missed, " Falsely selected:", overselected);
              console.error("filters", filters, JSON.stringify(filters));
              if (missed.length) {
                console.error("first missed", JSON.stringify(missed[0]));
              }
              if (overselected.length) {
                console.error("first falsely selected", JSON.stringify(overselected[0]));
              }
          }
      }
      me.props.setSelected(selected, {
        type: FilterType.All,
        data: filters,
      });
    }


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

      // update axis placement
      me.axis = me.axis.ticks(1+me.state.height/50);
      div.selectAll("." + style.axis)
        .each(function(d: string) {
          d3.select(this).call(me.axis.scale(me.yscale[d]));
      });

      // render data
      this.setState(function(prevState) { return { brush_count: prevState.brush_count + 1}; });
    }, 100);

    me.compute_dimensions();
    redraw_axis();

    // Render full foreground
    brush();
    me.sendBrushExtents();

    // Trigger initial brush
    me.setState(function(prevState) { return { brush_count: prevState.brush_count + 1}; });

    me.pplot = {
      'redraw_axis': redraw_axis,
      'brush': brush,
    };
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
    var scale = create_d3_scale(pd);
    scale.range(range);
    scale.parallel_plot_axis = k;
    return scale;
  }

  compute_dimensions() {
    this.w = this.state.width - this.m[1] - this.m[3];
    this.h = this.state.height - this.m[0] - this.m[2];
    //@ts-ignore
    this.axis = d3.axisLeft(d3.scaleLinear() /* placeholder */).ticks(1+this.state.height/50);
    this.d3brush.extent([[-23, 0], [15, this.h]]).on("brush", this.onBrushChange).on("end", this.onBrushChange);
    // Scale chart and canvas height
    this.div.style("height", (this.state.height) + "px")

    this.div.selectAll("canvas")
        .attr("width", this.w)
        .attr("height", this.h)
        .style("padding", this.m.join("px ") + "px");
    this.xscale = d3.scalePoint().range([40, this.w - 40]).domain(this.state.dimensions);
    var me = this;
    this.state.dimensions.forEach(function(d: string) {
      me.setScaleRange(d);
    });
    this.highlighted.lineWidth = 4;
  }

  // transition ticks for reordering, rescaling and inverting
  update_ticks = function(d?: string, extent?) {
    var div = d3.select(this.root_ref.current);
    var me = this;
    // update brushes
    if (d) {
      var brush_el = d3.select(this.svg_ref.current).selectAll("." + style.brush)
          .filter(function(key) { return key == d; });
      this.d3brush.move(brush_el, extent);
    } else {
      // all ticks
      d3.select(this.svg_ref.current).selectAll("." + style.brush)
        .each(function(d) { d3.select(this).call(me.d3brush); })
    }

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
    me.setState(function(prevState) { return { brush_count: prevState.brush_count + 1}; });
  }.bind(this);

  // render a set of polylines on a canvas
  paths = function(selected: Array<Datapoint>, ctx: CanvasRenderingContext2D, count: number) {
    var me = this;
    var n = selected.length,
        i = 0,
        opacity = d3.min([2/Math.pow(n,0.3),1]),
        timer = (new Date()).getTime();

    var shuffled_data: Array<Datapoint> = _.shuffle(selected);

    ctx.clearRect(0,0,this.w+1,this.h+1);

    // Adjusts rendering speed
    function optimize(timer) {
      var delta = (new Date()).getTime() - timer;
      me.render_speed = Math.max(Math.ceil(me.render_speed * 30 / delta), 8);
      me.render_speed = Math.min(me.render_speed, 300);
      return (new Date()).getTime();
    }

    // render a batch of polylines
    function render_range(selection: Array<Datapoint>, i: number, max: number, opacity: number) {
      var s = selection.slice(i,max);
      s.forEach(function(d) {
        me.path(d, ctx, me.props.get_color_for_row(d, opacity));
      });
    };

    // render all lines until finished or a new brush event
    function animloop() {
      if (i >= n || count < me.state.brush_count) return true;
      var max = d3.min([i+me.render_speed, n]);
      render_range(shuffled_data, i, max, opacity);
      i = max;
      timer = optimize(timer);  // adjusts render_speed
    };
    if (this.animloop) {
      this.animloop.stop();
    }
    if (n > 0) {
      this.animloop = d3.timer(animloop);
    }
  }.bind(this);


  brush_clear_all(): void {
    // Reset brushes - but only trigger call to "brush" once
    this.d3brush.on("brush", null).on("end", null);
    this.d3brush.move(this.dimensions_dom.selectAll("." + style.brush), null);
    this.d3brush.on("brush", this.onBrushChange).on("end", this.onBrushChange);
    this.onBrushChange();
  }

  remove_axis(d: string): void {
    var pd = this.props.params_def[d];
    if (pd !== undefined) {
      this.setState(function(prevState, props) {
        var newHide = new Set(prevState.hide);
        newHide.add(d);
        return {
          hide: newHide
        };
      });
    }
    this.setState(function(ps, __) { return {
      dimensions: _.difference(ps.dimensions, [d])
    }});
  }

  can_restore_axis(d: string): boolean {
    const pd = this.props.params_def_unfiltered[d];
    return pd !== undefined && this.state.dimensions.indexOf(d) === -1 && !this.forceHideColumn(pd);
  }
  restore_axis(d: string): void {
    // Already displayed or not hidden
    if (!this.can_restore_axis(d)) {
      return;
    }
    this.setState(function(prevState) {
      var newHide = new Set(prevState.hide);
      newHide.delete(d);
      return {
        hide: newHide,
        dimensions: prevState.dimensions.concat([d])
      };
    });
  }
  path = function(this: ParallelPlot, d: Datapoint, ctx: CanvasRenderingContext2D, color?: string) {
    if (color) ctx.strokeStyle = color;
    var has_started = false;
    var x0: number, y0: number;
    this.state.dimensions.map(function(this: ParallelPlot, p: string) {
      var err = d[p] === undefined;
      if (!err && (d[p] == 'inf' || d[p] == '-inf') && this.props.params_def[p].numeric) {
        err = true;
      }
      var x = this.xscale(p),
          y = this.yscale[p](d[p]);
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
    }.bind(this));
    if (has_started) {
      ctx.lineTo(x0+15, y0);                               // right edge
      ctx.stroke();
    }
  }.bind(this);
}
