let verifyCode = new GVerify({ id: "code" });

function login() {
	let res = verifyCode.validate(document.getElementById("verify").value);
	if (res) {
		alert("验证通过");
	} else {
		alert("验证码错误");
		verifyCode = new GVerify({ id: "code" });
	}
}
