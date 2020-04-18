const wsType = {
	chat: "chat",
	enter: "enter",
	leave: "leave",
	begin: "begin",
	finish: "finish",
	slide: "slide",
	note: "note",
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
	communication: null, // WS 连接
	username: "", // 用户名
	permission: false, // 身份
};

const config = {
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	imageNode: $("#img-proxy")[0], // 标注的 img 代理
	editorNode: null, // 笔记节点
};
