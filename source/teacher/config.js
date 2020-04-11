const typeStyle = [
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

const user = {};

const config = {
	libSrc: "../script/pdf.worker.min.js", // Lib 的 work 目录
	pdfURL: "../test/src.pdf", // 路径|ArrayBuffer
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
	proxyNode: null, // 文本工具的 canvas 代理
};

const store = {
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	currentPage: 0, // 当前页
	currentScale: null, // 缩放比例
	// 绘图
	drawingSurface: null, // 保存绘图表面
	mouseDown: null, // 保存鼠标按下时的 canvas 坐标
	dragging: false, // 标识鼠标是否处于拖拽状态
	color: "red", //笔触颜色
	size: 14, // 笔触粗细
	type: 0, //笔触类型
};
