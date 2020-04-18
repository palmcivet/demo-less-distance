/**
 * Utils.js - 公共库
 */

/* =============== 以下为公共数据结构 =============== */

const wsType = {
	chat: "chat",
	enter: "enter",
	leave: "leave",
	begin: "begin",
	finish: "finish",
	slide: "slide",
	note: "note",
	record: "record",
};

const user = {
	class: {
		isInClass: false, // 是否正在上课
		isRecord: false, // 是否正在录音
		speaker: "",
		courseName: "", // 课程名
		startTime: "", // 开始时间
		clockID: null, //计时器
		clock: 0, //计时器
	},
	online: 0,
	connection: null, // WS 连接
	username: "", // 用户名
	permission: false, // 身份
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

/* =============== 以下为公共函数 =============== */

// 发送系统通知
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

// 发送 WS 信息
const sendText = (msg) => {
	if (user.connection.ws) {
		// DEV
		console.log(msg);
		user.connection.sendMessage(msg);
	} else {
		sendInform("已掉线，正在帮您重连", "error");
		user.connection.connect();
		setTimeout(() => sendText(msg), 2000);
	}
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

// 处理开始课程的逻辑
const handleBegin = (message) => {
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
};

// 处理结束课程的逻辑
const handleFinish = (message) => {
	clearInterval(user.class.clockID);
	sendInform("《" + user.class.courseName + "》" + " 结束", "info");
	// DEV 测试时延
	let $clock = $("#clock");
	$clock.children().map((i) => console.log($("#clock").children()[i].innerText));

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
};

/* =============== 以下为初始化 =============== */

// 获取信息、建立 WebSocket 连接
const initWebSocket = () => {
	user.username = localStorage.getItem("username") || "Developer-Stu"; // DEV
	user.permission = localStorage.getItem("permission") === "true" ? true : false;

	const ws = {
		socketOnOpen: () =>
			sendText({
				type: wsType.enter,
				name: user.username,
				role: user.permission,
			}),
		socketOnClose: () => sendInform("您已离开教室", "info"),
		socketOnMessage: (msg) => handler(msg),
		socketOnError: (e) => {
			console.log(e);
		},
		socketUrl: "wss://www.uiofield.top/lessDistance/websocket",
	};

	user.connection = new Socket(ws);
	user.connection.connect();
};

// 初始化节点
const initNode = () => {
	config.canvasCtx = config.canvasNode.getContext("2d");
	config.paintNode = $("#canvas-paint")[0];
	config.paintCtx = config.paintNode.getContext("2d");
	config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";
};

// 监听聊天框发送方式的切换
const listenChatBox = () => {
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
};
