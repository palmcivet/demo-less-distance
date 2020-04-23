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

$(() => {
	handleSignin(); // 获取信息
	initWebSocket(); // 建立 WebSocket 连接

	if (null === (config.canvasNode = $("#canvas-node")[0])) {
		sendInform("您的浏览器不支持 Canvas，请使用 Firefox 或 Chrome", "warn");
		return;
	} else {
		// 初始化节点
		config.canvasCtx = config.canvasNode.getContext("2d");
		config.paintNode = $("#canvas-paint")[0];
		config.paintCtx = config.paintNode.getContext("2d");
		config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";

		store.drawingRing = new canvasRing(config.canvasNode);

		// 加载 PDF 的监听及回调
		pdfjsLib.workerSrc = config.libSrc;
		$("#load")[0].addEventListener("change", () => {
			clearPaint(); // 清除上节课内容

			let fr = new FileReader();
			fr.readAsArrayBuffer($("#load")[0].files[0]);
			fr.onload = () => {
				pdfjsLib.getDocument((config.pdfURL = fr.result)).promise.then(
					(pdf) => {
						// 设置元信息并打开首页
						store.pdfContent = pdf;
						store.pdfPageNum = store.pdfContent._pdfInfo.numPages;
						store.currentScale = null;
						store.pdfStorage = [];
						gotoPage(1);
					},
					() => {
						sendInform("PDF 加载失败", "error");
					}
				);
			};
			$("#present").hide();
			// 更改缺省课程名
			if (!$("#course-input").val()) {
				$("#course-input").val($("#load")[0].files[0].name.slice(0, -4));
			}
		});

		// 生成工具栏
		const ul = lineStyle.map((i, j) => `<li>${genIcon(j)}</li>`);
		$("aside > ul").append(ul);
		for (let item = 0; item < lineStyle.length; item++) {
			$("aside > ul > li")[item].onclick = () => changeType(item);
			if (item === 0) {
				changeType(0, true);
			}
		}

		// 设置 Canvas 监听器
		config.paintNode.addEventListener("mousedown", (event) => {
			if ($("#present")[0].hidden) return;
			store.mouseDown = windowToCanvas(event.clientX, event.clientY);
			if (store.type === 5) {
				config.proxyNode.value = null;
				$("#textarea-proxy").css({
					left: store.mouseDown.x,
					top: store.mouseDown.y,
				});
			}
			store.isModified = true;
			store.dragging = true;
			saveDrawingSurface();
		});

		config.paintNode.addEventListener("mousemove", (event) => {
			if ($("#present")[0].hidden) return;
			let mouseMove = windowToCanvas(event.clientX, event.clientY);
			if (store.type == 5) return;
			if (
				store.dragging &&
				store.type !== 0 &&
				(mouseMove.x <= config.paintNode.width ||
					mouseMove.y <= config.paintNode.height)
			) {
				if (store.type < 5) {
					config.paintNode.style["cursor"] = "crosshair";
					restoreDrawingSurface();
				}
				toolBox[lineStyle[store.type]](mouseMove);
			}
		});

		config.paintNode.addEventListener("mouseup", (event) => {
			if ($("#present")[0].hidden) return;
			store.dragging = false;
			if (store.type === 5) {
				config.proxyNode.focus();
			} else if (store.type !== 0) {
				let mouseUp = windowToCanvas(event.clientX, event.clientY);
				store.drawingRing.do(toolBox[lineStyle[store.type]], mouseUp);
			}
		});

		// 文本工具的 textarea 代理
		config.proxyNode.addEventListener("compositionstart", (e) => {
			if ($("#present")[0].hidden) return;
			e.target.inputStatus = "CHINESE_TYPING";
		});

		config.proxyNode.addEventListener("input", (e) => {
			if ($("#present")[0].hidden) return;
			if (e.target.inputStatus !== "CHINESE_TYPING") {
				store.drawingRing.do(
					toolBox[lineStyle[5]],
					store.mouseDown,
					e.target.value
				);
			}
		});

		config.proxyNode.addEventListener("compositionend", (e) => {
			if ($("#present")[0].hidden) return;
			setTimeout(() => {
				e.target.inputStatus = "CHINESE_TYPE_END";
				store.drawingRing.do(
					toolBox[lineStyle[5]],
					store.mouseDown,
					e.target.value
				);
			}, 100);
		});

		// 拾色器的 input 代理
		$("#picker").css("background-color", store.color);
		config.pickerNode.addEventListener("click", (e) => {
			$("#input-proxy")[0].jscolor.show();
		});

		// 监听聊天框发送方式的切换
		listenChatBox();
	}
});

// 更改前景色
const updateColor = (jscolor) => {
	$("#picker").css({
		backgroundColor: "#" + jscolor.valueElement.value,
	});
};

// 消息处理函数
const handler = (msg) => {
	message = JSON.parse(msg.data);

	switch (message.type) {
		case wsType.enter:
			recvNotify(message, true);
			handleOnline(message.online);
			if (message.class) {
				if (message.class.speaker === user.username) {
					user.class.speaker = message.class.speaker;
					user.class.courseName = message.class.course;
					user.class.startTime = message.class.beginning;
					sendInform("重连成功", "info");
				} else {
					location = "/source/stud/index.html";
				}
			}
			break;
		case wsType.leave:
			recvNotify(message, false);
			handleOnline(message.online);
			break;
		case wsType.chat:
			recvText(message);
			break;
		case wsType.begin:
			handleBegin(message);
			break;
		case wsType.finish:
			handleFinish(message);
			if (location === "/source/stud/index.html") {
				location = "/source/teac/index.html";
			}
			break;
		default:
			// DEV
			console.log("未捕获：" + message);
			break;
	}
};
