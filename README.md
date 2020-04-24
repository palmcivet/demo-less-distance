[toc]

## 接口
登陆成功建立 WebSocket 连接

type：

- [x] chat：聊天消息。**直接广播**
    ```json
    {
        "type": "chat",
        "name": "123456",
        "role": true,
        "msg": "this is a message"
    }
    ```
- [x] enter：进入教室。**后端发送**
    - 前端
        ```json
        {
            "type": "enter",
            "name": "stu",
            "role": true
        }
        ```
    - 后端
        ```json
        {
            "type": "enter",
            "name": "stu",
            "role": true,
            "online": ["stu-a", "stu-b", "stu-c"],  // 在线成员
            "class": {
                "speaker": "123456",  // 演讲人，支持老师旁听
                "course": "",   // 课程名
                "beginning": "2020/4/13 10:07:43",   // 开始时间
                "slide": "",
                "note": "",
                "width": 720,
                "height": 540
            }   // null 则为未上课
        }
        ```
    - 老师掉线后进入，将匹配 `speaker` 字段
    - 旁听老师进入，将切换到学生界面
- [x] leave：离开教室。**后端发送**
    ```json
    {
        "type": "leave",
        "name": "123456",
        "role": true,
        "online": ["1234", "teac"]
    }
    ```
- [x] *begin*：开始上课
    - 前端
        ```json
        {
            "type": "begin",
            "speaker": "123456",
            "course": "",   // 课程名
            "slide": "",
            "note": "",
            "width": 720,
            "height": 540
        }
        ```
    - 后端
        ```json
        {
            "type": "begin",
            "speaker": "123456",
            "course": "",
            "beginning": "2020/4/13 10:07:43",   // 开始时间
            "slide": "",
            "note": "",
            "width": 720,
            "height": 540
        }
        ```
    后端记录以下内容，有成员进入（`enter`）时发送该消息：
    - 讲课人
    - 在线人数
    - 课程名
    - 开始上课时间
- [x] *finish*：结束上课
    - 前端
        ```json
        {
            "type": "finish",
            "speaker": "123456",
        }
        ```
    - 后端
        ```json
        {
            "type": "finish",
            "speaker": "123456",
            "beginning": "2020/4/13 10:07:43",    // 开始时间
            "duration": "00:43:03",    // 持续时间
            "slide": "",
            "note": ""
        }
        ```
- [x] *slide*：翻页。**直接广播**
    ```json
    {
        "type": "slide",
        "slide": ""  // 二进制字符
    }
    ```
    若来源不是当前 `speaker`，则不转发
- [x] *note*：批注。**直接广播**
    ```json
    {
        "type": " note",
        "note": ""  // Base64 字符
    }
    ```
    若来源不是当前 `speaker`，则不转发
- [ ] record：开关录音。WebRTC
