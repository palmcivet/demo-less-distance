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
	console.log(message);

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
			break;
		case wsType.finish:
			config.slideNode.src = "";
			config.noteNode.src = "";
			handleFinish(message);
			break;
		case wsType.slide:
			config.slideNode.src = message.slide;
			config.noteNode.src = "";
			break;
		case wsType.note:
			config.noteNode.src = message.note;
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

	let exportBlob = new Blob([html]);
	let blobUrl = window.URL.createObjectURL(exportBlob);
	let proxy = $("#download")[0];
	proxy.href = blobUrl;
	let time = new Date();

	proxy.download =
		"笔记_" +
		time.getMonth() +
		"月" +
		time.getDate() +
		"日_" +
		time.getHours() +
		"_" +
		time.getSeconds() +
		".html";
	proxy.click();
	window.URL.revokeObjectURL(exportBlob);
};
