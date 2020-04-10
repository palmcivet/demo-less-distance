const gotoPage = (page, scale = 1) => {
	store.pdfContent.getPage(page).then(
		(resPage) => {
			let viewport = resPage.getViewport({ scale });
			// ALTER
			let canvas = config.canvasNode;
			let context = config.canvasCtx;
			canvas.height = viewport.height;
			canvas.width = viewport.width;
			let renderContext = {
				canvasContext: context,
				viewport: viewport,
			};
			resPage.render(renderContext);
			// ALTER
			store.currentScale = viewport.scale;
			config.paintNode.width = viewport.width;
			config.paintNode.height = viewport.height;
		},
		// TODO: 优化提示
		() => alert("页数超范围")
	);
};

const turnPrevPage = () => {
	gotoPage(--store.currentPage);
};

const turnNextPage = () => {
	gotoPage(++store.currentPage);
};

const zoomOut = () => {
	gotoPage(store.currentPage, store.currentScale - 0.1);
};

const zoomIn = () => {
	gotoPage(store.currentPage, store.currentScale + 0.1);
};
