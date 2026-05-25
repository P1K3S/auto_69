# Power BY [am-check-in](https://github.com/amclubs/am-check-in)

基于 am-check-in 修改，69云机场自动签到脚本，支持通用 Webhook 推送通知，通过 GitHub Actions 定时运行，释放你的双手出去 City Walk

## 使用方法

### ① 复制仓库代码
1. 把当前 github 的项目通过 use this template 复制创建到你的仓库里。

### ② 设置 GitHub Actions 变量
1. Settings -> secrets and variables -> Actions -> Secrets -> New repository secrets
2. 设置必填变量 DOMAIN、USERNAME、PASSWORD
3. (可选) 设置 Webhook 推送参数 WEBHOOK_URL、WEBHOOK_HEADERS

### ③ 设置定时任务时间
1. 进入代码 .github/workflows -> check-in-job.yml
2. 修改定时任务时间 cron (推荐修改成其它时间)
~~~
on:
  schedule:
    - cron: '0 0 * * *'  # 每天 00:00 UTC 执行，调整为你需要的时间
  workflow_dispatch:  # 允许手动触发
~~~

## 变量说明

| 变量名 | 示例 | 必填 | 备注 |
|--|--|--|--|
| `DOMAIN` | `xxx.com` | ✅ | 69云机场域名 |
| `USERNAME` | `xx@xx.com` | ✅ | 机场账户邮箱 |
| `PASSWORD` | `pwd` | ✅ | 机场账户密码 |
| `WEBHOOK_URL` | `https://gotify.example.com/message` | ❌ | Webhook 推送地址 |
| `WEBHOOK_HEADERS` | `{"Authorization":"Bearer xxx"}` | ❌ | Webhook 自定义请求头 (JSON 格式) |

### Webhook 推送说明

脚本会向 `WEBHOOK_URL` 发送 POST 请求，请求体为 JSON 格式：
```json
{
  "title": "69云 签到通知",
  "message": "执行时间: 2026-05-25 15:23:00\n🎉 69云签到结果 🎉\n签到完成",
  "priority": 5
}
```

`WEBHOOK_HEADERS` 用于添加认证等自定义请求头，值为 JSON 字符串，例如：
- Bearer Token 认证: `{"Authorization":"Bearer your-token"}`
- Gotify 兼容: `{"X-Gotify-Key":"your-gotify-app-token"}`
- 多个请求头: `{"Authorization":"Bearer token","X-Custom":"value"}`


 #
 免责声明:
 - 1、该项目设计和开发仅供学习、研究和安全测试目的。请于下载后 24 小时内删除, 不得用作任何商业用途, 文字、数据及图片均有所属版权, 如转载须注明来源。
 - 2、使用本程序必循遵守部署服务器所在地区的法律、所在国家和用户所在国家的法律法规。对任何人或团体使用该项目时产生的任何后果由使用者承担。
 - 3、作者不对使用该项目可能引起的任何直接或间接损害负责。作者保留随时更新免责声明的权利，且不另行通知。
