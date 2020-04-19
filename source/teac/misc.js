const lineStyle = [
	"arrow",
	"line",
	"rectangle",
	"triangle",
	"circle",
	"text",
	"pencil",
	"eraser",
];

const config = {
	libSrc: "/source/static/script/pdf.worker.min.js",
	pdfURL: "", // 路径|ArrayBuffer
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	proxyNode: $("#textarea-proxy")[0], // 文本工具的 textarea 代理
	imageNode: $("#img-proxy")[0], // 标注的 img 代理
	pickerNode: $("#picker")[0], // 拾色器
	jumpNode: $("#jump")[0], // 跳转输入框
};

const store = {
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	pdfStorage: [], // 保存每一页标注
	currentPage: 1, // 当前页
	currentScale: null, // 缩放比例
	// 绘图
	isModified: false, // 是否修改过，该字段为节省存储
	drawingRing: null, // 历史记录栈
	drawingSurface: null, // 保存绘图表面
	mouseDown: null, // 保存鼠标按下时的 canvas 坐标
	dragging: false, // 标识鼠标是否处于拖拽状态
	color: "red", //笔触颜色
	size: 2, // 笔触粗细
	type: 0, //笔触类型
};

function gotoPage(page) {
	// 保存笔记，先看改没改，再看有没有
	if (store.isModified) {
		store.pdfStorage[store.currentPage] = config.paintNode.toDataURL("image/png", 1);
		store.isModified = false;
	}

	// 切换页面
	store.currentPage = page;
	config.jumpNode.placeholder = store.currentPage + " / " + store.pdfPageNum;

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

	// 加载笔记，先看有没有
	config.paintCtx.clearRect(0, 0, config.paintNode.width, config.paintNode.width);
	if (undefined !== (img = store.pdfStorage[page])) {
		if (user.class.isInClass) {
			asyncSlide();
			asyncNote(img);
		}
		config.imageNode.src = img;
		$("#img-proxy").ready(() => config.paintCtx.drawImage(config.imageNode, 0, 0));
	}
	store.drawingRing.clear();
	store.drawingRing.init(
		config.paintCtx.getImageData(
			0,
			0,
			config.paintNode.width,
			config.paintNode.height
		)
	);
}

/**
 * 跳转页
 * @param {Boolean|Number} page - true|false|页数，前后翻页和跳转页
 */
const turnPage = (page) => {
	if (store.pdfContent) {
		switch (page) {
			case true:
				if (store.pdfPageNum < store.currentPage + 1) {
					sendInform("已翻到最后一页", "warn");
				} else {
					gotoPage(store.currentPage + 1);
				}
				break;
			case false:
				if (0 >= store.currentPage - 1) {
					sendInform("已翻到第一页", "warn");
				} else {
					gotoPage(store.currentPage - 1);
				}
				break;
			default:
				if (isNaN(page)) {
					sendInform("请输入数值", "warn");
				} else if (store.pdfPageNum < page || 0 >= page) {
					sendInform("页数超过范围", "warn");
				} else {
					gotoPage(page);
				}
				config.jumpNode.value = "";
				break;
		}
	} else {
		sendInform("请加载一份演示文稿", "info");
	}
};

const asyncSlide = (data = null) => {
	sendText({
		type: wsType.slide,
		data: data || config.canvasNode.toDataURL("image/png", 1),
	});
};

const asyncNote = (data = null) => {
	sendText({
		type: wsType.slide,
		note: data || config.paintNode.toDataURL("image/png", 1),
	});
};

// 上传课件
const uploadPdf = () => {
	store.pdfContent.getData().then((res) => {
		console.log(res);
		return res;
	}); // Uint8Array
};

// 下载笔记

// 将浏览器客户区坐标转换为 canvas 坐标
const windowToCanvas = (clientX, clientY) => {
	let axisCanvas = config.paintNode.getBoundingClientRect();
	return {
		x: clientX - axisCanvas.left,
		y: clientY - axisCanvas.top,
	};
};

// 保存 canvas 绘图表面
const saveDrawingSurface = () =>
	(store.drawingSurface = config.paintCtx.getImageData(
		0,
		0,
		config.paintNode.width,
		config.paintNode.height
	));

