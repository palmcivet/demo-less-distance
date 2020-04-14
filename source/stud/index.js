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
