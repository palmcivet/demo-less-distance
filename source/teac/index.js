$(() => {
	user.username = localStorage.getItem("username");
	user.permission = localStorage.getItem("permission");

	const ws = {
		socketOnOpen: () => console.log("成功进入教室"),
		socketOnClose: () => console.log("您已离开教室"),
		socketOnMessage: (msg) => {
			message = JSON.parse(msg.data);
			if (message.type === "chat") {
				textRecv(message);
				console.log(message);
			} else {
				console.log(msg);
			}
		},
		socketOnError: (e) => {
			console.log(e);
		},
		socketUrl: "wss://www.uiofield.top/lessDistance/websocket",
	};

	user.communication = new Socket(ws);
	user.communication.connect();

	if (null === (config.canvasNode = $("#canvas-node")[0])) {
		alert("您的浏览器不支持 Canvas");
		return;
	} else {
		// 初始化节点
		config.canvasCtx = config.canvasNode.getContext("2d");
		config.paintNode = $("#canvas-paint")[0];
		config.paintCtx = config.paintNode.getContext("2d");
		config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";

		// 加载 PDF 的监听及回调
		pdfjsLib.workerSrc = config.libSrc;
		$("#load")[0].addEventListener("change", () => {
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
						// 设置监听器
						config.paintNode.addEventListener("mousedown", (event) => {
							if (store.type === 5) {
								config.proxyNode.value = null;
								$("#textarea-proxy").css({
									left: event.clientX,
									top: event.clientY,
								});
							}
							store.mouseDown = windowToCanvas(
								event.clientX,
								event.clientY
							);
							store.dragging = true;
							saveDrawingSurface();
						});
						config.paintNode.addEventListener("mousemove", (event) => {
							let mouseMove = windowToCanvas(event.clientX, event.clientY);
							if (
								mouseMove.x <= config.paintNode.width ||
								mouseMove.y <= config.paintNode.height
							) {
								if (store.type === 5) {
									event.target.style["cursor"] = "text";
								} else if (store.type === 0) {
									event.target.style["cursor"] = "default";
								} else if (store.dragging && store.type !== 0) {
									event.target.style["cursor"] = "crosshair";
									restoreDrawingSurface();
									let toolId = typeStyle[store.type];
									toolBox[toolId](mouseMove);
								}
							}
						});
						config.paintNode.addEventListener("mouseup", (event) => {
							store.dragging = false;
							if (store.type === 5) {
								config.proxyNode.focus();
							}
						});
					},
					() => {
						// TODO: 优化提示
						console.log("PDF 加载失败");
					}
				);
			};
		});

		// 生成工具栏
		const ul = typeStyle.map((i, j) => `<li>${genIcon(j)}</li>`);
		$("ul").append(ul);
		for (let item = 0; item < typeStyle.length; item++) {
			$("ul li")[item].onclick = () => changeType(item);
			if (item === 0) {
				changeType(0, true);
			}
		}

		// 文本工具的 textarea 代理
		config.proxyNode.addEventListener("compositionstart", (e) => {
			e.target.inputStatus = "CHINESE_TYPING";
		});
		config.proxyNode.addEventListener("input", (e) => {
			if (e.target.inputStatus !== "CHINESE_TYPING") {
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}
		});
		config.proxyNode.addEventListener("compositionend", (e) => {
			setTimeout(() => {
				e.target.inputStatus = "CHINESE_TYPE_END";
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}, 100);
		});

		// 拾色器的 input 代理
		$("#picker").css("background-color", store.color);
		config.pickerNode.addEventListener("click", (e) => {
			$("#input-proxy")[0].jscolor.show();
		});

		$("#chat-box textarea")[0].addEventListener("keydown", (e) => {
			if (e.keyCode === 13) {
				if (e.shiftKey && e.target.placeholder === "Shift + Enter 发送") {
					e.preventDefault();
					textSubmit();
				} else if (!e.shiftKey && e.target.placeholder === "Enter 发送") {
					e.preventDefault();
					textSubmit();
				}
			}
		});
	}
});

// 跳转到
const jumpTo = (e) => {
	if (e.keyCode === 13) {
		turnToPage(parseInt(e.target.value));
	}
};

// 更改前景色
const updateColor = (jscolor) => {
	$("#picker").css({
		backgroundColor: "#" + jscolor.valueElement.value,
	});
};

// 切换发送快捷键
function toggleEnter() {
	let $input = $("#chat-box div label input");
	let $textarea = $("#chat-box textarea")[0];
	if ($input.val() === "true") {
		$textarea.placeholder = "Shift + Enter 发送";
		$input.val("false");
	} else {
		$textarea.placeholder = "Enter 发送";
		$input.val("true");
	}
}

// 提交聊天信息
function textSubmit() {
	let msg = $("#chat-box textarea").val();

	if (msg !== "" && msg !== "\n") {
		sendText({
			type: "chat",
			name: user.username,
			role: user.permission,
			msg,
		});
	}
	$("#chat-box textarea").val("");
}

// 处理聊天消息
function textRecv(msg) {
	let div = document.createElement("div");
	if (msg.name === user.username) {
		div.setAttribute("class", "self");
	} else {
		if (msg.role) {
			div.setAttribute("class", "teac");
		} else {
			div.setAttribute("class", "stud");
		}
	}
	div.innerHTML = `<span>${msg.name}</span>
	<span>${new Date().toTimeString().slice(0, 8)}</span>`;
	let p = document.createElement("p");
	p.innerText = msg.msg.replace(/"\n"/g, "<br>");
	div.appendChild(p);
	$("#chat-message").append(div);
	$("#chat-message").scrollTop();
}

const beginCourse = (e) => {
	// TODO 处理逻辑
	// 开始上课，同时打开录音
	user.isInClass = !user.isInClass;
	user.isRecord = !user.isRecord;
	e.target.innerHTML = user.isInClass
		? '<i class="mdui-icon material-icons">settings_power</i>结束课程'
		: '<i class="mdui-icon material-icons">power_settings_new</i>开始课程';
};

const pauseCourse = (e) => {
	// TODO 处理逻辑
	user.isInClass = !user.isInClass;
	e.target.innerHTML = user.isInClass
		? '<i class="mdui-icon material-icons">settings_voice</i>暂停录音'
		: '<i class="mdui-icon material-icons">keyboard_voice</i>继续录音';
};
