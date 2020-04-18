$(() => {
	user.username = localStorage.getItem("username") || "Developer-Stu"; // DEV
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
		alert("您的浏览器不支持 Canvas");
		return;
	} else {
		// 初始化节点
		config.canvasCtx = config.canvasNode.getContext("2d");
		config.paintNode = $("#canvas-paint")[0];
		config.paintCtx = config.paintNode.getContext("2d");
		config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";

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

		// 富文本编辑器
		let E = window.wangEditor;
		let editor;
		config.editorNode = editor = new E("#editor");

		editor.customConfig.menus = [
			"undo", // 撤销
			"redo", // 重复
			"bold", // 粗体
			"italic", // 斜体
			"underline", // 下划线
			"strikeThrough", // 删除线
			"quote", // 引用
			"table", // 表格
			"head", // 标题
			"fontSize", // 字号
			"foreColor", // 文字颜色
			"justify", // 对齐方式
			"list", // 列表
			"code", // 插入代码
			"video", // 插入视频
			"link", // 插入链接
		];
		editor.customConfig.pasteIgnoreImg = false;
		editor.customConfig.pasteFilterStyle = false;
		editor.customConfig.uploadImgShowBase64 = true;
		editor.create();
	}
});

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
function recvText(msg) {
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
	div.innerHTML = `<span>${msg.name}</span><span>${new Date()
		.toTimeString()
		.slice(0, 8)}</span>`;
	let p = document.createElement("p");
	p.innerText = msg.msg.replace(/"\n"/g, "<br>");
	div.appendChild(p);
	$("#chat-message").append(div);
	$("#chat-message")[0].scrollTop = $("#chat-message")[0].scrollHeight;
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

const handler = (msg) => {
	message = JSON.parse(msg.data);

	switch (message.type) {
		case wsType.enter:
			recvNotify(message, true);
			if (message.class) {
				user.class.speaker = message.class.speaker;
				user.class.courseName = message.class.course;
				user.class.startTime = message.class.beginning;
				user.online = message.online;
				sendInform("重连成功", "info");
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
			$("#clock").empty();
			$("#clock").append(
				`<p><i class="mdui-icon material-icons">free_breakfast</i> 当前没有课程</p>
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
