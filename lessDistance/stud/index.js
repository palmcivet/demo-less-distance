const config = {
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	slideNode: $("#slide-proxy")[0], // slide 的 img 代理
	noteNode: $("#note-proxy")[0], // 标注的 img 代理
	editorNode: null, // 笔记节点
};

$(() => {
	handleSignin(); // 获取信息
	initWebSocket(); // 建立 WebSocket 连接

	if (null === (config.canvasNode = $("#canvas-node")[0])) {
		alert("您的浏览器不支持 Canvas");
		return;
	} else {
		listenChatBox(); // 监听聊天框发送方式的切换

		// 初始化富文本编辑器
		let E = window.wangEditor;
		let editor;
		config.editorNode = editor = new E("#editor");

		editor.customConfig.pasteIgnoreImg = false;
		editor.customConfig.pasteFilterStyle = false;
		editor.customConfig.uploadImgShowBase64 = true;
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
		editor.create();
	}
});

const handler = (msg) => {
	message = JSON.parse(msg.data);

	switch (message.type) {
		case wsType.enter:
			recvNotify(message, true);
			handleOnline(message.online);
			if (message.class) {
				$("#present").hide();
				user.class.speaker = message.class.speaker;
				user.class.courseName = message.class.course;
				user.class.startTime = message.class.beginning;
				config.slideNode.src = message.class.slide;
				config.noteNode.src = message.class.note;
				config.slideNode.width = message.class.width;
				config.slideNode.height = message.class.height;
				config.noteNode.width = message.class.width;
				config.noteNode.height = message.class.height;
				user.class.audio = new AudioContext();
				config.noteNode.setAttribute("style", "opacity: unset");
				sendInform("欢迎进入课堂", "info");
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
			config.slideNode.width = message.width;
			config.slideNode.height = message.height;
			config.noteNode.width = message.width;
			config.noteNode.height = message.height;
			config.slideNode.src = message.slide;
			config.noteNode.src = message.note;
			user.class.audio = new AudioContext();
			config.noteNode.setAttribute("style", "opacity: unset");
			break;
		case wsType.finish:
			config.noteNode.setAttribute("style", "opacity: 0");
			config.slideNode.src = "";
			config.noteNode.src = "";
			handleFinish(message);
			break;
		case wsType.slide:
			config.slideNode.src = message.slide;
			config.noteNode.src = "";
			config.noteNode.setAttribute("style", "opacity: 0");
			break;
		case wsType.note:
			config.noteNode.src = message.note;
			break;
		case wsType.ques:
			$("#Q-A").show();
			$("#Q-A").children().eq(0).text(message.ques);
			user.class.rTime = Date.now();
			setTimeout(
				() => (user.class.other = handleClock(Date.now() + message.time * 60000)),
				30000
			); // 0.5 分钟读题
			break;
		case wsType.answ:
			$("#Q-A").children().eq(1).val(message.answ);
			$("#Q-A").children().eq(2).hide();
			$("#Q-A").children().eq(3).hide();
			$("#Q-A").children().eq(4).show();
			user.class.other = setTimeout(() => handleConfirm(), 150000); // 默认 2.5 分钟
			break;
		default:
			break;
	}
};

// 保存笔记
const saveNote = (e) => {
	if ("<p><br></p>" === (note = config.editorNode.txt.html())) {
		sendInform("笔记为空，无需保存", "info");
		return;
	}

	const style = `
section {
	width: 70%;
	margin: 0 auto;
}
table {
  border-top: 1px solid #ccc;
  border-left: 1px solid #ccc;
}
table td,
table th {
  border-bottom: 1px solid #ccc;
  border-right: 1px solid #ccc;
  padding: 3px 5px;
}
table th {
  border-bottom: 2px solid #ccc;
  text-align: center;
}
blockquote {
  display: block;
  border-left: 8px solid #d0e5f2;
  padding: 5px 10px;
  margin: 10px 0;
  line-height: 1.4;
  font-size: 100%;
  background-color: #f1f1f1;
}
code {
  display: inline-block;
  *display: inline;
  *zoom: 1;
  background-color: #f1f1f1;
  border-radius: 3px;
  padding: 3px 5px;
  margin: 0 3px;
}
pre code {
  display: block;
}
ul, ol {
  margin: 10px 0 10px 20px;
}`;
	const html = `
<html lang="zh">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>无距远程课堂 听课笔记</title>
</head>
<style>
	${style}
</style>
<body>
	<section>
		${note}
	</section>
</body>
</html>`;

	let time = new Date();
	saveFile(
		new Blob([html], { type: "text/plain" }),
		"笔记_" +
			time.getMonth() +
			"月" +
			time.getDate() +
			"日_" +
			time.getHours() +
			"_" +
			time.getSeconds() +
			".html"
	);
};

// 提交回答
const handleSubmit = (answ = "") => {
	if (!answ && !(answ = $("#Q-A").children().eq(1).val())) {
		sendInform("请作答", "info");
	} else {
		sendText({
			type: wsType.answ,
			answ,
			time: Math.floor((Date.now() - user.class.rTime) / 1000),
		});
	}
	clearInterval(user.class.other); // 此处为答题倒计时
};

// 确认关闭
const handleConfirm = () => {
	clearInterval(user.class.other);
	$("#Q-A").hide();
	$("#Q-A").children().eq(0).val("");
	$("#Q-A").children().eq(1).val("");
	$("#Q-A").children().eq(2).show();
	$("#Q-A").children().eq(3).show();
	$("#Q-A").children().eq(4).hide();
};

const handleClock = (time) => {
	user.class.other = setTimeout(() => {
		$("#Q-A")
			.children()
			.eq(2)
			.text(
				`剩余时间 ${("0" + Math.floor(time / 3600).toString()).slice(-2)}:${(
					"0" + Math.floor(time / 60).toString()
				).slice(-2)}:${("0" + Math.floor(time % 60).toString()).slice(-2)}`
			);
		if (Date.now() - time === 0) {
			clearInterval(user.class.other);
			handleSubmit(" ");
		} else {
			handleClock(time);
		}
	}, 1000);
};