// 恢复 canvas 绘图表面
const restoreDrawingSurface = () =>
	config.paintCtx.putImageData(store.drawingSurface, 0, 0);

// 生成图标
const genIcon = (classId, isSelected = false) => {
	return isSelected
		? "<i class='" + lineStyle[classId] + " selected" + "'></i>"
		: "<i class='" + lineStyle[classId] + "'></i>";
};

// 修改线型
const changeType = (typeId) => {
	$("ul li")[store.type].innerHTML = genIcon(store.type);
	store.type = typeId;
	$("ul li")[typeId].innerHTML = genIcon(typeId, true);

	switch (typeId) {
		case 0:
			config.paintNode.style["cursor"] = "default";
			break;
		case 5:
			config.paintNode.style["cursor"] = "text";
			break;
		case 6:
			config.paintNode.style["cursor"] = "crosshair";
			break;
		case 7:
			config.paintNode.style["cursor"] =
				"url(/source/static/icon/cursor.png), crosshair";
			break;
		default:
			break;
	}
};

// 修改粗细
const changeWidth = (e) => {
	let size = parseInt(e.target.value);
	if (isNaN(size)) {
		sendInform("请输入数值", "warn");
		e.target.value = store.size;
	} else if (size < 1 || size > 6) {
		sendInform("建议粗细在 1~6 之间", "info");
		e.target.value = store.size;
	} else {
		store.size = size;
	}
};

// 修改颜色
const changeColor = (color) => {
	store.color = color;
};

class canvasRing {
	constructor(canvasNode, ringSize = 30) {
		this.width = canvasNode.width;
		this.height = canvasNode.height;
		this.ring = [];
		this.ringSize = ringSize;
		this.ringSeak = -1; // 指示当前记录，先加再求值
		this.ringGap = -1; // 指示最新记录
	}

	init(data) {
		this.ring[(this.ringSeak = 0)] = data;
	}

	clear() {
		this.ring = [];
		this.ringGap = this.ringSeak = -1;
	}

	do(callback = null, ...params) {
		this.ring[++this.ringSeak] = config.paintCtx.getImageData(
			0,
			0,
			this.width,
			this.height
		);
		callback(...params);
		this.ringGap = this.ringSeak;
		if (this.ringSeak > this.ringSize) {
			this.ring = this.ring.slice(-this.ringSize);
		}
	}

	undo() {
		if (this.ringSeak > 0) {
			config.paintCtx.putImageData(this.ring[--this.ringSeak], 0, 0);
		}
	}

	redo() {
		if (this.ringSeak < this.ringGap && this.ringSeak > -1) {
			config.paintCtx.putImageData(this.ring[++this.ringSeak], 0, 0);
		}
	}
}

const toolBox = {
	line: (mouseMove) => {
		config.paintCtx.beginPath(); // 清除当前路径
		config.paintCtx.moveTo(store.mouseDown.x, store.mouseDown.y);
		config.paintCtx.lineTo(mouseMove.x, mouseMove.y);
		config.paintCtx.strokeStyle = store.color;
		config.paintCtx.lineWidth = store.size;
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
		config.paintCtx.lineWidth = store.size;
		config.paintCtx.stroke();
	},
	text: (mouseMove, text) => {
		config.paintCtx.font = `${store.size + 13}px 'SFPing Fang', sans-serif`;
		config.paintCtx.fillStyle = store.color;
		config.paintCtx.fillText(text, mouseMove.x, mouseMove.y);
	},
	eraser: (mouseMove) => {
		config.paintCtx.clearRect(
			mouseMove.x,
			mouseMove.y,
			store.size + 5,
			store.size + 5
		);
	},
	pencil: (mouseMove) => {
		config.paintCtx.beginPath();
		config.paintCtx.moveTo(store.mouseDown.x, store.mouseDown.y);
		config.paintCtx.lineTo(mouseMove.x, mouseMove.y);
		config.paintCtx.strokeStyle = store.color;
		config.paintCtx.lineWidth = store.size;
		config.paintCtx.stroke();
		store.mouseDown = mouseMove;
	},
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
		config.paintCtx.lineWidth = store.size;
		config.paintCtx.stroke();
	},
};
