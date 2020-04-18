$(() => {
	user.username = localStorage.getItem("username") || "Developer-Teac"; // DEV
	user.permission = localStorage.getItem("permission") === "true" ? true : false;

	const ws = {
		socketOnOpen: () => {},
		socketOnClose: () => sendInform("您已离开教室", "info"),
		socketOnMessage: (msg) => handler(msg),
		socketOnError: (e) => {
			console.log(e);
		},
		socketUrl: "wss://www.uiofield.top/lessDistance/websocket",
	};

	user.communication = new Socket(ws);
	user.communication.connect();

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
							store.mouseDown = windowToCanvas(
								event.clientX,
								event.clientY
							);
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
									toolBox[lineStyle[store.type]](mouseMove);
								}
							}
						});
						config.paintNode.addEventListener("mouseup", (event) => {
							store.dragging = false;
							if (store.type === 5) {
								config.proxyNode.focus();
							} else {
								let mouseUp = windowToCanvas(
									event.clientX,
									event.clientY
								);
								store.drawingRing.do(
									toolBox[lineStyle[store.type]],
									mouseUp
								);
							}
						});
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
		$("ul").append(ul);
		for (let item = 0; item < lineStyle.length; item++) {
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
				// toolBox[lineStyle[5]](store.mouseDown, e.target.value);
				store.drawingRing.do(
					toolBox[lineStyle[5]],
					store.mouseDown,
					e.target.value
				);
			}
		});
		config.proxyNode.addEventListener("compositionend", (e) => {
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
		turnPage(parseInt(e.target.value));
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
const recvText = (message) => {
	let div = document.createElement("div");
	if (message.name === user.username) {
		div.setAttribute("class", "self");
	} else {
		if (message.role) {
			div.setAttribute("class", "teac");
		} else {
			div.setAttribute("class", "stud");
		}
	}
	div.innerHTML = `<span>${message.name}</span><span>${new Date()
		.toTimeString()
		.slice(0, 8)}</span>`;
	let p = document.createElement("p");
	p.innerText = message.msg.replace(/"\n"/g, "<br>");
	div.appendChild(p);
	$("#chat-message").append(div);
	$("#chat-message")[0].scrollTop = $("#chat-message")[0].scrollHeight;
};

// 处理聊天通知
const recvNotify = (notify, mode) => {
	if (notify.type == wsType.enter) {
		let div = document.createElement("div");

		if (notify.role) {
			div.setAttribute("class", "notify t");
		} else {
			div.setAttribute("class", "notify s");
		}

		div.innerHTML = `<span>${
			notify.name.length > 16 ? notify.name.slice(16) + "..." : notify.name
		}</span><span> ${mode ? "进入教室" : "已离开教室"}</span>`;
		$("#chat-message").append(div);
		$("#chat-message")[0].scrollTop = $("#chat-message")[0].scrollHeight;
	}
};

// 更改课程名
const changeCourse = (e) => {
	if ($("#course-input")[0].disabled) {
		$("#course-input")[0].disabled = false;
		e.target.innerHTML = '<i class="mdui-icon material-icons">spellcheck</i>';
		e.target.title = "完成";
		$("#course-input").focus();
	} else {
		$("#course-input")[0].disabled = true;
		e.target.innerHTML = '<i class="mdui-icon material-icons">mode_edit</i>';
		e.target.title = "更改";
		sendInform("课程名已更改", "info");
	}
};

const toggleCourse = (e) => {
	if (!user.class.isInClass) {
		$("#present").hide();
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
				slide: config.canvasNode.toDataURL("image/png"),
				note: config.paintNode.toDataURL("image/png"),
			});
			// 开始上课，同时打开录音
			// startTime 字段在收到 begin 消息填写，使用服务器时间
			user.class.isInClass = !user.class.isInClass;
			user.class.isRecord = !user.class.isRecord;
			user.class.speaker = user.username;
			user.class.courseName = course;
		}
	} else {
		sendText({
			type: wsType.finish,
			speaker: user.username,
		});
		user.class.isInClass = false;
		user.class.isRecord = false;
	}
	$("#toggleCourse")[0].innerHTML = user.class.isInClass
		? '<i class="mdui-icon material-icons mdui-text-color-red-a400">settings_power</i>结束课程'
		: '<i class="mdui-icon material-icons">power_settings_new</i>开始课程';
	$("#toggleRecord")[0].innerHTML = user.class.isRecord
		? '<i class="mdui-icon material-icons mdui-text-color-red-a400">settings_voice</i>暂停录音'
		: '<i class="mdui-icon material-icons">keyboard_voice</i>继续录音';
};

const toggleRecord = (e) => {
	if (user.class.isInClass) {
		// TODO WebRTC
		user.class.isRecord = !user.class.isRecord;
		$("#toggleRecord")[0].innerHTML = user.class.isRecord
			? '<i class="mdui-icon material-icons mdui-text-color-red-a400">settings_voice</i>暂停录音'
			: '<i class="mdui-icon material-icons">keyboard_voice</i>继续录音';
	} else {
		sendInform("当前未开课", "info");
	}
};

const handler = (msg) => {
	message = JSON.parse(msg.data);
	// DEV
	console.log("recv", message);

	switch (message.type) {
		case wsType.enter:
			recvNotify(message, true);
			if (message.class) {
				if (message.class.speaker === user.username) {
					user.class.speaker = message.class.speaker;
					user.class.courseName = message.class.course;
					user.class.startTime = message.class.beginning;
					user.online = message.online;
					sendInform("重连成功", "info");
				} else {
					window.location = "/stud/index.html";
				}
			}
			break;
		case wsType.leave:
			recvNotify(message, false);
			user.online--;
			break;
		case wsType.chat:
			recvText(message);
			break;
		case wsType.begin:
			$(
				"#clock"
			).children()[0].innerHTML = `<i class="mdui-icon material-icons">access_alarm</i> 课程已进行`;
			user.class.speaker = message.speaker;
			user.class.courseName = message.course;
			user.class.startTime = message.beginning;
			user.class.clockID = setInterval(() => {
				let time = ++user.class.clock;
				let clock = $("#clock").children();
				clock[1].innerText = ("0" + Math.floor(time / 3600).toString()).slice(-2);
				clock[2].innerText = ("0" + Math.floor(time / 60).toString()).slice(-2);
				clock[3].innerText = ("0" + Math.floor(time % 60).toString()).slice(-2);
			}, 1000);
			break;
		case wsType.finish:
			clearInterval(user.class.clockID);
			sendInform("《" + user.class.courseName + "》" + " 结束", "info");
			// DEV 测试时延
			let $clock = $("#clock");
			$clock
				.children()
				.map((i) => console.log($("#clock").children()[i].innerText));

			$clock.empty();
			$clock.append(
				`<p><i class="mdui-icon material-icons">free_breakfast</i> 当前未开课</p>
					<span>00</span> : <span>00</span> : <span>00</span>`
			);
			// 生成报告
			$("#present").show();
			$("#present").children()[0].innerHTML = `<h1>${user.class.courseName}</h1>
				<span class="k">授课人</span><span class="v">${message.speaker}</span>
				<span class="k">开始于</span><span class="v">${message.beginning}</span>
				<span class="k">课程时长</span><span class="v">${message.duration}</span>`;

			// 收尾
			user.class.isInClass = false;
			user.class.isRecord = false;
			user.class.speaker = "";
			user.class.courseName = "";
			user.class.startTime = "";
			user.class.clockID = null;
			user.class.clock = 0;
			break;
		default:
			// DEV
			console.log("未捕获：" + message);
			break;
	}
};
