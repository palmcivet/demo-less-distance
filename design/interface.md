- [HTTP 接口](#http-接口)
    - [`login`](#login)
    - [`register`](#register)
    - [`getvideo`](#getvideo)
    - [`upload`](#upload)
- [WS 接口](#ws-接口)
    - [字符通道](#字符通道)
        - [`chat`](#chat)
        - [`enter`](#enter)
        - [*`leave`*](#leave)
        - [`begin`](#begin)
        - [`finish`](#finish)
        - [`slide`](#slide)
        - [`note`](#note)
        - [`ques`](#ques)
        - [`answ`](#answ)
    - [语音通道](#语音通道)

## HTTP 接口
### `login`
- 方法：POST
- URL：`interface/login`
- 发送：
    ```json
    {
        "username": "teac",
        "password": "p@$swd",
        "permission": false
    }
    ```
- 返回：
    ```json
    {
        "code": 1,
        "message": "",
        "info": {
            "name": "teac",
            "permission": true
        }
    }
    ```

`permission` 字段 `true` 为教师身份，`false` 为学生

### `register`
- 方法：POST
- URL：`interface/register`
- 发送：
    ```json
    {
        "username": "teac",
        "password": "p@$swd",
        "permission": true
    }
    ```
- 返回：
    ```json
    {
        "code": 1,
        "message": ""
    }
    ```

### `getvideo`
- 方法：GET
- URL：`interface/getvideo`
- 返回：
    ```json
    {
        "code": 12,
        "message": "请求成功",
        "info": {
            "id": 1,
            "name": "Spring",
            "path": "/lessDistance/video/83993344-1-208.mp4"
        }
    }
    ```

### `upload`
- 方法：POST
- URL：`interface/upload`
- 发送：
    Form Data 类型，形如以下的表单：
    ```json
    {
        "name": "file-name",
        "file": ""
    }
    ```
- 返回：Blob 类型

## WS 接口
### 字符通道

登陆成功建立 WebSocket 连接

- URL：`websocket`
- 类型：默认
- 基本格式：
    ```json
    {
        "type": "",
        // other
    }
    ```

#### `chat`
聊天消息。**直接广播**

```json
{
    "type": "chat",
    "name": "123456",
    "role": true,
    "msg": "this is a message"
}
```

#### `enter`
进入教室。**后端发送**

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
            "height": 540,
            "file": "https://example.url/example.pdf"
        }   // null 则为未上课
    }
    ```
- 老师掉线后进入，将匹配 `speaker` 字段
- 旁听老师进入，将切换到学生界面

#### *`leave`*
离开教室。**后端发送**

```json
{
    "type": "leave",
    "name": "123456",
    "role": true,
    "online": ["1234", "teac"]
}
```

#### `begin`
开始上课

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
        "height": 540,
        "file": "https://example.url/example.pdf"
    }
    ```

后端记录以下内容，有成员进入（`enter`）时发送该消息：

- 讲课人
- 在线人数
- 课程名
- 开始上课时间

#### `finish`
结束上课

- 前端
    ```json
    {
        "type": "finish",
        "speaker": "123456",
    }
    ```
- 后端。学生广播
    ```json
    {
        "type": "finish",
        "speaker": "123456",
        "beginning": "2020/4/13 10:07:43",    // 开始时间
        "duration": "00:43:03",    // 持续时间
    }
    ```
- 后端。教师单播
    ```json
    {
        "type": "finish",
        "speaker": "123456",
        "beginning": "2020/4/13 10:07:43",    // 开始时间
        "duration": "00:43:03",    // 持续时间
        "info": [
            {
                "name": "stu-1",
                "count": 3,
                "answer": ["ans-1", "ans-2" ]
            },
            {
                "name": "stu-1",
                "count": 3,
                "answer": ["ans-1", "ans-2" ]
            }
        ]
    }
    ```

#### `slide`
翻页。**直接广播**

```json
{
    "type": "slide",
    "slide": ""  // 二进制字符
}
```

若来源不是当前 `speaker`，则不转发

#### `note`
批注。**直接广播**

```json
{
    "type": " note",
    "note": ""  // Base64 字符
}
```

若来源不是当前 `speaker`，则不转发

#### `ques`
讨论题-问题。

- 前端。来自教师端
    ```json
    {
        "type": "ques",
        "ques": "这是一个题目",
        "answ": "这是一个答案",
        "time": 2	// 预留作答时间，分钟
    }
    ```
- 后端。除老师外广播
    ```json
    {
        "type": "ques",
        "ques": "这是一个问题",
        "time": 2	// 预留作答时间，分钟
    }
    ```

#### `answ`
讨论题-回答。

- 前端
    ```json
    {
        "type": "answ",
        "answ": "这貌似是答案",
        "time": 158 // 花费的作答时间，秒
    }
    ```
- 后端
    ```json
    {
        "type": "answ",
        "answ": "这就是答案"
    }
    ```

### 语音通道
- URL：`voice`
- 类型：`arraybuffer`
