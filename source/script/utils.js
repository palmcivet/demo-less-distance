const turnPage = (page) => {
	store.pdfContent.getPage(page).then(
		(resPage) => {
			let viewport = resPage.getViewport({ scale: 1 });
			let canvas = store.canvasNode;
			let context = store.canvasCtx;
			canvas.height = viewport.height;
			canvas.width = viewport.width;
			let renderContext = {
				canvasContext: context,
				viewport: viewport,
			};
			resPage.render(renderContext);
		},
		// TODO: 优化提示
		() => alert("页数超范围")
	);
};

const turnPrevPage = () => {
	turnPage(--store.currentPage);
};

const turnNextPage = () => {
	turnPage(++store.currentPage);
};
