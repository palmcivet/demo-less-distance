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

		// 生成工具栏
		let ul = typeStyle.map((i, j) => `<li>${genIcon(j)}</li>`);
		$("ul").append(ul);
		for (let item = 0; item < typeStyle.length; item++) {
			$("ul li")[item].onclick = () => changeType(item);
			if (item === 0) {
				changeType(0, true);
			}
		}

		// 就绪后设置监听器
		config.proxyNode.addEventListener("compositionstart", (e) => {
			e.target.inputStatus = "CHINESE_TYPING";
		});
		config.proxyNode.addEventListener("input", (e) => {
			if (e.target.inputStatus !== "CHINESE_TYPING") {
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}
		});
		config.proxyNode.addEventListener("compositionend", (e) => {
			setTimeout(() => {
				e.target.inputStatus = "CHINESE_TYPE_END";
				toolBox[typeStyle[5]](store.mouseDown, e.target.value);
			}, 100);
		});
	}
});

$("#load")[0].addEventListener("change", () => {
	let fr = new FileReader();
	fr.readAsArrayBuffer($("#load")[0].files[0]);
	fr.onload = () => {
		pdfjsLib.getDocument((config.pdfURL = fr.result)).promise.then(
			(pdf) => {
				store.pdfContent = pdf;
				store.pdfPageNum = store.pdfContent._pdfInfo.numPages;
				gotoPage((store.currentPage = 1));
				// 设置监听器
				config.paintNode.addEventListener("mousedown", (event) => {
					if (store.type === 5) {
						config.proxyNode.value = null;
						$("#proxy").css({
							left: event.clientX,
							top: event.clientY,
						});
					}
					store.mouseDown = windowToCanvas(event.clientX, event.clientY);
					store.dragging = true;
					saveDrawingSurface();
				});
				config.paintNode.addEventListener("mousemove", (event) => {
					let mouseMove = windowToCanvas(event.clientX, event.clientY);
					if (
						mouseMove.x <= config.paintNode.width ||
						mouseMove.y <= config.paintNode.height
					) {
						if (store.type === 5) {
							event.target.style["cursor"] = "text";
						} else if (store.type === 0) {
							event.target.style["cursor"] = "default";
						} else if (store.dragging && store.type !== 0) {
							event.target.style["cursor"] = "crosshair";
							restoreDrawingSurface();
							let toolId = typeStyle[store.type];
							toolBox[toolId](mouseMove);
						}
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
