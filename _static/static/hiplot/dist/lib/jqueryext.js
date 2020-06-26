/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// From https://stackoverflow.com/questions/18743144/jquery-event-listen-on-position-changed
import $ from "jquery";
export function on_position_changed(obj, trigger, millis) {
    if (millis == null)
        millis = 100;
    var o = $(obj[0]); // our jquery object
    if (o.length < 1)
        return null;
    var lastPos = o.position();
    var lastOff = o.offset();
    var lastWidth = o.width();
    var lastOffWidth = o[0].offsetWidth;
    return setInterval(function () {
        if (o == null || o.length < 1)
            return o; // abort if element is non existend any more
        var newPos = o.position();
        var newOff = o.offset();
        var newWidth = o.width();
        var newOffWidth = o[0].offsetWidth;
        if (lastPos.top != newPos.top || lastPos.left != newPos.left) {
            o.trigger('onPositionChanged', { lastPos: lastPos, newPos: newPos });
            if (typeof (trigger) == "function")
                trigger(lastPos, newPos);
            lastPos = o.position();
        }
        if (lastOff.top != newOff.top || lastOff.left != newOff.left) {
            o.trigger('onPositionChanged', { lastOff: lastOff, newOff: newOff });
            if (typeof (trigger) == "function")
                trigger(lastOff, newOff);
            lastOff = o.offset();
        }
        if (lastWidth != newWidth) {
            o.trigger('onPositionChanged', { lastWidth: lastWidth, newWidth: newWidth });
            if (typeof (trigger) == "function")
                trigger(lastWidth, newWidth);
            lastWidth = o.width();
        }
        if (lastOffWidth != newOffWidth) {
            o.trigger('onPositionChanged', { lastOffWidth: lastOffWidth, newOffWidth: newOffWidth });
            if (typeof (trigger) == "function")
                trigger(lastOffWidth, newOffWidth);
            lastWidth = o.width();
        }
    }, millis);
}
;
