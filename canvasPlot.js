/**
 * @author gjtool
 * @created 2022/01/13
 * @update 2025/06/18
 */
; (function (g, fn) {
    var version = "1.2.1";
    console.log("canvasPlot.js v" + version + "  https://www.gjtool.cn");
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return fn(g, version);
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = fn(g, version);
    } else {
        g.CanvasPlot = fn(g, version);
    }
})(typeof window !== 'undefined' ? window : this, function (g, version) {
    'use strict';
    function CanvasPlot(options) {
        if (Object.prototype.toString.call(options) !== '[object Object]') {
            throw Error("new CanvasPlot(options). Parameter 'options' must be an object.");
        }
        console.time("imgload");
        var sideLength = 10;
        var x, y, w, h;
        var canvas = document.createElement("canvas");
        this.version = version;

        var parentNode = options.parentNode instanceof HTMLElement ? options.parentNode : document.body;
        var deleteBtnText = options.deleteBtnText || "删除";
        var selectionBorderColor = options.selectionBorderColor || '#00ff00';
        var selectionBorderWidth = options.selectionBorderWidth || 1;
        var selectionRectColor = options.selectionRectColor || '#00ff00';
        var selectionFillColor = options.selectionFillColor || '#ffffff';
        var rectBgColor = options.rectBgColor || "rgba(255, 255, 255, 0)";
        var selectionDrawComplex = true;
        var borderColor = options.borderColor || "#0d0efd";
        var imagePath = options.imagePath || "";
        var showMenuBool = options.showMenu || false;
        var dragMoveButton = options.dragMoveButton || "middleClick"; //rightClick middleClick
        var maxScale = options.maxScale || 3.5;
        var minScale = options.minScale || 0.1;

        canvas.width = options.width || parentNode.offsetWidth;
        canvas.height = options.height || parentNode.offsetHeight;
        // canvas.style = options.border ? 'border: ' + options.border : 'border: 1px solid black';
        var dragStart, dragged, moveEnd = { x: canvas.width / 2, y: canvas.height / 2 };
        var old = parentNode.querySelector("canvas");
        if (old) {
            parentNode.removeChild(old);
        }
        parentNode.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        var styleBorderLeft = 0;
        var styleBorderTop = 0;
        if (g && g.getComputedStyle) {
            styleBorderLeft = parseFloat(g.getComputedStyle(canvas)['borderLeftWidth']) || 0;
            styleBorderTop = parseFloat(g.getComputedStyle(canvas)['borderTopWidth']) || 0;
        }
        var canvasLeft = getElementOffset(parentNode).offsetX;
        var canvasTop = getElementOffset(parentNode).offsetY;
        var html = document.body.parentNode;
        var htmlTop = html.offsetTop;
        var htmlLeft = html.offsetLeft;
        var valid = false;
        var plotCaches = [];

        var canvasDragZoom = true;
        var dragDrawing = false;
        var selection = null;
        var dragDrawOnce = false;
        var dragoffx = 0;
        var dragoffy = 0;
        var p1 = { x: 0, y: 0 };
        var p2 = { x: 0, y: 0 };

        var drawingType = options.drawingType || "rect";

        var drawingTypeList = ["rect", "circle", "text", "line", "cloudLine", "arrow", "polygon", "free"];

        var drawingText = false;

        var currentImage = null;
        var offscreenCanvas = null;
        var offscreenCtx = null;
        var rafId = null;
        var lastRenderTime = 0;
        var minRenderInterval = 16.66; // ~60fps
        var imageCache = {};
        var chunkImage = options.chunkImage || false; //是否开启图片分级处理
        var chunkSize = options.chunkSize || 512; //最小分级 从512px开始缓存一个级别图片
        var chunkRatio = options.chunkRatio || 0.5; //每缩放0.5比例切换缓存分级图片
        var chunkImgCaches = [];
        var pause = false;
        var eventType = {};
        var dragTL, dragTM, dragTR, dragRM, dragBL, dragBM, dragBR, dragLM;
        var _this = this;
        if (showMenuBool) {
            if (pause) return;
            var r_menu = document.createElement('div');
            r_menu.className = 'right_menu';
            r_menu.style.position = "absolute";
            r_menu.style.background = "#ffffff";
            r_menu.style.border = "solid 1px  #ebeef5";
            r_menu.style.display = "none";
            r_menu.style.borderRadius = "4px";
            r_menu.style.boxShadow = "0 2px 12px 0 rgb(0 0 0 / 10%)";
            parentNode.appendChild(r_menu);
            r_menu.addEventListener("click", function (e) {
                var li = e.target;
                if (li.nodeName.toLowerCase() === 'li') {
                    var index = li.getAttribute("index");
                    if (index == 0) {
                        _this.delPlot(selection);
                        selection = null;
                        r_menu.style.display = "none";
                    }
                    if (index == 1) {
                        r_menu.style.display = "none";
                    }
                }
            }, true);
        }
        var throttle = function (callback, limit = 30) {
            let lastCall = 0;
            return function () {
                const now = Date.now();
                if (now - lastCall >= limit) {
                    callback.apply(this, arguments);
                    lastCall = now;
                }
            };
        };
        canvas.addEventListener('selectstart', function (e) {
            e.preventDefault();
            return false;
        }, false);
        var contextmenu = function (e) {
            if (pause) return;
            e.preventDefault();
            if (r_menu) {
                r_menu.style.display = "none";
            }
            if (selection && selection.disabled) {
                return;
            }
            if (selection && (selection.dragging || selection.resizing)) {
                return;
            }
            if (drawingType === "rect") {
                var mouse = _this.getMouse(e);
                var mx = mouse.x;
                var my = mouse.y;
                var offset = getOffset();
                mx += offset.x;
                my += offset.y;
                if (showMenuBool) {
                    r_menu.style.display = "none";
                }
                var plots = plotCaches;
                var l = plots.length;
                var tmpSelected = false;
                for (var i = l - 1; i >= 0; i--) {
                    var plot = plots[i];
                    if (plot.contains(mx, my) && tmpSelected === false) {
                        if (plot.disabled) {
                            plot.selected = false;
                            plot.delselected = false;
                            valid = false;
                            selection = null;
                            return false;
                        }
                        selection = plot;
                        plot.selected = true;
                        plot.delselected = true;
                        valid = false;
                        tmpSelected = true;
                        if (showMenuBool) {
                            showMenu(e);
                        }
                        _this.fire("rightClick", e, selection);
                    } else {
                        plot.selected = false;
                        plot.delselected = false;
                        valid = false;
                    }
                }
                if (tmpSelected === false) {
                    selection = null;
                }
            }
            if (drawingType === "text") {
                var mouse = _this.getMouse(e);
                var mx = mouse.x;
                var my = mouse.y;
                var offset = getOffset();
                mx += offset.x;
                my += offset.y;
                if (showMenuBool) {
                    r_menu.style.display = "none";
                }
                var plots = plotCaches;
                var l = plots.length;
                var tmpSelected = false;
                for (var i = l - 1; i >= 0; i--) {
                    var plot = plots[i];
                    if (plot.contains(mx, my) && tmpSelected === false) {
                        if (plot.disabled) {
                            plot.selected = false;
                            plot.delselected = false;
                            valid = false;
                            selection = null;
                            return false;
                        }
                        selection = plot;
                        plot.selected = true;
                        plot.delselected = true;
                        valid = false;
                        tmpSelected = true;
                        if (showMenuBool) {
                            showMenu(e);
                        }
                        _this.fire("rightClick", e, selection);
                    } else {
                        plot.selected = false;
                        plot.delselected = false;
                        valid = false;
                    }
                }
                if (tmpSelected === false) {
                    selection = null;
                }
            }
            return false;
        };
        canvas.oncontextmenu = throttle(contextmenu);
        canvas.addEventListener('mousedown', mouseDownClick, true);
        var mousemove = function (e) {
            if (pause) return;
            if (e.button === 1) {
                return;
            }
            var mouse = _this.getMouse(e);
            var mx = mouse.x;
            var my = mouse.y;
            moveEnd.x = mx;
            moveEnd.y = my;
            if (selection && selection.disabled) {
                return;
            }
            if (drawingType === "rect") {
                var offset = getOffset();
                mx += offset.x;
                my += offset.y;
                if (selection && selection.dragging) {
                    selection.x = (mx - dragoffx) / offset.scale;
                    selection.y = (my - dragoffy) / offset.scale;
                    valid = false;
                    _this.fire("dragPlotMove", selection);
                } else {
                    this.style.cursor = 'auto';
                }
                if (selection && selection.resizing) {
                    mouseMoveSelected(e, selection);
                }
                var plots = plotCaches;
                var l = plots.length;
                for (var i = l - 1; i >= 0; i--) {
                    var plot = plots[i];
                    if (plot.contains(mx, my)) {
                        if (plot.disabled) {
                            return;
                        }
                        if (selection === plot) {
                            var state = plot.getCheckSideLengthResult(mx, my);
                            switch (state) {
                                case "topL":
                                    e.target.style.cursor = 'nw-resize';
                                    break;
                                case "topM":
                                    e.target.style.cursor = 'n-resize';
                                    break;
                                case "topR":
                                    e.target.style.cursor = 'ne-resize';
                                    break;
                                case "rightM":
                                    e.target.style.cursor = 'e-resize';
                                    break;
                                case "rightM":
                                    e.target.style.cursor = 'e-resize';
                                    break;
                                case "bottomL":
                                    e.target.style.cursor = 'sw-resize';
                                    break;
                                case "bottomM":
                                    e.target.style.cursor = 's-resize';
                                    break;
                                case "bottomR":
                                    e.target.style.cursor = 'se-resize';
                                    break;
                                case "leftM":
                                    e.target.style.cursor = 'w-resize';
                                    break;
                                default:
                                    this.style.cursor = 'move';
                                    break;
                            }
                        }
                        break;
                    }
                }
            }
            if (drawingType === "text") {
                var offset = getOffset();
                mx += offset.x;
                my += offset.y;
                if (selection && drawingText) {
                    selection.x = (mx - dragoffx) / offset.scale;
                    selection.y = (my - dragoffy) / offset.scale;
                    selection.selected = false;
                    this.style.cursor = 'auto';
                    valid = false;
                } else if (selection && selection.dragging) {
                    selection.x = (mx - dragoffx) / offset.scale;
                    selection.y = (my - dragoffy) / offset.scale;
                    valid = false;
                } else {
                    this.style.cursor = 'auto';
                }
                var plots = plotCaches;
                var l = plots.length;
                for (var i = l - 1; i >= 0; i--) {
                    var plot = plots[i];
                    if (selection === plot) {
                        plot.x = selection.x;
                        plot.y = selection.y;
                    }
                    if (plot.contains(mx, my)) {
                        if (plot.disabled) {
                            return;
                        }
                        if (selection === plot) {
                            var state = plot.getContainsTextResult(mx, my);
                            if (drawingText && dragDrawing) {
                                this.style.cursor = 'auto';
                            } else {
                                this.style.cursor = 'move';
                            }
                        }
                        break;
                    }
                }
            }
        };
        canvas.addEventListener('mousemove', throttle(mousemove), true);
        canvas.addEventListener('mouseup', function (e) {
            if (pause) return;
            if (e.button === 1) {
                return;
            }
            var mouse = _this.getMouse(e);
            var mx = mouse.x;
            var my = mouse.y;
            moveEnd.x = mx;
            moveEnd.y = my;
            if (canvasDragZoom && e.button === 2) {

            } else {
                if (selection && selection.disabled) {
                    return;
                }
                if (selection) {
                    selection.dragging = false;
                    selection.resizing = false;
                    if (drawingText && dragDrawing) {
                        drawingText = false;
                        dragDrawing = false;
                        canvas.style.cursor = 'auto';
                        selection = null;
                        return;
                    }
                    mouseUpSelected(e);
                }
            }
            this.style.cursor = 'auto';
        }, true);
        canvas.addEventListener('dblclick', function (e) {
            if (pause) return;
            if (e.button === 1) {
                return;
            }
            if (selection && selection.disabled) {
                return;
            }
            if (selection && (selection.dragging || selection.resizing)) {
                return;
            }
            _this.fire("dblclick", selection);
        }, true);
        var zoom = function (clicks) { //0.6
            if (pause) return;
            if (canvasDragZoom) {
                if (clicks == 1) return;
                var offset = getOffset();
                if (offset.scale <= minScale && clicks <= -0.6) {
                    return;
                }
                if (offset.scale >= maxScale && clicks >= 0.6) {
                    return;
                }
                var pt = ctx.transformedPoint(moveEnd.x, moveEnd.y);
                ctx.translate(pt.x, pt.y);
                var factor = Math.pow(1.1, clicks);
                ctx.scale(factor, factor);
                ctx.translate(-pt.x, -pt.y);
                var offset = getOffset();
                redraw();
                _this.fire("zoom", offset);
            }

        };

        var handleScroll = function (e) {
            if (pause) return;
            if (canvasDragZoom) {
                var delta = e.wheelDelta ? e.wheelDelta / 200 : e.detail ? -e.detail : 0;
                if (delta) zoom(delta);
                if (r_menu) {
                    r_menu.style.display = "none";
                }
                return e.preventDefault() && false;
            }
        };
        canvas.addEventListener('mousewheel', throttle(handleScroll), false);
        function redraw() {
            if (pause) return;
            _this.clear();
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            valid = false;
            _this.draw();
        }


        function trackTransforms(ctx) {
            if (pause) return;
            var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
            var xform = svg.createSVGMatrix();
            ctx.getTransform = function () { return xform; };

            var savedTransforms = [];
            var save = ctx.save;
            ctx.save = function () {
                if (canvasDragZoom) {
                    savedTransforms.push(xform.translate(0, 0));
                    return save.call(ctx);
                }
            };

            var restore = ctx.restore;
            ctx.restore = function () {
                if (canvasDragZoom) {
                    xform = savedTransforms.pop();
                    return restore.call(ctx);
                }
            };

            var scale = ctx.scale;
            ctx.scale = function (sx, sy) {
                if (canvasDragZoom) {
                    xform = xform.scaleNonUniform(sx, sy);
                    return scale.call(ctx, sx, sy);
                }
            };

            var rotate = ctx.rotate;
            ctx.rotate = function (radians) {
                if (canvasDragZoom) {
                    xform = xform.rotate(radians * 180 / Math.PI);
                    return rotate.call(ctx, radians);
                }
            };

            var translate = ctx.translate;
            ctx.translate = function (dx, dy) {
                if (canvasDragZoom) {
                    xform = xform.translate(dx, dy);
                    return translate.call(ctx, dx, dy);
                }
            };

            var transform = ctx.transform;
            ctx.transform = function (a, b, c, d, e, f) {
                if (canvasDragZoom) {
                    var m2 = svg.createSVGMatrix();
                    m2.a = a; m2.b = b; m2.c = c; m2.d = d; m2.e = e; m2.f = f;
                    xform = xform.multiply(m2);
                    return transform.call(ctx, a, b, c, d, e, f);
                }
            };

            var setTransform = ctx.setTransform;
            ctx.setTransform = function (a, b, c, d, e, f) {
                if (canvasDragZoom) {
                    xform.a = a;
                    xform.b = b;
                    xform.c = c;
                    xform.d = d;
                    xform.e = e;
                    xform.f = f;
                    return setTransform.call(ctx, a, b, c, d, e, f);
                }
            };

            var pt = svg.createSVGPoint();
            ctx.transformedPoint = function (x, y) {
                if (canvasDragZoom) {
                    pt.x = x; pt.y = y;
                    return pt.matrixTransform(xform.inverse());
                }
            };
        }

        function showMenu(e) {
            if (pause) return;
            var bounding = parentNode.getBoundingClientRect();
            var l = e.clientX - bounding.left;
            var t = e.clientY - bounding.top;

            e.cancelBubble = true;
            r_menu.innerHTML = '<ul style="margin: 0;padding: 10px 0;list-style: none;font-size:12px;"><li index="0" style="padding: 0px 10px;cursor: pointer;color:red;">' + deleteBtnText + '</li></ul>';
            r_menu.style.left = l + 'px';
            r_menu.style.top = t + 'px';
            r_menu.style.display = "block";
        }
        function mouseDrawRect(e) {
            if (pause) return;
            if (e.button === 1) {
                return;
            }
            if (!dragDrawing) {
                return;
            }
            var offset = getOffset();
            p2.x = e.offsetX;
            p2.y = e.offsetY;
            if (drawingType === 'rect') {
                var width = Math.abs(p1.x - p2.x);
                var height = Math.abs(p1.y - p2.y);
                _this.clear();
                ctx.beginPath();
                x = p1.x; y = p1.y;
                if (p2.x >= x) {
                    if (p2.y >= y) {
                        w = width;
                        h = height;
                    } else {
                        w = width;
                        h = -height;
                    }
                } else {
                    if (p2.y >= y) {
                        w = - width;
                        h = height;
                    } else {
                        w = - width;
                        h = - height;
                    }
                }


                valid = false;
                _this.draw();
                x += offset.x;
                y += offset.y;
                x = x / offset.scale;
                y = y / offset.scale;
                w = w / offset.scale;
                h = h / offset.scale;

                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = rectBgColor;
                ctx.fillRect(x, y, w, h);
                _this.fire("drawing", selection);
            }
            if (drawingType === 'text') {
                var width = Math.abs(p1.x - p2.x);
                var height = Math.abs(p1.y - p2.y);
                _this.clear();
                ctx.beginPath();
                x = p1.x; y = p1.y;
                if (p2.x >= x) {
                    if (p2.y >= y) {
                        w = width;
                        h = height;
                    } else {
                        w = width;
                        h = -height;
                    }
                } else {
                    if (p2.y >= y) {
                        w = - width;
                        h = height;
                    } else {
                        w = - width;
                        h = - height;
                    }
                }
                valid = false;
                _this.draw();
                x += offset.x;
                y += offset.y;
                x = x / offset.scale;
                y = y / offset.scale;
                w = w / offset.scale;
                h = h / offset.scale;
                _this.fire("drawing", selection);
            }
        }
        function mouseDrawCancel(e) {
            if (pause) return;
            if (e.button === 1) {
                return;
            }
            if (drawingType === "rect") {
                if (w < 0 || h < 0) {
                    x = x + w;
                    y = y + h;
                    w = -w;
                    h = -h;
                }
                if (x !== undefined && y !== undefined && w !== undefined && h !== undefined && w >= 5 && h >= 5) {
                    _this.addPlot({
                        x, y, w, h, color: rectBgColor, type: "rect"
                    });
                }
                plotCaches = deduplication(plotCaches);
                canvas.removeEventListener("mousemove", mouseDrawRect);
                if (dragDrawOnce) {
                    dragDrawing = false;
                }
                canvas.removeEventListener("mouseup", mouseDrawCancel);
                x = undefined; y = undefined; w = undefined; h = undefined;
                p1 = { x: 0, y: 0 };
                p2 = { x: 0, y: 0 };
            }
            if (drawingType === "text") {
                dragDrawing = false;
                drawingText = false;
                canvas.removeEventListener("mousemove", mouseDrawRect);
                canvas.removeEventListener("mouseup", mouseDrawCancel);
                x = undefined; y = undefined; w = undefined; h = undefined;
                p1 = { x: 0, y: 0 };
                p2 = { x: 0, y: 0 };
            }
            _this.fire("drawFinish", selection);

        }

        function mouseDownClick(e) {
            if (pause) return;
            selection = null;
            var rightClick = 2;
            var midddleClick = 1;
            if (dragMoveButton === "rightClick") {
                rightClick = 2;
                midddleClick = 1;
            } else if (dragMoveButton === "middleClick") {
                rightClick = 1;
                midddleClick = 2;
            }
            if (r_menu) {
                r_menu.style.display = "none";
            }
            if (e.button === midddleClick) {
                return;
            }
            var mouse = _this.getMouse(e);
            var mx = mouse.x;
            var my = mouse.y;
            moveEnd.x = mx;
            moveEnd.y = my;
            if (canvasDragZoom && e.button === rightClick) {
                var mouse = _this.getMouse(e);
                var mx = mouse.x;
                var my = mouse.y;
                document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
                dragStart = ctx.transformedPoint(mx, my);
                dragged = false;
                canvas.addEventListener("mousemove", mouseDragMove);
                canvas.addEventListener("mouseup", mouseDragMoveCancel);
            } else {
                var offset = getOffset();
                mx += offset.x;
                my += offset.y;
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = selectionBorderWidth;
                var plots = plotCaches;
                var l = plots.length;
                var tmpSelected = false;
                if (drawingType === "rect") {
                    for (var i = l - 1; i >= 0; i--) {
                        var plot = plots[i];
                        if (plot.contains(mx, my) && tmpSelected === false) {
                            if (plot.disabled) {
                                selection = null;
                                plot.delselected = false;
                                plot.selected = false;
                                valid = false;
                                return;
                            }
                            selection = plot;
                            selection.dragging = true;
                            dragoffx = mx - plot.x * offset.scale;
                            dragoffy = my - plot.y * offset.scale;
                            if (selection === plot) {
                                if (plots[i].getCheckSideLengthResult(mx, my)) {
                                    mouseDownSelected(e, plot);
                                    selection.resizing = true;
                                    selection.dragging = false;
                                } else {
                                    selection.resizing = false;
                                }
                            }
                            plot.delselected = false;
                            plot.selected = true;
                            valid = false;
                            tmpSelected = true;
                        } else {
                            plot.delselected = false;
                            plot.selected = false;
                            valid = false;
                        }
                    }
                    if (tmpSelected === false) {
                        selection = null;
                    }
                    if (selection) {
                        canvas.style.cursor = 'move';
                        _this.toTop(selection);
                    }
                    if (selection && (selection.dragging || selection.resizing)) {
                        return;
                    }
                    p1.x = e.offsetX;
                    p1.y = e.offsetY;
                    canvas.addEventListener("mousemove", mouseDrawRect);
                    canvas.addEventListener("mouseup", mouseDrawCancel);
                } else if (drawingType === "text") {
                    if (selection) {
                        if (!drawingText) {
                            canvas.style.cursor = 'move';
                            dragDrawing = true;
                        } else {
                            drawingText = false;
                            dragDrawing = false;
                            canvas.style.cursor = 'auto';
                            selection = null;
                            canvas.removeEventListener("mousemove", mouseDrawRect);
                            canvas.removeEventListener("mouseup", mouseDrawCancel);
                        }
                    } else {
                        for (var i = l - 1; i >= 0; i--) {
                            var plot = plots[i];
                            if (plot.contains(mx, my) && tmpSelected === false) {
                                if (plot.disabled) {
                                    selection = null;
                                    plot.delselected = false;
                                    plot.selected = false;
                                    valid = false;
                                    return;
                                }
                                selection = plot;
                                selection.dragging = true;
                                dragoffx = mx - plot.x * offset.scale;
                                dragoffy = my - plot.y * offset.scale;
                                if (selection === plot) {
                                    if (plots[i].getContainsTextResult(mx, my) && !drawingText) {
                                        mouseDownSelected(e, plot);
                                        selection.resizing = true;
                                        selection.dragging = true;
                                    } else {
                                        selection.resizing = false;
                                    }
                                }
                                plot.delselected = false;
                                plot.selected = true;
                                valid = false;
                                tmpSelected = true;

                            } else {
                                plot.delselected = false;
                                plot.selected = false;
                                valid = false;
                            }
                        }
                        if (tmpSelected === false) {
                            selection = null;
                        }
                        if (selection) {
                            canvas.style.cursor = 'auto';
                            _this.toTop(selection);
                        }
                        if (selection && (selection.dragging || selection.resizing)) {
                            return;
                        }
                        p1.x = e.offsetX;
                        p1.y = e.offsetY;
                        dragDrawing = true;
                        canvas.addEventListener("mousemove", mouseDrawRect);
                        canvas.addEventListener("mouseup", mouseDrawCancel);
                    }
                }
                else {
                    for (var i = l - 1; i >= 0; i--) {
                        var plot = plots[i];
                        if (plot.contains(mx, my) && tmpSelected === false) {
                            if (plot.disabled) {
                                selection = null;
                                plot.delselected = false;
                                plot.selected = false;
                                valid = false;
                                return;
                            }
                            selection = plot;
                            selection.dragging = true;
                            dragoffx = mx - plot.x * offset.scale;
                            dragoffy = my - plot.y * offset.scale;
                            if (selection === plot) {
                                if (plots[i].getContainsTextResult(mx, my)) {
                                    mouseDownSelected(e, plot);
                                    selection.resizing = true;
                                    selection.dragging = false;
                                } else {
                                    selection.resizing = false;
                                }
                            }
                            plot.delselected = false;
                            plot.selected = true;
                            valid = false;
                            tmpSelected = true;

                        } else {
                            plot.delselected = false;
                            plot.selected = false;
                            valid = false;
                        }
                    }
                    if (tmpSelected === false) {
                        selection = null;
                    }
                    if (selection) {
                        canvas.style.cursor = 'move';
                        _this.toTop(selection);
                    }
                    if (selection && (selection.dragging || selection.resizing)) {
                        return;
                    }
                    p1.x = e.offsetX;
                    p1.y = e.offsetY;
                    canvas.addEventListener("mousemove", mouseDrawRect);
                    canvas.addEventListener("mouseup", mouseDrawCancel);
                }
            }


        }
        function mouseDragMove(e) {
            if (pause) return;
            if (canvasDragZoom) {
                var mouse = _this.getMouse(e);
                var mx = mouse.x;
                var my = mouse.y;
                dragged = true;
                if (dragStart) {
                    var pt = ctx.transformedPoint(mx, my);
                    ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
                    redraw();
                }
            }

        }
        function mouseDragMoveCancel(e) {
            if (pause) return;
            drawingText = false;
            dragDrawing = false;
            if (canvasDragZoom) {
                _this.fire("dragMoveFinish", dragStart);
                dragStart = null;
                if (!dragged) zoom(e.shiftKey ? -1 : 1);
                canvas.removeEventListener("mousemove", mouseDragMove);
                canvas.removeEventListener("mouseup", mouseDragMoveCancel);
            }
        }
        function mouseDownSelected(e, plot) {
            if (pause) return;
            if (plot.disabled) {
                return;
            }
            var offset = getOffset();
            var mouse = _this.getMouse(e);
            var mouseX = mouse.x + offset.x;
            var mouseY = mouse.y + offset.y;
            if (drawingType === "rect") {

                var state = plot.getCheckSideLengthResult(mouseX, mouseY);
                switch (state) {
                    case "topL":
                        dragTL = true;
                        e.target.style.cursor = 'nw-resize';
                        break;
                    case "topM":
                        dragTM = true;
                        e.target.style.cursor = 'n-resize';
                        break;
                    case "topR":
                        dragTR = true;
                        e.target.style.cursor = 'ne-resize';
                        break;
                    case "rightM":
                        dragRM = true;
                        e.target.style.cursor = 'e-resize';
                        break;
                    case "rightM":
                        dragRM = true;
                        e.target.style.cursor = 'e-resize';
                        break;
                    case "bottomL":
                        dragBL = true;
                        e.target.style.cursor = 'sw-resize';
                        break;
                    case "bottomM":
                        dragBM = true;
                        e.target.style.cursor = 's-resize';
                        break;
                    case "bottomR":
                        dragBR = true;
                        e.target.style.cursor = 'se-resize';
                        break;
                    case "leftM":
                        dragLM = true;
                        e.target.style.cursor = 'w-resize';
                        break;
                    default:
                        break;

                }
                valid = false;
            }

        };
        function mouseUpSelected(e) {
            if (pause) return;
            if (drawingType === "rect") {
                dragTL = dragTM = dragTR = dragRM = dragBL = dragBM = dragBR = dragLM = false;
            }
            _this.fire("select", selection);
        };
        function mouseMoveSelected(e, plot) {
            if (pause) return;
            var offset = getOffset();
            var mouse = _this.getMouse(e);
            var mouseX = (mouse.x + offset.x) / offset.scale;
            var mouseY = (mouse.y + offset.y) / offset.scale;
            var rx = plot.x;
            var ry = plot.y;
            var rw = plot.w;
            var rh = plot.h;
            if (drawingType === "rect") {
                if (dragTL) {
                    e.target.style.cursor = 'nw-resize';
                    if (((rx + rw) - mouseX) < 0) {
                        dragTL = false;
                        dragTR = true;
                    }
                    if (((ry + rh) - mouseY) < 0) {
                        dragTL = false;
                        dragBL = true;
                    }
                    plot.w += rx - mouseX;
                    plot.h += ry - mouseY;
                    plot.x = mouseX;
                    plot.y = mouseY;
                }
                else if (dragTM) {
                    e.target.style.cursor = 'n-resize';
                    if ((rx - mouseX) > 0) {
                        dragTM = false;
                        dragBM = true;
                    }
                    if (((ry + rh) - mouseY) < 0) {
                        dragTM = false;
                        dragBM = true;
                    }
                    plot.h += ry - mouseY;
                    plot.y = mouseY;
                }
                else if (dragTR) {
                    e.target.style.cursor = 'ne-resize';
                    if ((rx - mouseX) > 0) {
                        dragTR = false;
                        dragTL = true;
                    }
                    if (((ry + rh) - mouseY) < 0) {
                        dragTR = false;
                        dragBR = true;
                    }
                    plot.w = Math.abs(rx - mouseX);
                    plot.h += ry - mouseY;
                    plot.y = mouseY;
                }
                else if (dragRM) {
                    e.target.style.cursor = 'e-resize';
                    if ((rx - mouseX) > 0) {
                        dragRM = false;
                        dragLM = true;
                    }
                    if (((ry + rh) - mouseY) < 0) {
                        dragRM = false;
                        dragLM = true;
                    }
                    plot.w += (mouseX - rx - rw);
                }
                else if (dragBL) {
                    e.target.style.cursor = 'sw-resize';
                    if (((rx + rw) - mouseX) < 0) {
                        dragBL = false;
                        dragBR = true;
                    }
                    if ((ry - mouseY) > 0) {
                        dragBL = false;
                        dragTL = true;
                    }
                    plot.w += rx - mouseX;
                    plot.h = Math.abs(ry - mouseY);
                    plot.x = mouseX;
                }
                else if (dragBM) {
                    e.target.style.cursor = 's-resize';
                    if ((rx - mouseX) > 0) {
                        dragBM = false;
                        dragTM = true;
                    }
                    if ((ry - mouseY) > 0) {
                        dragBM = false;
                        dragTM = true;
                    }
                    plot.h += (mouseY - ry - rh);
                }
                else if (dragBR) {
                    e.target.style.cursor = 'se-resize';
                    if ((rx - mouseX) > 0) {
                        dragBR = false;
                        dragBL = true;
                    }
                    if ((ry - mouseY) > 0) {
                        dragBR = false;
                        dragTR = true;
                    }
                    plot.w = Math.abs(rx - mouseX);
                    plot.h = Math.abs(ry - mouseY);
                }
                else if (dragLM) {
                    e.target.style.cursor = 'w-resize';
                    if (((rx + rw) - mouseX) < 0) {
                        dragLM = false;
                        dragRM = true;
                    }
                    if (((ry + rh) - mouseY) < 0) {
                        dragLM = false;
                        dragRM = true;
                    }
                    plot.w += rx - mouseX;
                    plot.x = mouseX;
                }
                valid = false;
                _this.fire("drawMove", selection);
            }
            if (drawingType === "text") {
                valid = false;
                _this.fire("drawMove", selection);
            }
        };
        function getOffset() {
            var xform = ctx.getTransform();
            return {
                scale: xform.d,
                x: -xform.e,
                y: -xform.f
            };
        }
        CanvasPlot.prototype.getOffset = getOffset;

        function setOffset(offset) {
            if (pause) return;
            ctx.setTransform(offset.scale, 0, 0, offset.scale, -offset.x, -offset.y);
            redraw();
        }

        CanvasPlot.prototype.setOffset = setOffset;

        CanvasPlot.prototype.destroy = function () {
            // 清除动画循环
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            this.clear();
            parentNode.removeChild(canvas);
            plotCaches = [];
            canvasDragZoom = true;
            dragDrawing = false;
            selection = null;
            dragDrawOnce = false;
            dragoffx = 0;
            dragoffy = 0;
            p1 = { x: 0, y: 0 };
            p2 = { x: 0, y: 0 };
            drawingType = undefined;
            currentImage = null;
            offscreenCanvas = null;
            offscreenCtx = null;
            imageCache = null;
            offscreenCanvas = null;
            offscreenCtx = null;
            eventType = {};
            dragTL = dragTM = dragTR = dragRM = dragBL = dragBM = dragBR = dragLM = false;
        };

        CanvasPlot.prototype.render = function () {
            var _this = this;
            // 清除之前的动画循环
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (pause) return;
            // 使用 requestAnimationFrame 实现动画循环
            function animate(timestamp) {
                // 限制绘制频率（最多60fps）
                if (timestamp - lastRenderTime >= minRenderInterval) {
                    var offset = getOffset();
                    if (offset && offset.scale >= 3) {
                        ctx.imageSmoothingQuality = 'high';
                    } else if (offset && offset.scale >= 1) {
                        ctx.imageSmoothingQuality = 'medium';
                    } else {
                        ctx.imageSmoothingQuality = 'low';
                    }
                    _this.draw();
                    lastRenderTime = timestamp;
                }
                // 继续动画循环
                rafId = requestAnimationFrame(animate);
            }
            // 启动动画循环
            rafId = requestAnimationFrame(animate);
        };
        CanvasPlot.prototype.resize = function () {
            if (pause) return;
            canvas.width = options.width || parentNode.offsetWidth;
            canvas.height = options.height || parentNode.offsetHeight;
            this.render();
            var offset = getOffset();
            setOffset(offset);

        };
        CanvasPlot.prototype.getData = function () {
            return {
                offset: getOffset(),
                data: plotCaches
            };
        };
        CanvasPlot.prototype.setData = function (obj) {
            if (obj.offset) {
                setOffset(obj.offset);
            }
            if (obj.data) {
                for (var i = 0; i < obj.data.length; i++) {
                    obj.data[i].color = obj.data[i].color || rectBgColor;
                    this.addRect(obj.data[i]);
                }
            }
            setTimeout(() => {
                if (obj.offset) {
                    setOffset(obj.offset);
                }
            }, 300);
        };
        CanvasPlot.prototype.getPlotCaches = function () {
            return plotCaches;
        };
        CanvasPlot.prototype.getSelection = function () {
            return selection;
        };

        var createImageCacheLevels = function (img) {
            chunkImgCaches = [];
            const maxDimension = Math.max(img.width, img.height);
            let level = 0;
            while (chunkSize < maxDimension) {
                const canvas = document.createElement('canvas');
                const canvasCtx = canvas.getContext('2d');
                const ratio = chunkSize / maxDimension;
                const scale = img.width / img.height;
                canvas.width = img.width * ratio;
                canvas.height = canvas.width / scale;

                canvasCtx.drawImage(img, 0, 0, img.width, img.height,
                    0, 0, canvas.width, canvas.height);
                level++;
                chunkImgCaches.push({
                    size: chunkSize,
                    chunkImg: canvas,
                    with: canvas.width,
                    height: canvas.height,
                    ratio: ratio,
                    level: level
                });

                chunkSize *= 2; // 每次尺寸翻倍
            }
            level++;
            // 添加原始尺寸作为最后一级
            chunkImgCaches.push({
                size: 'original',
                chunkImg: img,
                with: img.width,
                height: img.height,
                ratio: 1,
                level: level
            });
            console.log("chunkImgCaches", chunkImgCaches);
            return chunkImgCaches;
        };

        var getBestImageCacheLevel = function () {
            if (!currentImage || !currentImage.cachedLevels) return null;
            var offset = getOffset();
            // 根据当前缩放比例选择合适的缓存级别
            const viewportScale = offset.scale;
            const length = currentImage.cachedLevels.length;
            let bestLevel = currentImage.cachedLevels[0];
            for (const level of currentImage.cachedLevels) {
                if (level.ratio >= viewportScale * chunkRatio) {
                    bestLevel = level;
                    break;
                }
            }
            if (viewportScale > 1) {
                bestLevel = currentImage.cachedLevels[length - 1];
            }
            return bestLevel;
        };
        CanvasPlot.prototype.getChunkImgCaches = function () {
            return chunkImgCaches;
        };
        CanvasPlot.prototype.getCurrentImage = function () {
            return currentImage;
        };
        CanvasPlot.prototype.getCanvas = function () {
            return canvas;
        };
        CanvasPlot.prototype.getCtx = function () {
            return ctx;
        };
        CanvasPlot.prototype.addImage = function (url, x, y) {

        };
        CanvasPlot.prototype.setImage = function (url, x, y) {
            if (chunkImage) {
                const imgCache = getBestImageCacheLevel();
                if (imgCache && imgCache.chunkImg) {
                    if (x !== undefined && y !== undefined) {
                        ctx.drawImage(imgCache.chunkImg, x, y, currentImage.original.width, currentImage.original.height);
                    } else {
                        ctx.drawImage(imgCache.chunkImg, 10, 10, currentImage.original.width, currentImage.original.height);
                    }
                } else {
                    var img = new Image();
                    img.src = url;
                    img.onload = function () {
                        img.loaded = true;
                        imagePath = url;
                        // 创建多级缓存
                        imageCache[url] = {
                            original: img,
                            cachedLevels: createImageCacheLevels(img)
                        };
                        currentImage = imageCache[url];
                        const imgCache1 = getBestImageCacheLevel();
                        if (!imgCache1) return;
                        if (x !== undefined && y !== undefined) {
                            ctx.drawImage(imgCache1.chunkImg, x, y, currentImage.original.width, currentImage.original.height);
                        } else {
                            ctx.drawImage(imgCache1.chunkImg, 10, 10, currentImage.original.width, currentImage.original.height);
                        }
                        valid = false;
                        _this.fire("imageLoad", {
                            state: "success",
                            msg: img
                        });
                        console.timeEnd("imgload");
                    };
                    img.onerror = function (err) {
                        _this.fire("imageLoad", {
                            state: "error",
                            msg: err
                        });
                    };
                }
            } else {
                if (currentImage && currentImage.loaded && offscreenCanvas) {
                    if (x !== undefined && y !== undefined) {
                        ctx.drawImage(offscreenCanvas, x, y);
                    } else {
                        ctx.drawImage(offscreenCanvas, 10, 10);
                    }
                } else {
                    var img = new Image();
                    img.src = url;
                    img.onload = function () {
                        img.loaded = true;
                        imagePath = url;
                        currentImage = img;
                        if (!offscreenCanvas) {
                            offscreenCanvas = document.createElement("canvas");
                            offscreenCanvas.width = img.width;
                            offscreenCanvas.height = img.height;
                            offscreenCtx = offscreenCanvas.getContext('2d');
                            if (x !== undefined && y !== undefined) {
                                offscreenCtx.drawImage(img, x, y);
                            } else {
                                offscreenCtx.drawImage(img, 10, 10);
                            }
                        }
                        if (x !== undefined && y !== undefined) {
                            ctx.drawImage(offscreenCanvas, x, y);
                        } else {
                            ctx.drawImage(offscreenCanvas, 10, 10);
                        }
                        _this.fire("imageLoad", {
                            state: "success",
                            msg: img
                        });
                        console.timeEnd("imgload");
                    };
                    img.onerror = function (err) {
                        _this.fire("imageLoad", {
                            state: "error",
                            msg: err
                        });
                    };
                }
            }

        };
        CanvasPlot.prototype.toTop = function (item) {
            var plots = plotCaches;
            var l = plots.length;
            for (var i = l - 1; i >= 0; i--) {
                var plot = plots[i];
                if (item === plot) {
                    plots.splice(i, 1);
                    break;
                }
            };
            item.index = l - 1;
            plotCaches.push(item);
        };

        CanvasPlot.prototype.addPlot = function (options) {
            var type = options.type;
            switch (type) {
                case "rect":
                    this.addRect(options);
                    break;
                case "text":
                    this.addText(options);
                    break;
                default:
                    this.addRect(options);
                    break;
            }

        };
        CanvasPlot.prototype.delPlot = function (item) {
            if (item === undefined) {
                plotCaches = [];
                valid = false;
                _this.fire("removeAll");
                return;
            }
            var plots = plotCaches;
            var l = plots.length;
            for (var i = l - 1; i >= 0; i--) {
                var plot = plots[i];
                if (item.uuid === plot.uuid) {
                    plots.splice(i, 1);
                    break;
                }
            }
            valid = false;
            _this.fire("removePlot", item);
        };
        CanvasPlot.prototype.getPlotById = function (id) {
            var plots = plotCaches;
            var l = plots.length;
            var plot;
            for (var i = l - 1; i >= 0; i--) {
                if (id === plot.uuid) {
                    plot = plots[i];
                    break;
                }
            }
            return plot;
        };
        CanvasPlot.prototype.selectPlot = function (item, flag) {
            if (item === undefined) {
                plotCaches = [];
                valid = false;
                _this.fire("removeAll");
                return;
            }
            var plots = plotCaches;
            var l = plots.length;
            for (var i = l - 1; i >= 0; i--) {
                var plot = plots[i];
                if (!flag) {
                    plot.selected = false;
                }
                if (item.uuid === plot.uuid) {
                    plot.selected = true;
                }
            }
            valid = false;
            _this.fire("removePlot", item);
        };
        CanvasPlot.prototype.flyToPlot = function (item, num) {
            if (Object.prototype.toString.call(item) === '[object String]') {
                item = this.getPlotById(item);
            }
            if (Object.prototype.toString.call(item) === '[object Object]') {
                if (item.uuid) {
                    var offset = getOffset();
                    var targetScale = num ? num : offset.scale;
                    let scaledCenterX = (item.x + item.w / 2) * targetScale;
                    let scaledCenterY = (item.y + item.h) * targetScale;
                    let canvasCenterX = canvas.width / 2;
                    let canvasCenterY = canvas.height / 2;
                    offset.x = scaledCenterX - canvasCenterX;
                    offset.y = scaledCenterY - canvasCenterY;
                    offset.scale = targetScale;
                    setOffset(offset);
                }
            }
        };
        CanvasPlot.prototype.addRect = function (options) {
            let obj = new Rect(options);
            if (options.selected) {
                selection = obj;
            }
            plotCaches.push(obj);
            valid = false;
        };
        CanvasPlot.prototype.addText = function (options) {
            let obj = new Text(options);
            if (drawingText && options.x === undefined) {
                selection = obj;
            } else {
                drawingText = false;
                dragDrawing = false;
            }
            if (options.selected) {
                selection = obj;
            }
            plotCaches.push(obj);
            valid = false;
        };
        CanvasPlot.prototype.clear = function () {
            var pt1 = ctx.transformedPoint(0, 0);
            var pt2 = ctx.transformedPoint(canvas.width, canvas.height);
            ctx.clearRect(pt1.x, pt1.y, pt2.x - pt1.x, pt2.y - pt1.y);
        };
        CanvasPlot.prototype.changeBgColor = function (color) {
            var color = color ? color : "#ffffff";
            ctx.fillStyle = color;
        };
        CanvasPlot.prototype.draw = function () {
            if (pause) return;
            if (!valid) {
                var offset = getOffset();
                var plots = plotCaches;
                this.clear();
                if (imagePath) {
                    this.setImage(imagePath);
                }
                var l = plots.length;
                for (var i = 0; i < l; i++) {
                    var plot = plots[i];
                    plot.index = i;
                    if (selection !== plot) {
                        if (plot.x === undefined || plot.y === undefined || (plot.type !== "text" && (plot.w === undefined || plot.h === undefined))) {
                            continue;
                        };
                        plots[i].draw(ctx);

                    }
                }
                if (selection !== null) {
                    selection.draw(ctx);
                }
                valid = true;
            }
        };
        function getTranslate(element) {
            var translate = document.defaultView.getComputedStyle(element).transform;
            if (translate !== "none") {
                var str = translate.replace(")", "");
                var arr = str.split(",");
                return {
                    l: Number(arr[arr.length - 2]),
                    t: Number(arr[arr.length - 1]),
                    flag: true
                };
            } else {
                return {
                    l: 0,
                    t: 0
                };
            }
        }
        function getElementOffset(element) {
            var offsetX = 0,
                offsetY = 0;
            var flag = false;
            if (element.offsetParent !== undefined) {
                do {
                    var l = getTranslate(element).l;
                    var t = getTranslate(element).t;
                    offsetX += element.offsetLeft;
                    offsetY += element.offsetTop;
                    if (!isNaN(l) && !isNaN(t)) {
                        offsetX += (-l);
                        offsetY += (-t);
                    }
                    if (getTranslate(element).flag) {
                        flag = true;
                    }
                } while ((element = element.offsetParent));
            }
            return {
                offsetX: offsetX,
                offsetY: offsetY,
                flag: flag
            };
        }
        function getOffsetLeftTop() {
            var offsetX = getElementOffset(canvas).offsetX;
            var offsetY = getElementOffset(canvas).offsetY;
            var flag = getElementOffset(canvas).flag;
            return {
                left: canvasLeft - offsetX,
                top: canvasTop - offsetY,
                offsetX: offsetX,
                offsetY: offsetY,
                flag: flag
            };
        }
        CanvasPlot.prototype.getMouse = function (e) {
            var left = getOffsetLeftTop().left;
            var top = getOffsetLeftTop().top;
            var offsetX = getOffsetLeftTop().offsetX;
            var offsetY = getOffsetLeftTop().offsetY;
            var flag = getOffsetLeftTop().flag;
            offsetX += styleBorderLeft + htmlLeft;
            offsetY += styleBorderTop + htmlTop;
            var mx = 0, my = 0;
            if (flag) {
                mx = e.pageX - offsetX - left;
                my = e.pageY - offsetY - top;
            } else {
                mx = e.pageX - offsetX + left;
                my = e.pageY - offsetY + top;
            }

            return {
                x: mx,
                y: my
            };
        };
        CanvasPlot.prototype.screenshot = function (type) {
            type = type || "png";
            return canvas.toDataURL("image/" + type);
        };
        CanvasPlot.prototype.downLoad = function (type) {
            var oA = document.createElement("a");
            oA.download = '';
            oA.href = this.screenshot(type);
            document.body.appendChild(oA);
            oA.click();
            document.body.removeChild(oA);
        };
        CanvasPlot.prototype.pause = function () {
            pause = true;
            // 清除动画循环
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
        CanvasPlot.prototype.resume = function () {
            pause = false;
            this.render();
        };
        CanvasPlot.prototype.on = function (type, callback, flag) {
            if (Object.prototype.toString.call(callback) !== "[object Function]") {
                throw Error("CanvasPlot.on('" + type + "',fn). Parameter 'fn' must be a function.");
            }
            if (flag === true) {
                eventType[type] = [callback];
            } else if (eventType[type] && eventType[type] instanceof Array) {
                eventType[type].push(callback);
            } else {
                eventType[type] = [callback];
            }
        };
        CanvasPlot.prototype.off = function (type, func) {
            if (type === true) {
                return eventType = {};
            }
            if (Object.prototype.toString.call(func) !== "[object Function]") {
                return eventType[type] = [];
            }
            if (eventType[type] && eventType[type] instanceof Array) {
                var handlers = eventType[type];
                var index = handlers.indexOf(func);
                if (index > -1) {
                    return handlers.splice(index, 1);
                }
            }
        };
        CanvasPlot.prototype.fire = function (type, state, state1, state2) {
            var handlers = eventType[type];
            if (handlers && handlers instanceof Array) {
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i] && handlers[i].call(this, state, state1, state2);
                }
            }
        };
        CanvasPlot.prototype.drawRectBegin = function (bool) {
            dragDrawing = true;
            drawingText = false;
            drawingType = "rect";
            dragDrawOnce = bool || false;
        };
        CanvasPlot.prototype.drawRectFinish = function () {
            dragDrawing = false;
            drawingType = undefined;
        };
        CanvasPlot.prototype.setCanvasDragZoom = function (bool) {
            canvasDragZoom = bool;
        };
        CanvasPlot.prototype.attrRect = function (obj) {
            for (var i = 0; i < plotCaches.length; i++) {
                for (var k in obj) {
                    plotCaches[i][k] = obj[k];
                }
            }
        };
        CanvasPlot.prototype.drawTextBegin = function () {
            dragDrawing = true;
            drawingText = true;
            drawingType = "text";
            dragDrawOnce = true;
        };
        CanvasPlot.prototype.drawTextFinish = function () {
            dragDrawing = false;
            drawingText = false;
            drawingType = undefined;
        };
        CanvasPlot.prototype.attrText = function (obj) {
            for (var i = 0; i < plotCaches.length; i++) {
                for (var k in obj) {
                    plotCaches[i][k] = obj[k];
                }
            }
        };
        var Rect = function (options) {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.w = options.w || 1;
            this.h = options.h || 1;
            this.fill = options.color === undefined ? 'rgba(255, 255, 255, 0)' : options.color;
            this.strokeColor = options.borderColor === undefined ? borderColor : options.borderColor;
            this.lineWidth = options.borderWidth !== undefined ? options.borderWidth : 1;
            this.selected = options.selected || false;
            this.delselected = options.delselected || false;
            this.sideLength = sideLength;
            this.rectColor = options.rectColor || selectionRectColor;
            this.fillColor = options.fillColor || selectionFillColor;
            this.selectionBorderColor = options.selectionBorderColor || selectionBorderColor;
            this.disabled = options.disabled || false;
            this.dragging = false;
            this.resizing = false;
            this.index = options.index || 0;
            this.type = "rect";
            this.uuid = options.uuid || createID();
            this.params = options.params || null;
        };
        Rect.prototype.draw = function (ctx) {
            ctx.fillStyle = this.fill;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            if (this.lineWidth && !this.selected) {
                if (this.delselected) {
                    ctx.strokeStyle = "#ff0000";
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = this.strokeColor;
                    ctx.lineWidth = this.lineWidth;
                }
                ctx.strokeRect(this.x, this.y, this.w, this.h);
            } else if (this.selected) {
                ctx.strokeStyle = this.selectionBorderColor || selectionBorderColor;
                ctx.lineWidth = selectionBorderWidth;
                ctx.strokeRect(this.x, this.y, this.w, this.h);
                if (dragDrawing) {
                    this.drawHandles(ctx);
                }
            }
        };
        Rect.prototype.drawHandles = function (ctx) {
            //  top left 
            drawRectWithBorder(this.x, this.y, this.sideLength, ctx, this.rectColor, this.fillColor);
            //  top right 
            drawRectWithBorder(this.x + this.w, this.y, this.sideLength, ctx, this.rectColor, this.fillColor);
            // bottom left 
            drawRectWithBorder(this.x, this.y + this.h, this.sideLength, ctx, this.rectColor, this.fillColor);
            // bottom right 
            drawRectWithBorder(this.x + this.w, this.y + this.h, this.sideLength, ctx, this.rectColor, this.fillColor);

            if (selectionDrawComplex) {
                //  top middle 
                drawRectWithBorder(this.x + this.w / 2, this.y, this.sideLength, ctx, this.rectColor, this.fillColor);
                //   right middle
                drawRectWithBorder(this.x + this.w, this.y + this.h / 2, this.sideLength, ctx, this.rectColor, this.fillColor);
                // left middle
                drawRectWithBorder(this.x, this.y + this.h / 2, this.sideLength, ctx, this.rectColor, this.fillColor);
                // bottom middle 
                drawRectWithBorder(this.x + this.w / 2, this.y + this.h, this.sideLength, ctx, this.rectColor, this.fillColor);
            }

        };
        Rect.prototype.contains = function (mx, my) {
            if (this.getCheckSideLengthResult(mx, my)) {
                return true;
            }
            if (this.getContainsRectResult(mx, my) === true) {
                return true;
            }
        };
        Rect.prototype.getContainsRectResult = function (mx, my) {
            var left = getOffsetLeftTop().left;
            var top = getOffsetLeftTop().top;

            var offset = getOffset();
            var width = this.w * offset.scale;
            var height = this.h * offset.scale;
            var rx = this.x * offset.scale + left;
            var ry = this.y * offset.scale + top;
            var xBool = false;
            var yBool = false;
            if (width >= 0) {
                xBool = (rx <= mx) && (rx + width >= mx);
            } else {
                xBool = (rx >= mx) && (rx + width <= mx);
            }
            if (height >= 0) {
                yBool = (ry <= my) && (ry + height >= my);
            } else {
                yBool = (ry >= my) && (ry + height <= my);
            }
            return (xBool && yBool);
        };
        Rect.prototype.getCheckSideLengthResult = function (mx, my) {
            var left = getOffsetLeftTop().left;
            var top = getOffsetLeftTop().top;
            var offset = getOffset();
            var width = this.w * offset.scale;
            var height = this.h * offset.scale;
            var sideLength = this.sideLength * offset.scale;
            var rx = this.x * offset.scale + left;
            var ry = this.y * offset.scale + top;
            if (checkDirection(mx, my, rx, ry, sideLength)) {
                return "topL";
            } else if (selectionDrawComplex && checkDirection(mx, my, rx + width / 2, ry, sideLength)) {
                return "topM";
            } else if (checkDirection(mx, my, rx + width, ry, sideLength)) {
                return "topR";
            } else if (selectionDrawComplex && checkDirection(mx, my, rx + width, ry + height / 2, sideLength)) {
                return "rightM";
            } else if (checkDirection(mx, my, rx, ry + height, sideLength)) {
                return "bottomL";
            } else if (selectionDrawComplex && checkDirection(mx, my, rx + width / 2, ry + height, sideLength)) {
                return "bottomM";
            } else if (checkDirection(mx, my, rx + width, ry + height, sideLength)) {
                return "bottomR";
            } else if (selectionDrawComplex && checkDirection(mx, my, rx, ry + height / 2, sideLength)) {
                return "leftM";
            }
        };

        var Text = function (options) {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.bold = options.bold === undefined ? '' : 'bold';
            this.fontSize = options.fontSize || 16;
            this.fontFamily = options.fontFamily || "Arial"; // "Microsoft YaHei", sans-serif
            this.text = options.text || "这是文本";
            this.fillColor = options.fillColor === undefined ? 'rgba(0, 0, 0, 1)' : options.fillColor;
            this.strokeColor = options.strokeColor === undefined ? 'rgba(0, 0, 0, 1)' : options.strokeColor;
            this.selected = options.selected || false;
            this.delselected = options.delselected || false;
            this.disabled = options.disabled || false;
            this.fill = options.fill === undefined ? true : options.fill;
            this.stroke = options.stroke === undefined ? false : options.stroke;
            this.textAlign = options.textAlign || "left";   // 水平对齐：left | center | right
            this.textBaseline = options.textBaseline || "top"; // 垂直对齐：top | middle | bottom
            this.shadowColor = options.shadowColor || 'rgba(0,0,0,0)';
            this.shadowBlur = options.shadowBlur || 10;
            this.shadowOffsetX = options.shadowOffsetX || 5;
            this.shadowOffsetY = options.shadowOffsetY || 5;
            this.index = options.index || 0;
            this.type = "text";
            this.uuid = options.uuid || createID();
            this.params = options.params || null;
        };
        Text.prototype.draw = function (ctx) {
            ctx.font = this.bold + '' + this.fontSize + 'px ' + this.fontFamily;
            ctx.fillStyle = this.fillColor;
            ctx.strokeColor = this.strokeColor;
            ctx.textAlign = this.textAlign;
            ctx.textBaseline = this.textBaseline;
            if (this.selected) {
                ctx.fillStyle = selectionBorderColor;
                ctx.strokeStyle = selectionBorderColor;
            } else {
                ctx.fillStyle = this.fillColor;
                ctx.strokeStyle = this.strokeColor;
            }
            if (this.delselected) {
                ctx.fillStyle = "#ff0000";
                ctx.strokeStyle = "#ff0000";
            }
            if (this.fill) {
                ctx.fillText(this.text, this.x, this.y);
            }
            if (this.stroke) {
                ctx.strokeText(this.text, this.x, this.y);
            }
            const metrics = ctx.measureText(this.text);
            const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
            this.w = metrics.width;
            this.h = height;
        };
        Text.prototype.contains = function (mx, my) {
            if (this.getContainsTextResult(mx, my)) {
                return true;
            }
        };
        Text.prototype.getContainsTextResult = function (mx, my) {
            var left = getOffsetLeftTop().left;
            var top = getOffsetLeftTop().top;

            var offset = getOffset();
            var width = this.w * offset.scale;
            var height = this.h * offset.scale;
            var rx = this.x * offset.scale + left;
            var ry = this.y * offset.scale + top;
            var xBool = false;
            var yBool = false;
            if (width >= 0) {
                xBool = (rx <= mx) && (rx + width >= mx);
            } else {
                xBool = (rx >= mx) && (rx + width <= mx);
            }
            if (height >= 0) {
                yBool = (ry <= my) && (ry + height >= my);
            } else {
                yBool = (ry >= my) && (ry + height <= my);
            }
            return (xBool && yBool);
        };
        trackTransforms(ctx);
        this.render();
    }

    function createID() {
        var uuid = 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return uuid;
    }
    function drawRectWithBorder(x, y, sideLength, ctx, rectColor, fillColor) {
        ctx.save();
        ctx.fillStyle = rectColor;
        ctx.fillRect(x - (sideLength / 2), y - (sideLength / 2), sideLength, sideLength);
        ctx.fillStyle = fillColor;
        ctx.fillRect(x - ((sideLength - 3) / 2), y - ((sideLength - 3) / 2), sideLength - 3, sideLength - 3);
        ctx.restore();
    };

    function checkDirection(mx, my, rx, ry, sideLength) {
        if (checkSideLength(mx, rx, sideLength) && checkSideLength(my, ry, sideLength)) {
            return true;
        }
    }
    function checkSideLength(pt1, pt2, sideLength) {
        return Math.abs(pt1 - pt2) < sideLength;
    }
    function deduplication(arr) {
        var obj = {};
        return arr.reduce(function (cur, next) {
            obj[next.uuid] ? "" : obj[next.uuid] = true && cur.push(next);
            return cur;
        }, []);

    }
    return CanvasPlot;
})

