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
	ques: "ques",
	answ: "answ",
};

const user = {
	class: {
		isInClass: false, // 是否正在上课
		isRecord: false, // 是否正在录音
		audio: null, // 录音机对象
		speaker: "",
		courseName: "", // 课程名
		clock: 0, //计时器时间
		clockID: null, //计时器 ID
		qaTime: 0, // 问答计时器的时间
		qaID: null, // 问答计时器 ID
	},
	online: [], // 在线成员
	chatConnect: null, // WS 连接
	audioConnect: null, // 语音连接
	username: "", // 用户名
	permission: false, // 身份
};

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
					cleaqaTimeout(time);
				}
			}, this.timeout);
		}
	};

	onOpen = () => {
		let { socketOnOpen } = this.param;
		socketOnOpen && socketOnOpen();
		this.isSucces = false; // 连接成功将标识符改为 false
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
			this.ws.send(data);
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
				this.closeHandle("pingPong 没有改变为 pong"); // 没有返回 pong 重启 webSocket
			}
			// 重置为 ping 若下一次 ping 发送失败 或者 pong 返回失败(pingPong 不会改成 pong)，将重启
			console.log("返回 pong");
			this.pingPong = "ping";
		}, 20000);
	}
}

class SAudioData {
	constructor(rate) {
		this.size = 0; // 录音文件长度
		this.buffer = []; // 录音缓存
		this.inputSampleRate = rate; // 输入采样率
		this.outputSampleRate = 44100 / 6; // 输出的采样率,取决于平台
		this.inputSampleBits = 16; // 输入采样位数 8, 16
		this.outputSampleBits = 8; // 输出采样位数 8, 16
	}

	// 填入缓冲区
	inputData = (data) => {
		this.buffer.push(new Float32Array(data));
		this.size += data.length;
	};

	// 清理缓冲区
	clearData = () => {
		this.size = 0;
		this.buffer = [];
	};

	// 合并压缩
	compress = () => {
		var data = new Float32Array(this.size);
		var offset = 0;
		for (var i = 0; i < this.buffer.length; i++) {
			data.set(this.buffer[i], offset);
			offset += this.buffer[i].length;
		}
		// 压缩
		var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
		var length = data.length / compression;
		var result = new Float32Array(length);
		var index = 0,
			j = 0;
		while (index < length) {
			result[index] = data[j];
			j += compression;
			index++;
		}
		return result;
	};

	/**
	 * 编码为 WAV
	 * @returns {ArrayBuffer}
	 */
	encodeWAV = () => {
		var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
		var sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
		var bytes = this.compress();
		var dataLength = bytes.length * (sampleBits / 8);
		var buffer = new ArrayBuffer(44 + dataLength);
		var data = new DataView(buffer);

		var channelCount = 1; // 单声道
		var offset = 0;

		var writeString = function (str) {
			for (var i = 0; i < str.length; i++) {
				data.setUint8(offset + i, str.charCodeAt(i));
			}
		};

		writeString("RIFF"); // 资源交换文件标识符
		offset += 4;
		data.setUint32(offset, 36 + dataLength, true); // 下个地址开始到文件尾总字节数，即文件大小 -8
		offset += 4;
		writeString("WAVE"); // WAV 文件标志
		offset += 4;
		writeString("fmt "); // 波形格式标志
		offset += 4;
		data.setUint32(offset, 16, true); // 过滤字节,一般为 0x10 = 16
		offset += 4;
		data.setUint16(offset, 1, true); // 格式类别 (PCM 形式采样数据)
		offset += 2;
		data.setUint16(offset, channelCount, true); // 通道数
		offset += 2;
		data.setUint32(offset, sampleRate, true); // 采样率，每秒样本数,表示每个通道的播放速度
		offset += 4;
		data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
		offset += 4;
		data.setUint16(offset, channelCount * (sampleBits / 8), true); // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
		offset += 2;
		data.setUint16(offset, sampleBits, true); // 每样本数据位数
		offset += 2;
		writeString("data"); // 数据标识符
		offset += 4;
		data.setUint32(offset, dataLength, true); // 采样数据总数，即数据总大小-44
		offset += 4;

		// 写入数据
		if (sampleBits === 8) {
			for (var i = 0; i < bytes.length; i++, offset++) {
				var s = Math.max(-1, Math.min(1, bytes[i]));
				var val = s < 0 ? s * 0x8000 : s * 0x7fff;
				val = parseInt(255 / (65535 / (val + 32768)));
				data.setInt8(offset, val, true);
			}
		} else {
			for (var i = 0; i < bytes.length; i++, offset += 2) {
				var s = Math.max(-1, Math.min(1, bytes[i]));
				data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
			}
		}

		return data;
		//  return new Blob([data], { type: "audio/wav" });
	};
}

