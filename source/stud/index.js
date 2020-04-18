const config = {
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	imageNode: $("#img-proxy")[0], // 标注的 img 代理
	editorNode: null, // 笔记节点
};

$(() => {
	if (null === (config.canvasNode = $("#canvas-node")[0])) {
		alert("您的浏览器不支持 Canvas");
		return;
	} else {
		initNode(); // 初始化节点
		listenChatBox(); // 监听聊天框发送方式的切换

		// 初始化富文本编辑器
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
			handleBegin(message);
			break;
		case wsType.finish:
			handleFinish(message);
			break;
		default:
			// DEV
			console.log("未捕获：" + message);
			break;
	}
};

// 保存笔记
const saveNote = (e) => {
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
		${config.editorNode.txt.html()}
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
};
