# canvasPlot

[![npm version](https://img.shields.io/npm/v/canvasplot.svg)](https://www.npmjs.com/package/canvasplot) [![npm downloads](https://img.shields.io/npm/dt/canvasplot.svg)](https://www.npmjs.com/package/canvasplot) [![npm downloads](https://img.shields.io/npm/dw/canvasplot.svg)](https://www.npmjs.com/package/canvasplot)  [![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/gjTool/canvasplot/blob/master/LICENSE) [![GitHub issues](https://img.shields.io/github/issues/gjTool/canvasplot.svg)](https://github.com/gjTool/canvasplot/issues) [![GitHub stars](https://img.shields.io/github/stars/gjTool/canvasplot.svg?style=social)](https://github.com/gjTool/canvasplot/stargazers) [![GitHub forks](https://img.shields.io/github/forks/gjTool/canvasplot.svg?style=social)](https://github.com/gjTool/canvasplot/network/members) 

**canvasplot.js canvas绘制矩形，拖动缩放，删除。**

- [canvasplot博客主页](https://www.gjtool.cn/)  

- [canvasplot项目GitHub地址](https://github.com/gjTool/canvasplot)  

- [canvasplot项目gitee地址](https://gitee.com/gjTool/canvasplot)

## 快速使用（有两种方式）

#### 一、script标签引入方式（需下载本项目文件夹css/pdfh5.css、js内所有文件）


```javascript
<div id="demo" style="width:500px;height:500px;"></div>
```

- 	3.引入js  

```javascript
<script src="canvasPlot.min.js" type="text/javascript" charset="utf-8"></script>
```

- 	4.实例化

```javascript
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
import Canvasplot from "canvasplot";
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
	}
}
</script>
```

## options配置项参数列表

|参数名称	|类型		|取值	|是否必须	|作用				|
|:---:		|:---:		|:---:	|:---:		|:---:				|
|parentNode	|  {HTMLelement}	| -		| √		|canvasPlot的父元素	|
|width	|  {Number}	| -		|  √			|canvasPlot的宽	|
|height	|  {Number}	| -		|  √				|canvasPlot的高	|
|imagePath	|  {String}	| -		|  √			|canvasPlot的图片路径	|
## methods 方法列表


|方法名			|传参				|传参取值			|作用				|
|:---:			|:---:				|:---:				|:---:				|
|addRect	| {Object}			|{x:10,y:10,w:40,h:40}		|手动添加矩形	|
|drawRectBegin	|	-	|-		|开始绘制矩形		|
|getPlotCaches	| 	-	|-	|获取绘制的plot数据缓存		|

## on方法监听所有事件-事件名列表


|事件名			    |作用									|
|:---:				|:---:									|
|drawFinish			|监听canvasPlot绘制完成					|
|dragMoveFinish		|监听canvasPlot拖拽完成		|