class SRecorder {
	constructor(stream) {
		this.clock = null; // 循环定时器
		// 音频处理接口
		this.audioContext = new AudioContext();
		// 通过音频流创建输入音频对象
		this.audioInput = this.audioContext.createMediaStreamSource(stream);
		// 创建音频数据对象
		this.audioData = new SAudioData(this.audioContext.sampleRate);
		// 创建音量对象
		this.audioVolume = this.audioContext.createGain();
		// 创建录音机对象
		this.recorder = this.audioContext.createScriptProcessor(4096, 1, 1);
		this.recorder.onaudioprocess = (e) => {
			this.audioData.inputData(e.inputBuffer.getChannelData(0));
		};
	}

	// 开始录音
	start = (callback = null) => {
		this.audioInput.connect(this.audioVolume);
		this.audioVolume.connect(this.recorder);
		this.recorder.connect(this.audioContext.destination);
		callback && this.cycle((data) => callback(data));
	};

	// 停止录音
	stop = () => {
		this.recorder.disconnect();
		clearTimeout(this.clock);
	};

	// 暂停录音
	pause = () => {
		this.audioVolume.disconnect();
		clearTimeout(this.clock);
	};

	// 继续录音
	continue = (callback = null) => {
		this.recorder.connect(this.audioContext.destination);
		callback && this.cycle((data) => callback(data));
	};

	// 获取 WAV 数据
	getWav = () => {
		return this.audioData.encodeWAV();
	};

	// 清除缓冲区
	clear = () => {
		this.audioData.clearData();
	};

	// 循环拉取缓冲数据，使用 `callback()` 发送出去，该方法适用于流
	cycle = (callback, time = 500) => {
		let bTime = new Date();
		callback(this.getWav());
		this.clear();
		this.clock = setTimeout(
			() => this.cycle((data) => callback(data), time),
			time - (new Date() - bTime)
		);
	};
}

/* =============== 以下为初始化 =============== */

// 建立 WebSocket 连接
const initWebSocket = () => {
	// 建立常规连接
	const chatWs = {
		socketOnOpen: () =>
			sendText({
				type: wsType.enter,
				name: user.username,
				role: user.permission,
			}),
		socketOnClose: () => sendInform("您已离开教室", "info"),
		socketOnMessage: (msg) => handler(msg),
		socketOnError: (e) => {
			console.error(e);
		},
		socketUrl: rootWs + "/lessDistance/websocket",
	};
	user.chatConnect = new Socket(chatWs);
	user.chatConnect.connect();

	// 建立语音连接
	const audioWs = {
		socketOnOpen: () => {},
		socketOnClose: () => sendInform("您已退出语音", "info"),
		socketOnMessage: (e) => {
			if (user.class.speaker !== user.username) {
				let context = user.class.audio;
				context.decodeAudioData(e.data).then((buffer) => {
					source = context.createBufferSource();
					source.buffer = buffer;
					source.connect(context.destination);
					source.start(0);
				});
			}
		},
		socketOnError: (e) => {
			console.error(e);
		},
		socketUrl: rootWs + "/lessDistance/voice",
	};
	user.audioConnect = new Socket(audioWs);
	user.audioConnect.connect();
	user.audioConnect.ws.binaryType = "arraybuffer";
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

/* =============== 以下为公共函数 =============== */

// 发送系统通知
function sendInform(msg, type, time = 2000, pos = { top: "10%", left: "10%" }) {
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
		case "info":
			p.setAttribute("class", "info");
			p.innerHTML = `<i class="mdui-icon material-icons">notifications</i>  ${msg}`;
			break;
		case "wait":
			p.setAttribute("class", "wait");
			p.innerHTML = `<div class="mdui-spinner mdui-spinner-colorful"></div>  ${msg}`;
			break;
		default:
			break;
	}
	$("#notify-box")[0].append(p);
	mdui.mutation();
	if (time) {
		return setTimeout(() => $("#notify-box").children()[0].remove(), time);
	}
}

// 保存文件
const saveFile = (blob, name) => {
	let blobUrl = window.URL.createObjectURL(blob);
	let proxy = $("a#download")[0];
	proxy.href = blobUrl;
	proxy.download = name;
	proxy.click();
	window.URL.revokeObjectURL(blobUrl);
};

// 发送 WS 信息
const sendText = (msg) => {
	if (user.chatConnect.ws) {
		user.chatConnect.sendMessage(JSON.stringify(msg));
	} else {
		sendInform("已掉线，正在帮您重连", "error");
		user.chatConnect.connect();
		setTimeout(() => sendText(msg), 2000);
	}
};

