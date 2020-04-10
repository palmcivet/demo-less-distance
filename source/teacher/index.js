const user = {};

const config = {
	libSrc: "../script/pdf.worker.min.js", // Lib 的 work 目录
	pdfURL: "../test/src.pdf", // 路径|ArrayBuffer
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
};

const store = {
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	currentPage: 0, // 当前页
	currentScale: 1, // 缩放比例
};

$(document).ready(() => {
	if (null === (config.canvasNode = document.getElementById("canvas-node"))) {
		alert("您的浏览器不支持 Canvas");
	} else {
		config.canvasCtx = config.canvasNode.getContext("2d");
		config.paintNode = document.getElementById("canvas-paint");
		config.paintCtx = config.paintNode.getContext("2d");
		config.paintNode.fillStyle = "rgba(255, 255, 255, 0)";
		pdfjsLib.workerSrc = config.libSrc;
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
			},
			() => {
				// TODO: 优化提示
				console.log("error");
			}
		);
	};
});
