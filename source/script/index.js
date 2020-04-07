const store = {
	libSrc: "../script/pdf.worker.min.js", // Lib 的 work 目录
	pdfURL: "../test/src.pdf", // 路径|ArrayBuffer
	pdfContent: null, // `getDocument()` 返回的值
	pdfPageNum: 0, // PDF 页数
	currentPage: 0, // 当前页
	canvasNode: null, // canvas 节点，通过 ID 获取
	canvasCtx: null, // canvas 的 context
	paintNode: null, // paint 节点，通过 ID 获取
	paintCtx: null, // paint 的 context
};

$(document).ready(() => {
	if (null === (store.canvasNode = document.getElementById("canvas-node"))) {
		alert("您的浏览器不支持 Canvas");
	} else {
		store.canvasCtx = store.canvasNode.getContext("2d");
		store.paintNode = document.getElementById("canvas-paint");
		store.paintCtx = store.paintNode.getContext("2d");
		pdfjsLib.workerSrc = store.libSrc;
	}
});

$("#upload")[0].addEventListener("change", () => {
	let fr = new FileReader();
	fr.readAsArrayBuffer($("#upload")[0].files[0]);
	fr.onload = () => {
		pdfjsLib.getDocument((store.pdfURL = fr.result)).promise.then(
			(pdf) => {
				store.pdfContent = pdf;
				turnPage((store.currentPage = 1));
			},
			() => {
				// TODO: 优化提示
				console.log("error");
			}
		);
	};
});