// 发送语音
const sendVoice = (data) => {
	if (user.audioConnect.ws) {
		user.audioConnect.sendMessage(data);
	} else {
		sendInform("已掉线，正在帮您重连", "error");
		user.audioConnect.connect();
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

// 更新在线成员
const handleOnline = (onlineArr) => {
	const $memberList = $("#chat-member ul");
	const memberItem = $memberList.children();
	if (onlineArr.length - 10 > user.online.length) {
		let list; // 每 10 组一次，防止短时间进入人数过多大量 DOM 操作
		for (let i = 0; i < 10; i++) {
			list += `<li class="mdui-ripple">${onlineArr[i]}</li>`;
		}
		$memberList.append(list);
	}
	user.online = onlineArr;
	$("#chat-member ul ~ div")
		.eq(0)
		.text("Online - " + onlineArr.length.toString() + " - Count");

	let i;
	for (i = 0; i < onlineArr.length; i++) {
		memberItem[i].innerHTML = `<span class="mdui-chip-icon">${onlineArr[i].slice(
			0,
			1
		)}</span><span class="mdui-chip-title">${onlineArr[i]}</span>`;
		memberItem[i].hidden = false;
	}
	for (let j = i; j < memberItem.length; j++) {
		memberItem[j].hidden = true;
	}
};

// 学生端处理开始课程的逻辑
const handleBegin = (message) => {
	$("#present").hide();
	$(
		"#clock"
	).children()[0].innerHTML = `<i class="mdui-icon material-icons">access_alarm</i> 课程已进行`;
	$("#course-name").text(message.course + " 课件");
	if (message.file) {
		$("#course-name").on("click", () => {
			let proxy = $("a#download")[0];
			proxy.href = message.file;
			proxy.download = message.course;
			proxy.target = "_blank";
			proxy.click();
			$("#course-name").addClass("hover");
		});
	}
	config.slideNode.width = message.width;
	config.slideNode.height = message.height;
	config.noteNode.width = message.width;
	config.noteNode.height = message.height;
	config.slideNode.src = message.slide;
	config.noteNode.src = message.note;
	config.noteNode.setAttribute("style", "opacity: unset");
	user.class.speaker = message.speaker;
	user.class.courseName = message.course;
	user.class.clock = Math.floor((new Date() - Date.parse(message.beginning)) / 1000);
	user.class.clockID = setClock(user.class.clock);
};

// 处理上课计时的表
const setClock = () =>
	setInterval(() => {
		let time = ++user.class.clock;
		let $clock = $("#clock").children();
		$clock[1].innerText = ("0" + Math.floor(time / 3600).toString()).slice(-2);
		$clock[2].innerText = ("0" + Math.floor(time / 60).toString()).slice(-2);
		$clock[3].innerText = ("0" + Math.floor(time % 60).toString()).slice(-2);
	}, 1000);

// 处理结束课程的逻辑
const handleFinish = (message) => {
	clearInterval(user.class.clockID);
	sendInform("《" + user.class.courseName + "》" + " 结束", "info");
	let $clock = $("#clock");
	$clock.empty();
	$clock.append(
		`<p><i class="mdui-icon material-icons">free_breakfast</i> 当前未开课</p>
            <span>00</span> : <span>00</span> : <span>00</span>`
	);
	// 生成报告
	$("#present").show();
	$("#present").children()[0].innerHTML = `<h1>${
		user.class.courseName + (user.permission ? "" : " 推荐视频")
	}</h1>
        <span class="k">授课人</span><span class="v">${message.speaker}</span>
        <span class="k">开始于</span><span class="v">${message.beginning}</span>
        <span class="k">课程时长</span><span class="v">${message.duration}</span>`;

	if (user.username === message.speaker) handleReport(message.info);

	// 收尾
	user.class.isInClass = false;
	user.class.isRecord = false;
	user.class.speaker = "";
	user.class.courseName = "";
	user.class.clockID = null;
	user.class.clock = 0;
};

// 生成报告
const handleReport = (arr) => {
	let res = `姓名,互动次数,讨论题回答,
`;
	arr.forEach((item) => {
		res = res + item.name + ",";
		res = res + item.count + ",";
		for (let ans = 0, l = item.answer.length; ans < l; ans++) {
			res = res + item.answer[ans] + ",";
		}
		// 模板字符串换行
		res += `
`;
	});

	let time = new Date();

	saveFile(
		new Blob([res], { type: "text/plain" }),
		"课程记录_" +
			time.getMonth() +
			"月" +
			time.getDate() +
			"日_" +
			time.getHours() +
			"_" +
			time.getSeconds() +
			".csv"
	);
};

// 获取文件名（不带扩展名）
const getFileName = (filename) => {
	let pos = filename.lastIndexOf(".");
	return filename.substring(0, pos);
};

/* =============== 以下为处理登入、登出 =============== */

// 登录后获取信息
const handleSignin = () => {
	user.username = localStorage.getItem("username");
	user.permission = localStorage.getItem("permission") === "true" ? true : false;
	$(".mdui-chip-title")[0].innerHTML = user.username;
};

// 注销登录后抹除信息
const handleSignout = () => {
	localStorage.removeItem("username");
	localStorage.removeItem("permission");
	location = "/lessDistance/auth/signin.html";
};
