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

const lineStyle = [
	"arrow",
	"line",
	"rectangle",
	"triangle",
	"circle",
	"text",
	// "pen",
	// "eraser",
	// "undo",
	// "redo",
];

const user = {
	class: {
		isInClass: false, // 是否正在上课
		isRecord: false, // 是否正在录音
		speaker: "",
		courseName: "", // 课程名
		startTime: "",
	},
	online: 0,
	communication: null, // WS 连接
	username: "", // 用户名
	permission: false, // 身份
};

const config = {
	libSrc: "../script/pdf.worker.min.js", // Lib 的 work 目录
	pdfURL: "../test/src.pdf", // 路径|ArrayBuffer
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	proxyNode: $("#textarea-proxy")[0], // 文本工具的 textarea 代理
	imageNode: $("#img-proxy")[0], // 标注的 img 代理
	pickerNode: $("#picker")[0], // 拾色器
	jumpNode: $("#jump")[0], // 跳转输入框
};

const store = {
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	pdfStorage: [], // 保存每一页标注
	currentPage: 0, // 当前页
	currentScale: null, // 缩放比例
	// 绘图
	drawingStack: [], // 历史记录栈
	drawingSurface: null, // 保存绘图表面
	mouseDown: null, // 保存鼠标按下时的 canvas 坐标
	dragging: false, // 标识鼠标是否处于拖拽状态
	color: "red", //笔触颜色
	size: 14, // 笔触粗细
	type: 0, //笔触类型
};
