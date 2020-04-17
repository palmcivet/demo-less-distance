function gotoPage(page) {
	// 保存笔记，先看改没改，再看有没有
	if (store.isModified) {
		store.pdfStorage[store.currentPage] = config.paintNode.toDataURL("image/jpeg", 1);
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
}

/**
 *
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

// 发送 WS 信息
const sendText = (msg) => {
	if (user.communication.ws) {
		console.log(msg);
		user.communication.sendMessage(msg);
	} else {
		sendInform("已掉线，正在帮您重连", "error");
		user.communication.connect();
		setTimeout(() => sendText(msg), 2000);
	}
};

const sendInform = (msg, type, time = 2000, pos = { top: "10%", left: "10%" }) => {
	let p = document.createElement("p");
	p.setAttribute("style", `top: ${pos.top}, left: ${pos.left}`);

	switch (type) {
		case "warn":
			p.setAttribute("class", "warn");
			p.innerHTML = `<i class="mdui-icon material-icons">warning</i>  ${msg}`;
			break;
		case "error":
			p.setAttribute("class", "error");
			p.innerHTML = `<i class="mdui-icon material-icons">error</i>  ${msg}`;
			break;
		default:
			p.setAttribute("class", "info");
			p.innerHTML = `<i class="mdui-icon material-icons">notifications</i> ${msg}`;
			break;
	}
	$("#notify-box")[0].append(p);

	return setTimeout(() => $("#notify-box").children()[0].remove(), time);
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

/**
 * @class 封装一个 WebSocket 类
 */
class Socket {
	/**
	 * @param {Object} param 回调函数与相关信息
	 * @param {Function} param.socketOnOpen 连接打开
	 * @param {Function} param.socketOnClose 连接关闭
	 * @param {Function} param.socketOnMessage 收到消息
	 * @param {Function} param.socketOnError  连接错误
	 * @param {String} param.socketUrl URL
	 */
	constructor(param = {}) {
		this.ws = null;
		this.param = param;
		this.timeout = 8000;
		this.isSucces = true;
		this.reconnectCount = 6;
	}

	connect = () => {
		let { socketUrl } = this.param;
		this.ws = new WebSocket(socketUrl);
		this.ws.onopen = this.onOpen;
		this.ws.onclose = this.onClose;
		this.ws.onerror = this.onError;
		this.ws.onmessage = this.onMessage;
		this.ws.sendMessage = this.sendMessage;

		// readyState 属性是 WebSocket 对象的属性
		// 如果 socket.readyState 不等于 1 则连接失败，关闭连接
		if (this.timeout) {
			let time = setTimeout(() => {
				if (this.ws && this.ws.readyState !== 1) {
					this.ws.onclose();
					console.warn("Connection Timeout");
					clearTimeout(time);
				}
			}, this.timeout);
		}
	};

	onOpen = () => {
		let { socketOnOpen } = this.param;
		socketOnOpen && socketOnOpen();
		this.isSucces = false; // 连接成功将标识符改为 false
		console.log("WebSocket Open");
	};

	onClose = () => {
		let { socketOnClose } = this.param;

		if (this.reconnectCount === 6) {
			socketOnClose && socketOnClose();
			return;
		} else if (this.reconnectCount === 0) {
			socketOnClose && socketOnClose();
			this.isSucces = true; // 连接关闭将标识符改为 true
		} else {
			var time = setInterval(() => {
				if (this.isSucces && this.reconnectCount > 0) {
					this.connect();
					this.reconnectCount--;
				} else if (!this.ws) {
					clearInterval(time);
				}
			}, this.timeout);
		}
	};

	onError = (e) => {
		let { socketOnError } = this.param;
		socketOnError && socketOnError(e);
		this.ws = null;
	};

	onMessage = (msg) => {
		let { socketOnMessage } = this.param;
		socketOnMessage && socketOnMessage(msg);
	};

	sendMessage = (data) => {
		if (this.ws) {
			this.ws.send(JSON.stringify(data));
		}
	};

	heartCheck() {
		this.pingPong = "ping"; // ws 的心跳机制状态值
		this.pingInterval = setInterval(() => {
			// 检查 ws 为链接状态 才可发送
			if (this.ws.readyState === 1) {
				this.ws.send("ping"); // 客户端发送 ping
			}
		}, 10000);

		this.pongInterval = setInterval(() => {
			this.pingPong = false;
			if (this.pingPong === "ping") {
				this.closeHandle("pingPong没有改变为pong"); // 没有返回 pong 重启 webSocket
			}
			// 重置为 ping 若下一次 ping 发送失败 或者 pong 返回失败(pingPong 不会改成 pong)，将重启
			console.log("返回pong");
			this.pingPong = "ping";
		}, 20000);
	}
}
