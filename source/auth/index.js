const rootUrl = "https://www.uiofield.top/lessDistance";

let verifyCode = new GVerify({ id: "code" });

function signin(e = null) {
	if (e === null || e.keyCode === 13) {
		if ($("input[name='usertype']:checked").val() === undefined) {
			sendInform("请选择用户类型", "warn");
		} else if ($("#username").val() === "") {
			sendInform("账号为空", "warn");
		} else if ($("#password").val() === "") {
			sendInform("密码为空", "warn");
		} else if ($("#verify").val() === "") {
			sendInform("验证码为空", "warn");
		} else {
			if (verifyCode.validate($("#verify").val())) {
				$.ajax({
					method: "POST",
					url: rootUrl + "/interface/login",
					headers: {
						"Content-Type": "application/json",
					},
					xhrFields: {
						withCredentials: true,
					},
					data: JSON.stringify({
						username: $("#username").val(),
						password: $("#password").val(),
						permission: $("input[name='usertype']:checked").val(),
					}),
					success: function (data) {
						if (data.code === 1) {
							localStorage.setItem("username", $("#username").val());
							localStorage.setItem(
								"permission",
								$("input[name='usertype']:checked").val()
							);
							if (data.info === true) {
								window.location = "/teacher/index.html";
							} else {
								window.location = "/student/index.html";
							}
						} else {
							// TODO 优化警告
							sendInform(data.message, "warn");
						}
					},
				});
			} else {
				sendInform("验证码错误", "warn");
				$("#verify").val("");
				verifyCode = new GVerify({ id: "code" });
			}
		}
	}
}

function signup(e = null) {
	if (e === null || e.keyCode === 13) {
		if ($("input[name='usertype']:checked").val() === undefined) {
			sendInform("请选择用户类型", "warn");
		} else if ($("#username").val() === "") {
			sendInform("账号为空", "warn");
		} else if ($("#password").val() === "") {
			sendInform("密码为空", "warn");
		} else if ($("#repeat").val() !== $("#password").val()) {
			sendInform("密码不一致", "warn");
			$("#repeat").val("");
			return;
		} else {
			$.ajax({
				method: "POST",
				url: rootUrl + "/interface/register",
				headers: {
					"Content-Type": "application/json",
				},
				xhrFields: {
					withCredentials: true,
				},
				data: JSON.stringify({
					username: $("#username").val(),
					password: $("#password").val(),
					permission: $("input[name='usertype']:checked").val(),
				}),
				success: function (data) {
					if (data.code === 13) {
						window.location = "/auth/signin.html";
					} else {
						sendInform(data.message, "warn");
					}
				},
			});
		}
	}
}

function sendInform(msg, type, time = 2000) {
	let p = document.createElement("p");

	switch (type) {
		case "warn":
			p.setAttribute("class", "warn");
			p.innerHTML = `<i class="mdui-icon material-icons">warning</i>  ${msg}`;
			break;
		case "error":
			p.setAttribute("class", "error");
			p.innerHTML = `<i class="mdui-icon material-icons">error</i>  ${msg}`;
			break;
		default:
			p.setAttribute("class", "info");
			p.innerHTML = `<i class="mdui-icon material-icons">notifications</i> ${msg}`;
			break;
	}
	$("#notify-box")[0].append(p);

	return setTimeout(() => $("#notify-box").children()[0].remove(), time + 2000);
}
