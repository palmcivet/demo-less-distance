function getWebSocket() {
	/**
	 * WebSocket客户端 PS：URL开头表示WebSocket协议 中间是域名端口 结尾是服务端映射地址
	 */
	var webSocket = new WebSocket("ws://localhost:8080/chat");
	/**
	 * 当服务端打开连接
	 */
	webSocket.onopen = function (event) {
		console.log("WebSocket打开连接");
		console.log("onOpen be touched");
	};

	/**
	 * 当服务端发来消息：1.广播消息 2.更新在线人数
	 */
	webSocket.onmessage = function (event) {
		console.log("onMessage be touched");
		console.log("WebSocket收到消息：%c" + event.data, "color:green");
		//获取服务端消息
		var message = JSON.parse(event.data) || {};
		var $messageContainer = $(".message-container");

		if (message.type === "SPEAK") {
			$messageContainer.append(
				'<div class="mdui-card" style="margin: 10px 0;">' +
					'<div class="mdui-card-primary">' +
					'<div class="mdui-card-content message-content">' +
					message.username +
					"：" +
					message.msg +
					"</div>" +
					"</div></div>"
			);
			if (message.msg === "1") window.location = "/";
		}
		$(".chat-num").text(message.onlineCount);
		$messageContainer.scrollTop = $messageContainer.scrollHeight;
	};

	/**
	 * 关闭连接
	 */
	webSocket.onclose = function (event) {
		console.log("WebSocket关闭连接");
	};

	/**
	 * 通信失败
	 */
	webSocket.onerror = function (event) {
		console.log("WebSocket发生异常");
	};
	return webSocket;
}

var webSocket = getWebSocket();

/**
 * 通过WebSocket对象发送消息给服务端
 */
function sendMsgToServer() {
	var $message = $("#msg");
	if ($message.val()) {
		webSocket.send(
			JSON.stringify({ username: $("#username").text(), msg: $message.val() })
		);
		$message.val(null);
		$(".message-container").scrollTop = $(".message-container").scrollHeight;
		console.log($(".message-container").scrollHeight);
	}
}
/**
 * 清屏
 */
function clearMsg() {
	$(".message-container").empty();
}

/**
 * 使用ENTER发送消息
 */
document.onkeydown = function (event) {
	var e = event || window.event || arguments.callee.caller.arguments[0];
	e.keyCode === 13 && sendMsgToServer();
};
