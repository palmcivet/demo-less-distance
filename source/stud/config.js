const user = {
	isInClass: false, // 是否正在上课
	courseName: "", // 课程名
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
};
