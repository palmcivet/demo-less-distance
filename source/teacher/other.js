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
