# canvasPlot
canvasPlot

```
<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8">
	<title>canvas图片实现拖拽缩放功能</title>
	<style>
		body,
		div {
			margin: 0;
			padding: 0;
		}

		html,
		body {
			width: 100%;
			height: 100%;
		}
	</style>
</head>

<body>
	<div style="width: 100%;height: 100%;">
		<div style="width: 100%;height: 80px;background-color: antiquewhite;font-size: 24px;font-weight: 600;">
			canvasPlot批注绘制-鼠标绘制矩形，拖动，按住右键画布整体拖动，滚轮整体缩放
		</div>
		<div style="width: 100%;height: calc(100% - 40px);display: flex;">
			<div style="width:300px;height:100%;background-color: #cccccc;font-size: 24px;font-weight: 600;">
				未来会增加文字，直线，云线，箭头，圆形等等功能
			</div>
			<div style="width:calc(100% - 300px);height:100%;">
				<div style="width:100%;height:100px;background-color:wheat;">

				</div>
				<div id="container" style="height:calc(100% - 100px);width:100%;">

				</div>
			</div>
		</div>

	</div>
	<script src="canvasPlot.min.js"></script>
	<script>
		//lightskyblue
		var canvasPlot = new CanvasPlot({
			parentNode: document.querySelector("#container"),
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
		// canvasPlot.drawRectBegin();
	</script>
</body>

</html>
```