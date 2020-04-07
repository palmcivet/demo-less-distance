let flag = false;
const drawPencil = (e) => {
	if (flag) {
		store.paintCtx.lineTo(e.offsetX, e.offsetY);
		store.paintCtx.stroke();
	} else {
		store.paintCtx.beginPath();
		store.paintCtx.moveTo(x, y);
	}
};

// const drawLine = (e) => {
// 	if (flag) {
// 		store.paintCtx.clearRect(0, 0, canvas.width, canvas.height);
// 		store.paintCtx.beginPath();
// 		store.paintCtx.moveTo(x, y);
// 		store.paintCtx.lineTo(e.offsetX, e.offsetY);
// 		store.paintCtx.stroke();
// 	}
// };

// $(document).ready(() => {
// 	store.paintNode.addEventListener("mousedown", (e) => {
// 		flag = true;
// 		x = e.offsetX;
// 		y = e.offsetY;
// 		console.log("ok");
// 	});
// 	store.paintNode.addEventListener("mousemove", () => {
// 		flag = false;
// 		url = $("canvas-paint")[0].toDataURL();
// 	});
// 	store.paintNode.addEventListener("mouseup", (e) => {
// 		drawPencil(e);
// 	});
// });

// *-----

const ctx = {
	canvas: document.getElementById("canvas-paint"),
	context: document.getElementById("canvas-paint").getContext("2d"),
	drawingSurface: null, // 用于保存绘图表面
	mouseDown: null, // 用于保存鼠标按下时的canvas坐标
	dragging: false, // 用于标识鼠标是否处于拖拽状态，只有拖拽状态才可以进行绘制
};

// 将浏览器客户区坐标转换为canvas坐标
function windowToCanvas(clientX, clientY) {
	let axisCanvas = ctx.canvas.getBoundingClientRect();
	console.log(clientX - axisCanvas.left, clientY - axisCanvas.top);
	return {
		x: clientX - axisCanvas.left,
		y: clientY - axisCanvas.top,
	};
}

// 保存canvas绘图表面
function saveDrawingSurface() {
	ctx.drawingSurface = ctx.context.getImageData(
		0,
		0,
		ctx.canvas.width,
		ctx.canvas.height
	);
}

// 恢复canvas绘图表面
function restoreDrawingSurface() {
	ctx.context.putImageData(ctx.drawingSurface, 0, 0);
}

// 绘制线段
function drawLine(mouseMove) {
	ctx.context.beginPath(); // 清除当前路径
	console.log("here", ctx.mouseDown, mouseMove);
	ctx.context.moveTo(ctx.mouseDown.x, ctx.mouseDown.y);
	ctx.context.lineTo(mouseMove.x, mouseMove.y);
	ctx.context.strokeStyle = "green";
	ctx.context.stroke();
}

ctx.canvas.addEventListener("mousedown", (event) => {
	ctx.mouseDown = windowToCanvas(event.clientX, event.clientY);
	ctx.dragging = true;
	saveDrawingSurface();
});

ctx.canvas.addEventListener("mousemove", (event) => {
	if (ctx.dragging) {
		restoreDrawingSurface();
		let mouseMove = windowToCanvas(event.clientX, event.clientY);
		drawLine(mouseMove);
	}
});

ctx.canvas.addEventListener("mouseup", (event) => {
	ctx.dragging = false;
});
