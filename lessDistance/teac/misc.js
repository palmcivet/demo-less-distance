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

// 工具栏
const toolBox = {
	line: (mouseMove) => {
		config.paintCtx.beginPath();
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
		config.paintCtx.beginPath();

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

// 历史记录
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
		if (user.class.isInClass) asyncNote();
		this.ringGap = this.ringSeak;
		if (this.ringSeak > this.ringSize) {
			this.ring = this.ring.slice(-this.ringSize);
		}
	}

	undo() {
		if (this.ringSeak > 0) {
			config.paintCtx.putImageData(this.ring[--this.ringSeak], 0, 0);
			if (user.class.isInClass) asyncNote();
		}
	}

	redo() {
		if (this.ringSeak < this.ringGap && this.ringSeak > -1) {
			config.paintCtx.putImageData(this.ring[++this.ringSeak], 0, 0);
			if (user.class.isInClass) asyncNote();
		}
	}
}

/* =============== 以下为翻页相关 =============== */

// 翻页
function gotoPage(page) {
	// 保存笔记：先看改没改，再看有没有
	if (store.isModified) {
		store.pdfStorage[store.currentPage] = config.paintNode.toDataURL("image/png", 1);
		store.isModified = false;
	}
	clearPaint();

	// 修改 PDF 页数
	store.currentPage = page;
	config.jumpNode.placeholder = store.currentPage + " / " + store.pdfPageNum;

	// 加载 PDF 页
	store.pdfContent.getPage(page).then((resPage) => {
		let viewport;
		let isFirst = false; // 首次加载使用最佳缩放比例
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

	setTimeout(() => {
		if (user.class.isInClass) asyncSlide();
	}, 180);
	store.drawingRing.clear();

	// 加载笔记
	if (undefined !== (img = store.pdfStorage[page])) {
		if (user.class.isInClass) asyncNote(img);
		config.imageNode.src = img;
		$("#img-proxy").ready(() => config.paintCtx.drawImage(config.imageNode, 0, 0));
		store.drawingRing.init(
			config.paintCtx.getImageData(
				0,
				0,
				config.paintNode.width,
				config.paintNode.height
			)
		);
	} else {
		store.drawingRing.init(
			config.paintCtx.getImageData(
				0,
				0,
				config.paintNode.width,
				config.paintNode.height
			)
		);
	}
}

// 跳转到
const jumpTo = (e) => {
	if (e.keyCode === 13) {
		turnPage(parseInt(e.target.value));
	}
};

// 前后翻页和跳转页	{Boolean|Number} page - true|false|页数
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

// 同步 Slide
const asyncSlide = (data = null) => {
	sendText({
		type: wsType.slide,
		slide: data || config.canvasNode.toDataURL("image/png", 1),
	});
};

// 同步批注
const asyncNote = (data = null) => {
	sendText({
		type: wsType.note,
		note: data || config.paintNode.toDataURL("image/png", 1),
	});
};

// 上传课件
const uploadPdf = () => {
	store.pdfContent.getData().then((res) => {
		return res;
	}); // Uint8Array
};

/* =============== 以下为 Canvas 操作 =============== */

// 清除 paintNode Canvas
const clearPaint = () =>
	config.paintCtx.clearRect(0, 0, config.paintNode.width, config.paintNode.height);

// 清除 canvasNode Canvas
const clearCanvas = () =>
	config.canvasCtx.clearRect(0, 0, config.canvasNode.width, config.canvasNode.height);

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

/* =============== 以下为工具箱 =============== */

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

/* =============== 以下为课程相关 =============== */

// 初始化录音设备
const initAudio = () => {
	if (!navigator.mediaDevices) {
		sendInform("您的浏览器不支持语音，请使用 Firefox 或 Chrome", "error");
		return;
	}

	return navigator.mediaDevices
		.getUserMedia({ audio: true, video: false })
		.then((stream) => {
			user.class.audio = new SRecorder(stream);
		})
		.catch(() => sendInform("初始化设备失败，请刷新重试", "error"));
};

// 更改课程名
const changeCourse = () => {
	const target = $("#function > section > button")[0];
	if ($("#course-input")[0].disabled) {
		$("#course-input")[0].disabled = false;
		target.innerHTML = '<i class="mdui-icon material-icons">spellcheck</i>';
		target.title = "完成";
		$("#course-input").focus();
	} else {
		$("#course-input")[0].disabled = true;
		target.innerHTML = '<i class="mdui-icon material-icons">mode_edit</i>';
		target.title = "更改";
		sendInform("课程名已更改", "info");
	}
};

// 开始、结束课程
const toggleCourse = () => {
	if (!user.class.isInClass) {
		let course = $("#course-input").val();
		if (!course) {
			sendInform("请填写课程名", "warn");
			$("#course-input").focus();
			return;
		} else if (!store.pdfContent) {
			sendInform("请加载一份演示文稿", "warn");
			return;
		} else {
			sendText({
				type: wsType.begin,
				speaker: user.username,
				course,
				width: config.canvasNode.width,
				height: config.canvasNode.height,
				slide: config.canvasNode.toDataURL("image/png"),
				note: config.paintNode.toDataURL("image/png"),
			});

			// 开始上课，同时打开录音
			initAudio().then(() => toggleRecord(true));

			user.class.isInClass = true;
			user.class.speaker = user.username;
			user.class.courseName = course;
		}
	} else {
		sendText({
			type: wsType.finish,
			speaker: user.username,
		});
		clearPaint();
		toggleRecord(false);
		user.class.isInClass = false;
	}

	$("#toggleCourse")[0].innerHTML = user.class.isInClass
		? '<i class="mdui-icon material-icons mdui-text-color-red-a400">settings_power</i>结束课程'
		: '<i class="mdui-icon material-icons">power_settings_new</i>开始课程';
};

// 暂停、继续录音
const toggleRecord = (flag = null) => {
	switch (flag) {
		case null:
			if (!user.class.isInClass) {
				sendInform("当前未开课", "info");
				return;
			} else {
				if (user.class.isRecord) {
					user.class.audio.stop();
				} else {
					user.class.audio.continue((data) => sendVoice(data));
				}
			}
			break;
		case true:
			user.class.audio.start((data) => sendVoice(data));
			break;
		case false:
			user.class.audio.stop();
			user.class.isRecord = false;
			$(
				"#toggleRecord"
			)[0].innerHTML = `<i class="mdui-icon material-icons">keyboard_voice</i> 开始录音`;

			return;
	}

	user.class.isRecord = !user.class.isRecord;

	$("#toggleRecord")[0].innerHTML = user.class.isRecord
		? '<i class="mdui-icon material-icons mdui-text-color-red-a400">settings_voice</i>暂停录音'
		: '<i class="mdui-icon material-icons">keyboard_voice</i>继续录音';
};

// 发布讨论题
const postTopic = () => {
	if ("" === (ques = $("#question").val())) {
		sendInform("请填写问题", "info");
	} else if ("" === (answ = $("#answer").val())) {
		sendInform("请填写答案", "info");
	} else if ("" === (time = $("#time").val())) {
		sendInform("请预留时间", "info");
	} else {
		sendText({ type: wsType.ques, ques, answ, time: parseInt(time) });
	}

	$("#time ~ button")[0].disabled = "true";
	setTimeout(() => ($("#time ~ button")[0].disabled = ""), time + 18000); // 3 分钟为学生回顾校对时间
	$("#time").val("");
};
