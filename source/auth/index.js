const path = "http://localhost:8080/lessDistance";
//const path = "https://www.uiofield.top/lessDistance";

let verifyCode = new GVerify({ id: "code" });
const signin = () => {
	let res = verifyCode.validate(document.getElementById("verify").value);
	if ($("input[name='usertype']:checked").val() === undefined) {
		alert("请选择用户类型");
	}
	if (res) {
		$.ajax({
			method: "POST",
			url: path + "/interface/login",
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
					if (data.info === true) {
						window.location = path + "/source/teacher/index.html";
					} else {
						window.location = path + "/source/student/index.html";
					}
				} else {
					alert(data.message);
				}
			},
		});
	} else {
		alert("验证码错误");
		verifyCode = new GVerify({ id: "code" });
	}
};

const signup = () => {};
