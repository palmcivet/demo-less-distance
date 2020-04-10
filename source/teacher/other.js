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
