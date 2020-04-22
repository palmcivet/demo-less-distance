class SAudioData {
	constructor(rate) {
		this.size = 0; // 录音文件长度
		this.buffer = []; // 录音缓存
		this.inputSampleRate = rate; // 输入采样率
		this.outputSampleRate = 44100 / 6; // 输出的采样率,取决于平台
		this.inputSampleBits = 16; // 输入采样位数 8, 16
		this.outputSampleBits = 8; // 输出采样位数 8, 16
	}

	// 填入缓冲区
	inputData = function (data) {
		this.buffer.push(new Float32Array(data));
		this.size += data.length;
	};

	// 清理缓冲区
	clearData = function () {
		this.size = 0;
		this.buffer = [];
	};

	// 合并压缩
	compress = function () {
		var data = new Float32Array(this.size);
		var offset = 0;
		for (var i = 0; i < this.buffer.length; i++) {
			data.set(this.buffer[i], offset);
			offset += this.buffer[i].length;
		}
		// 压缩
		var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
		var length = data.length / compression;
		var result = new Float32Array(length);
		var index = 0,
			j = 0;
		while (index < length) {
			result[index] = data[j];
			j += compression;
			index++;
		}
		return result;
	};

	/**
	 * 编码为 WAV
	 * @returns {ArrayBuffer}
	 */
	encodeWAV = function () {
		var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
		var sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
		var bytes = this.compress();
		var dataLength = bytes.length * (sampleBits / 8);
		var buffer = new ArrayBuffer(44 + dataLength);
		var data = new DataView(buffer);

		var channelCount = 1; // 单声道
		var offset = 0;

		var writeString = function (str) {
			for (var i = 0; i < str.length; i++) {
				data.setUint8(offset + i, str.charCodeAt(i));
			}
		};

		writeString("RIFF"); // 资源交换文件标识符
		offset += 4;
		data.setUint32(offset, 36 + dataLength, true); // 下个地址开始到文件尾总字节数，即文件大小 -8
		offset += 4;
		writeString("WAVE"); // WAV 文件标志
		offset += 4;
		writeString("fmt "); // 波形格式标志
		offset += 4;
		data.setUint32(offset, 16, true); // 过滤字节,一般为 0x10 = 16
		offset += 4;
		data.setUint16(offset, 1, true); // 格式类别 (PCM 形式采样数据)
		offset += 2;
		data.setUint16(offset, channelCount, true); // 通道数
		offset += 2;
		data.setUint32(offset, sampleRate, true); // 采样率，每秒样本数,表示每个通道的播放速度
		offset += 4;
		data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
		offset += 4;
		data.setUint16(offset, channelCount * (sampleBits / 8), true); // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
		offset += 2;
		data.setUint16(offset, sampleBits, true); // 每样本数据位数
		offset += 2;
		writeString("data"); // 数据标识符
		offset += 4;
		data.setUint32(offset, dataLength, true); // 采样数据总数，即数据总大小-44
        offset += 4;

        // 写入数据
		if (sampleBits === 8) {
			for (var i = 0; i < bytes.length; i++, offset++) {
				var s = Math.max(-1, Math.min(1, bytes[i]));
				var val = s < 0 ? s * 0x8000 : s * 0x7fff;
				val = parseInt(255 / (65535 / (val + 32768)));
				data.setInt8(offset, val, true);
			}
		} else {
			for (var i = 0; i < bytes.length; i++, offset += 2) {
				var s = Math.max(-1, Math.min(1, bytes[i]));
				data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
			}
        }

		return data;
		//  return new Blob([data], { type: "audio/wav" });
	};
}

class SRecorder {
	constructor(stream) {
		this.clock = null; // 循环定时器
		// 音频处理接口
		this.audioContext = new AudioContext();
		// 通过音频流创建输入音频对象
		this.audioInput = this.audioContext.createMediaStreamSource(stream);
		// 创建音频数据对象
		this.audioData = new SAudioData(this.audioContext.sampleRate);
		// 创建音量对象
		this.audioVolume = this.audioContext.createGain();
		// 创建录音机对象
		this.recorder = this.audioContext.createScriptProcessor(4096, 1, 1);
		this.recorder.onaudioprocess = (e) => {
			this.audioData.inputData(e.inputBuffer.getChannelData(0));
		};
	}

	// 开始录音
	start = function (callback = null) {
		this.audioInput.connect(this.audioVolume);
		this.audioVolume.connect(this.recorder);
		this.recorder.connect(this.audioContext.destination);
		callback && this.cycle(callback);
	};

	// 停止录音
	stop = function () {
		this.recorder.disconnect();
		clearTimeout(this.clock);
	};

	// 获取 WAV 数据
	getWav = function () {
		return this.audioData.encodeWAV();
	};

	// 清除缓冲区
	clear = function () {
		this.audioData.clearData();
	};

	// 循环拉取缓冲数据，使用 `callback()` 发送出去，该方法适用于流
	cycle = function (callback) {
		callback && callback(this.getWav());
		this.clear();
		this.clock = setTimeout(this.cycle, 500);
	};
}

var gRecorder = null;
var ws = new WebSocket("wss://www.uiofield.top/lessDistance/voice");

ws.onmessage = function (e) {
	document.querySelector("audio").src = window.URL.createObjectURL(e.data);
};

navigator.mediaDevices
	.getUserMedia({ audio: true, video: false })
	.then((stream) => {
		gRecorder = new SRecorder(stream);
	})
	.catch((error) => console.log(error));
