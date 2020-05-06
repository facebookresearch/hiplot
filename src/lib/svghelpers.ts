import * as d3 from "d3";
import { ParamDef } from "../infertypes";
import style from "../hiplot.css";
import { ContextMenu } from "../contextmenu";

export function foDynamicSizeFitContent(fo: SVGForeignObjectElement) {
    const w = Math.floor(fo.children[0].clientWidth + 2); // borders 2 px
    const h = Math.floor(fo.children[0].clientHeight + 2);
    const anchor = fo.getAttribute("text-anchor");
    if (anchor == "end") {
        fo.setAttribute("x", `${-w}`);
    } else if (anchor == "start") {
        fo.setAttribute("x", "0");
    } else if (anchor == "middle") {
        fo.setAttribute("x", `${- w / 2}`)
    }
    fo.style.width = `${w}px`;
    fo.style.height = `${h}px`;
    fo.style.overflow = "visible";
}

export function foCreateAxisLabel(pd: ParamDef, cm: React.RefObject<ContextMenu>): SVGForeignObjectElement {
    const fo = document.createElementNS('http://www.w3.org/2000/svg',"foreignObject");
    d3.select(fo).append("xhtml:span")
        .attr("class", pd.label_css)
        .classed("d-inline-block", true)
        .classed(style.label, true)
        .html(pd.name)
        .on("contextmenu", function() {
            if (cm !== undefined) {
                cm.current.show(d3.event.pageX, d3.event.pageY, pd.name);
            }
            d3.event.preventDefault();
            d3.event.stopPropagation();
        });
    return fo;
}
