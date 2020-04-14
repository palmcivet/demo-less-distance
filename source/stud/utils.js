// 发送 WS 信息
const sendText = (msg) => {
	if (user.communication.ws) {
		user.communication.sendMessage(msg);
	} else {
		// TODO 错误处理
		console.log("offline");
		user.communication.connect();
	}
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
