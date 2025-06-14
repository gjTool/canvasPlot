# canvasPlot

[![npm version](https://img.shields.io/npm/v/canvasplot.svg)](https://www.npmjs.com/package/canvasplot) [![npm downloads](https://img.shields.io/npm/dt/canvasplot.svg)](https://www.npmjs.com/package/canvasplot) [![npm downloads](https://img.shields.io/npm/dw/canvasplot.svg)](https://www.npmjs.com/package/canvasplot)  [![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/gjTool/canvasplot/blob/master/LICENSE) [![GitHub issues](https://img.shields.io/github/issues/gjTool/canvasplot.svg)](https://github.com/gjTool/canvasplot/issues) [![GitHub stars](https://img.shields.io/github/stars/gjTool/canvasplot.svg?style=social)](https://github.com/gjTool/canvasplot/stargazers) [![GitHub forks](https://img.shields.io/github/forks/gjTool/canvasplot.svg?style=social)](https://github.com/gjTool/canvasplot/network/members) 

**canvasplot.js canvas绘制矩形，拖动缩放，删除。**

- [canvasplot博客主页](https://www.gjtool.cn/)  

- [canvasplot项目GitHub地址](https://github.com/gjTool/canvasPlot)  

- [canvasplot项目gitee地址](https://gitee.com/gjTool/canvasPlot)

### 在线示例
https://www.gjtool.cn/canvasplot/index.html


## 快速使用（有两种方式）

#### 一、script标签引入方式

- 	1.div容器 

```javascript
<div id="demo" style="width:500px;height:500px;"></div>
```

- 	2.引入js  

```javascript
<script src="canvasPlot.min.js" type="text/javascript" charset="utf-8"></script>
```

- 	3.实例化

```javascript
var canvasPlot = new CanvasPlot({
	parentNode: document.querySelector("#demo"),
	width: 500,
	height: 500,
	imagePath: '3.jpg'
});
```

####  二、npm安装方式

- 	1.安装

```javascript
npm install canvasplot
```
- 	2.使用

```javascript
<template>
  <div id="app">
	<div id="demo" style="width:500px;height:500px;"></div>
  </div>
</template>
<script>
import CanvasPlot from "canvasplot";
export default {
    name: 'App',
	data() {
	  return {
	  };
	},
	mounted() {
		var canvasPlot = new CanvasPlot({
			parentNode: document.querySelector("#demo"),
			width: 500,
			height: 500,
			imagePath: '3.jpg'
		});

		canvasPlot.addRect({
			x: 212,
			y: 119,
			w: 50,
			h: 50
		});
		canvasPlot.addRect({
			x: 280,
			y: 126,
			w: 60,
			h: 30
		});
		canvasPlot.drawRectBegin();
		canvasPlot.on("drawFinish",function(){
			//somecode
		})
	}
}
</script>
```

## options配置项参数列表

|参数名称	|类型		|取值	|是否必须	|作用				|
|:---:		|:---:		|:---:	|:---:		|:---:				|
|parentNode	|  HTMLelement	| -		| √		|canvasPlot的父元素	|
|width	|  Number	| -		|  -			|canvasPlot的宽，不填默认跟随父元素宽度	|
|height	|  Number	| -		|  -				|canvasPlot的高，不填默认跟随父元素高度		|
|imagePath	|  String	| -		|  √			|canvasPlot的图片路径	|
|showMenu	|  Boolean	| -		|  -			|是否显示右键菜单	|
|rectBgColor	|  String	| -		|  -			|rect矩形内部填充颜色，不填默认中间透明	|
|dragMoveButton	|  String	| rightClick / midddleClick	|  -			|右键拖动画布或者中键拖动画布	|
## methods 方法列表


|方法名			|传参				|传参取值			|作用				|
|:---:			|:---:				|:---:				|:---:				|
|addRect	| Object			|{x:10,y:10,w:40,h:40}		|手动添加矩形	|
|delPlot	| Object			|plot		|删除plot，不传参默认删除所有plot	|
|drawRectBegin	|	-	|-		|开始绘制矩形		|
|drawRectFinish	|	-	|-		|结束绘制矩形		|
|setCanvasDragZoom	|	Boolean	|true/false		|设置允许拖动缩放		|
|getPlotCaches	| 	-	|-	|获取绘制的plot数据缓存		|
|getSelection	| 	-	|-	|获取当前选中的plot		|
|getOffset	| 	-	|-	|获取当前canvas偏移值，放大比例{scale:1,x:0,y:0}		|
|setOffset	| 	Object	|{scale:1,x:0,y:0}	|设置当前canvas偏移值，放大比例		|
|getData	| 	-	|-|获取canvasPlot的默认绘制plot数据,偏移值和缩放比例。{offset:{scale:1,x:0,y:0},data:[]}		|
|setData	| 	Object	|{offset:{scale:1,x:0,y:0},data:[]}	|canvasPlot的默认绘制plot数据,偏移值和缩放比例（可以用来回显上次的数据		|
|screenshot	| 	String	|jpg/png等图片格式	|当前canvas截图，返回base64		|
|downLoad	| 	String	|jpg/png等图片格式	|当前canvas截图，下载下来成为图片文件	|
|on	| (String, Function, Boolean)|String：监听的事件名，Function：监听的事件回调, Boolean: 为true时，不可与同类型的事件共存，当前事件函数会覆盖前面同类型的事件 	|on方法监听所有事件	，所有类型事件默认可以同时存在多个，触发事件时会同时执行|
|off| (String, Function)|String：要卸载的事件名，Function：要卸载的事件函数	|off方卸载on监听的所有事件，第一个参数为true时，卸载所有on监听的事件。第二个参数为空时，卸载第一个参数的同类型的所有事件|
|clear	|	-	|-		|清除画布内容		|
|setImage	| 	(String, Number,Number)	|String：图片地址，x，y设置当前图片的位置，可选	|设置当前背景图		|
|destroy	|	-	|-		|销毁实例		|
## on方法监听所有事件-事件名列表


|事件名			    |作用									|
|:---:				|:---:									|
|drawFinish			|监听plot绘制完成					|
|dragMoveFinish		|监听背景图拖拽完成		|
|dragPlotMove		|监听plot拖拽完成		|
|drawing		|监听plot绘制中		|
|drawMove		|监听plot绘制中（四角边沿拖拽绘制）		|
|select		|监听plot选择事件		|
|zoom		|监听缩放事件		|
|dblclick		|监听plot双击事件		|
|rightClick		|监听plot右键事件		|
|removeAll		|监听所有plot删除事件		|
|removePlot		|监听plot删除事件		|