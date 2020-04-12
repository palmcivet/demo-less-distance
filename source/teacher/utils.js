function gotoPage(page) {
	// 保存笔记
	store.pdfStorage[store.currentPage] = config.paintNode.toDataURL("image/png", 1);

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
	config.jumpNode.value = "";
};

// 上传课件
const uploadPdf = () => {
	store.pdfContent.getData().then((res) => console.log(res)); // Uint8Array
};

// 下载笔记

// 发送 WS 信息
const sendText = (msg) => {
	if (user.communication) {
		user.communication.sendMessage({
			username: user.username,
			permission: user.permission,
			...msg,
		});
	} else {
		// TODO 错误处理
	}
};

// 收到聊天消息
const textRecv = (msg) => {
	$("#chat-message").append(
		`<div>
			<span>${msg.username}</span>
			<span>${new Date().toTimeString().slice(0,8)}</span>
			<p>${msg.message}</p>
		</div>`
	);
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
