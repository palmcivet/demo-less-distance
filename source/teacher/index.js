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
	proxyNode: null,
};

const store = {
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	currentPage: 0, // 当前页
	currentScale: 1, // 缩放比例
	// 绘图
	drawingSurface: null, // 保存绘图表面
	mouseDown: null, // 保存鼠标按下时的 canvas 坐标
	dragging: false, // 标识鼠标是否处于拖拽状态
	color: "red",
	size: 14,
	type: 0,
};

$(document).ready(() => {
	if (null === (config.canvasNode = $("#canvas-node")[0])) {
		alert("您的浏览器不支持 Canvas");
	} else {
		config.proxyNode = $("#proxy")[0];
		config.canvasCtx = config.canvasNode.getContext("2d");
		config.paintNode = $("#canvas-paint")[0];
		config.paintCtx = config.paintNode.getContext("2d");
		config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";
		pdfjsLib.workerSrc = config.libSrc;
		// 生成标注工具

		let ul = typeStyle.map((i, j) => `<li>${genIcon(j)}</li>`);
		$("ul").append(ul);
		for (let item = 0; item < typeStyle.length; item++) {
			$("ul li")[item].onclick = () => changeType(item);
			if (item === 0) {
				changeType(0, true);
			}
		}

		config.proxyNode.addEventListener("compositionstart", (e) => {
			e.target.inputStatus = "CHINESE_TYPING";
			console.log("start");
		});
		config.proxyNode.addEventListener("input", (e) => {
			if (e.target.inputStatus !== "CHINESE_TYPING") {
				console.log(e.target.inputStatus);
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}
		});
		config.proxyNode.addEventListener("compositionend", (e) => {
			setTimeout(() => {
				console.log("end");
				e.target.inputStatus = "CHINESE_TYPE_END";
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}, 100);
		});
	}
});

$("#upload")[0].addEventListener("change", () => {
	let fr = new FileReader();
	fr.readAsArrayBuffer($("#upload")[0].files[0]);
	fr.onload = () => {
		pdfjsLib.getDocument((config.pdfURL = fr.result)).promise.then(
			(pdf) => {
				store.pdfContent = pdf;
				gotoPage((store.currentPage = 1));
				// 设置监听器
				config.paintNode.addEventListener("mousedown", (event) => {
					if (store.type === 5) {
						config.proxyNode.value = null;
					}
					store.mouseDown = windowToCanvas(event.clientX, event.clientY);
					store.dragging = true;
					saveDrawingSurface();
				});
				config.paintNode.addEventListener("mousemove", (event) => {
					if (store.dragging && store.type !== 0 && store.type !== 5) {
						restoreDrawingSurface();
						let mouseMove = windowToCanvas(event.clientX, event.clientY);
						let toolId = typeStyle[store.type];
						toolBox[toolId](mouseMove);
					}
				});
				config.paintNode.addEventListener("mouseup", (event) => {
					store.dragging = false;
					if (store.type === 5) {
						config.proxyNode.focus();
					}
				});
			},
			() => {
				// TODO: 优化提示
				console.log("error");
			}
		);
	};
});
