function gotoPage(page) {
	// 保存笔记
	store.pdfStorage[store.currentPage] = config.paintNode.toDataURL("image/png", 1);

	// 切换页面
	store.currentPage = page;
	config.gotoNode.placeholder = store.currentPage + " / " + store.pdfPageNum;

	store.pdfContent.getPage(page).then((resPage) => {
		let viewport;
		// 首次加载使用最佳缩放比例
		let isFirst = false;
		if (null === store.currentScale) {
			isFirst = true;
			let optimScale = 0.9;
			do {
				optimScale += 0.1;
				viewport = resPage.getViewport({ scale: optimScale });
			} while (viewport.width + 40 < 960 && viewport.height + 40 < 540);
			store.currentScale = optimScale;
		}
		viewport = resPage.getViewport({ scale: store.currentScale });
		resPage.render({
			canvasContext: config.canvasCtx,
			viewport: viewport,
		});
		if (isFirst) {
			config.canvasNode.width = viewport.width;
			config.canvasNode.height = viewport.height;
			config.paintNode.width = viewport.width;
			config.paintNode.height = viewport.height;
		}
	});

	// 加载笔记
	config.paintCtx.clearRect(0, 0, config.paintNode.width, config.paintNode.width);
	if (undefined !== (img = store.pdfStorage[page])) {
		config.imageNode.src = img;
		$("#img-proxy").ready(() => config.paintCtx.drawImage(config.imageNode, 0, 0));
	}
}

const turnPrevPage = () => {
	if (0 >= store.currentPage - 1) {
		// TODO: 优化提示
		alert("已到达第一页");
	} else {
		gotoPage(store.currentPage - 1);
	}
};

const turnNextPage = () => {
	if (store.pdfPageNum < store.currentPage + 1) {
		// TODO: 优化提示
		alert("已到达最后页");
	} else {
		gotoPage(store.currentPage + 1);
	}
};

const turnToPage = (page) => {
	if (isNaN(page)) {
		// TODO 优化警告
		alert("请输入数值");
	} else if (store.pdfPageNum < page || 0 >= page) {
		// TODO 优化警告
		alert("页数超范围");
	} else {
		gotoPage(page);
	}
	config.gotoNode.value = "";
};

// 将浏览器客户区坐标转换为 canvas 坐标
const windowToCanvas = (clientX, clientY) => {
	let axisCanvas = config.paintNode.getBoundingClientRect();
	return {
		x: clientX - axisCanvas.left,
		y: clientY - axisCanvas.top,
	};
};

// 保存 canvas 绘图表面
const saveDrawingSurface = () => {
	store.drawingSurface = config.paintCtx.getImageData(
		0,
		0,
		config.paintNode.width,
		config.paintNode.height
	);
};

// 恢复 canvas 绘图表面
const restoreDrawingSurface = () => {
	config.paintCtx.putImageData(store.drawingSurface, 0, 0);
};

const uploadPdf = () => {
	store.pdfContent.getData().then((res) => console.log(res)); // Uint8Array
};

// 生成图标
const genIcon = (classId, isSelected = false) => {
	return isSelected
		? "<i class='" + typeStyle[classId] + " selected" + "'></i>"
		: "<i class='" + typeStyle[classId] + "'></i>";
};

// 修改线型
const changeType = (typeId) => {
	$("ul li")[store.type].innerHTML = genIcon(store.type);
	store.type = typeId;
	$("ul li")[typeId].innerHTML = genIcon(typeId, true);
};

// 修改粗细

// 修改颜色
const changeColor = (color) => {
	store.color = color;
	// TODO 同步信息
};

const toolBox = {
	line: (mouseMove) => {
		config.paintCtx.beginPath(); // 清除当前路径
		config.paintCtx.moveTo(store.mouseDown.x, store.mouseDown.y);
		config.paintCtx.lineTo(mouseMove.x, mouseMove.y);
		config.paintCtx.strokeStyle = store.color;
		config.paintCtx.stroke();
	},
	rectangle: (mouseMove) => toolBox.polygon(mouseMove, 4),
	triangle: (mouseMove) => toolBox.polygon(mouseMove, 3),
	circle: (mouseMove) => {
		config.paintCtx.beginPath();
		// 使用勾股定理圆的计算半径
		let r = Math.sqrt(
			Math.pow(mouseMove.x - store.mouseDown.x, 2) +
				Math.pow(mouseMove.y - store.mouseDown.y, 2)
		);
		config.paintCtx.arc(
			store.mouseDown.x,
			store.mouseDown.y,
			r,
			0,
			2 * Math.PI,
			true
		);
		config.paintCtx.strokeStyle = store.color;
		config.paintCtx.stroke();
	},
	text: (mouseMove, text) => {
		config.paintCtx.font = "16px 'SFPing Fang', sans-serif";
		config.paintCtx.fillStyle = store.color;
		config.paintCtx.fillText(text, mouseMove.x, mouseMove.y);
	},
	pen: (mouseMove) => {},
	// 绘制多边形
	polygon: (mouseMove, sides) => {
		config.paintCtx.beginPath(); // 清除当前路径
		// 多边形外接圆半径

		let r = Math.sqrt(
			Math.pow(store.mouseDown.x - mouseMove.x, 2) +
				Math.pow(store.mouseDown.y - mouseMove.y, 2)
		);
		let angle = 0;
		for (let i = 0; i < sides; i++) {
			let vertex_x = store.mouseDown.x + r * Math.sin(angle);
			let vertex_y = store.mouseDown.y - r * Math.cos(angle);
			if (i == 0) {
				config.paintCtx.moveTo(vertex_x, vertex_y); // 多边形起始顶点
			} else {
				config.paintCtx.lineTo(vertex_x, vertex_y); // 多边形其余顶点
			}
			angle += (2 * Math.PI) / sides;
		}
		config.paintCtx.closePath();
		config.paintCtx.strokeStyle = store.color;
		config.paintCtx.stroke();
	},
};
