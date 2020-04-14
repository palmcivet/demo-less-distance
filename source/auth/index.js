const rootUrl = "https://www.uiofield.top/lessDistance";

let verifyCode = new GVerify({ id: "code" });

function signin(e = null) {
	if (e === null || e.keyCode === 13) {
		let res = verifyCode.validate(document.getElementById("verify").value);
		if ($("input[name='usertype']:checked").val() === undefined) {
			// TODO 优化警告
			alert("请选择用户类型");
		} else if (res) {
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
						alert(data.message);
					}
				},
			});
		} else {
			// TODO 优化警告
			alert("验证码错误");
			$("#verify").val("");
			verifyCode = new GVerify({ id: "code" });
		}
	}
}

function signup(e = null) {
	if (e === null || e.keyCode === 13) {
		if ($("input[name='usertype']:checked").val() === undefined) {
			// TODO 优化警告
			alert("请选择用户类型");
		} else if ($("#repeat").val() !== $("#password").val()) {
			// TODO 优化警告
			alert("密码不一致");
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
						// TODO 优化警告
						alert(data.message);
					}
				},
			});
		}
	}
}
