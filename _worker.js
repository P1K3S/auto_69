import fetch from 'node-fetch';

let domain = "Enter your domain here";
let username = "Enter your email here";
let password = "Enter your password here";
let webhookUrl = '';
let webhookHeaders = '';
let webhookType = 'default';
let timezoneOffset = 8;
let checkInResult;

const env = {
    DOMAIN: process.env.DOMAIN,
    USERNAME: process.env.USERNAME,
    PASSWORD: process.env.PASSWORD,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    WEBHOOK_HEADERS: process.env.WEBHOOK_HEADERS,
    WEBHOOK_TYPE: process.env.WEBHOOK_TYPE,
    TIMEZONE_OFFSET: process.env.TIMEZONE_OFFSET
};

(async () => {
    try {
        await initConfig(env);
        await handleCheckIn();
        console.log("定时任务成功完成");
    } catch (error) {
        console.error("定时任务失败:", error);
        await sendWebhookMessage(`69云定时任务失败: ${error.message}`);
    }
})();

async function handleCheckIn() {
    checkInResult = '';
    try {
        validateConfig();
        const cookies = await loginAndGetCookies();
        checkInResult = await performCheckIn(cookies);
        console.log(checkInResult);
        await sendWebhookMessage(checkInResult);
    } catch (error) {
        console.error("签到失败:", error);
        const prefix = checkInResult ? `${checkInResult}\n` : '';
        const errorMsg = `${prefix}🎁${error.message}`;
        await sendWebhookMessage(errorMsg);
    }
}

function validateConfig() {
    if (!domain || !username || !password) {
        throw new Error("缺少必要的配置参数");
    }
}

async function loginAndGetCookies() {
    const loginUrl = `${domain}/auth/login`;
    const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Origin": domain,
            "Referer": `${domain}/auth/login`
        },
        body: JSON.stringify({ email: username, passwd: password, remember_me: "on", code: "" }),
    });

    if (!response.ok) {
        throw new Error(`69云登录失败: ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.ret !== 1) {
        throw new Error(`69云登录失败: ${jsonResponse.msg || "未知错误"}`);
    }

    const cookieHeader = response.headers.get("set-cookie");
    if (!cookieHeader) {
        throw new Error("69云登录成功但未收到 Cookies");
    }

    return cookieHeader.split(',').map(cookie => cookie.split(';')[0]).join("; ");
}

async function performCheckIn(cookies) {
    const checkInUrl = `${domain}/user/checkin`;
    const response = await fetch(checkInUrl, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Origin': domain,
            'Referer': `${domain}/user/panel`,
            'Cookie': cookies,
            'X-Requested-With': 'XMLHttpRequest'
        },
    });

    if (!response.ok) {
        throw new Error(`69云签到请求失败: ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    console.log("签到信息:", jsonResponse);
    if (jsonResponse.ret !== 1 && jsonResponse.ret !== 0) {
        throw new Error(`69云签到失败: ${jsonResponse.msg || "未知错误"}`);
    }

    const { traffic, trafficInfo } = jsonResponse;
    let trafficMsg = `${jsonResponse.msg || "签到完成"}`;
    if (traffic || trafficInfo) {
        trafficMsg += `\n\n📊 流量统计`;
        if (traffic) trafficMsg += `\n总流量: ${traffic}`;
        if (trafficInfo) {
            if (trafficInfo.todayUsedTraffic) trafficMsg += `\n今日已用: ${trafficInfo.todayUsedTraffic}`;
            if (trafficInfo.lastUsedTraffic) trafficMsg += `\n上次已用: ${trafficInfo.lastUsedTraffic}`;
            if (trafficInfo.unUsedTraffic) trafficMsg += `\n剩余流量: ${trafficInfo.unUsedTraffic}`;
        }
    }
    return `🎉 69云签到结果 🎉\n${trafficMsg}`;
}

async function sendWebhookMessage(msg) {
    if (!webhookUrl) {
        console.log("Webhook 推送未启用. 消息内容:", msg);
        return;
    }

    const now = new Date();
    const formattedTime = new Date(now.getTime() + timezoneOffset * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

    const title = "69云 签到通知";
    const messageText = `执行时间: ${formattedTime}\n${msg}`;

    let customHeaders = {};
    if (webhookHeaders) {
        try {
            customHeaders = JSON.parse(webhookHeaders);
        } catch (e) {
            console.error("WEBHOOK_HEADERS JSON 解析失败，将使用默认请求头:", e.message);
        }
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                ...customHeaders
            },
            body: buildWebhookBody(title, messageText)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Webhook 消息发送失败:", errorText);
            return `Webhook 消息发送失败: ${errorText}`;
        }

        console.log("Webhook 消息发送成功");
        return `Webhook 消息发送成功: ${title}`;
    } catch (error) {
        console.error("发送 Webhook 消息异常:", error);
        return `发送 Webhook 消息异常: ${error.message}`;
    }
}

function formatDomain(domain) {
    return domain.includes("//") ? domain : `https://${domain}`;
}

function buildWebhookBody(title, messageText) {
    if (webhookType === 'feishu') {
        return JSON.stringify({
            msg_type: "interactive",
            card: {
                header: {
                    title: {
                        tag: "plain_text",
                        content: title
                    },
                    template: "blue"
                },
                elements: [
                    {
                        tag: "markdown",
                        content: messageText
                    }
                ]
            }
        });
    }
    return JSON.stringify({
        title: title,
        message: messageText,
        priority: 5
    });
}

function maskSensitiveData(str, type = 'default') {
    if (!str) return "N/A";

    if (type === 'password') return "******";

    const urlPattern = /^(https?:\/\/)([^\/]+)(.*)$/;
    if (type === 'url' && urlPattern.test(str)) {
        return str.replace(/(https:\/\/)(\w)(\w+)(\w)(\.\w+)/, '$1$2****$4$5');
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (type === 'email' && emailPattern.test(str)) {
        return str.replace(/^(\w)(\w+)(\@)(\w)(\w+)(\.\w+)$/, '$1****$3$4****$6');
    }

    return `${str[0]}****${str[str.length - 1]}`;
}

async function initConfig(env) {
    domain = formatDomain(env.DOMAIN || domain);
    username = env.USERNAME || username;
    password = env.PASSWORD || password;
    webhookUrl = env.WEBHOOK_URL || webhookUrl;
    webhookHeaders = env.WEBHOOK_HEADERS || webhookHeaders;
    webhookType = env.WEBHOOK_TYPE || webhookType;
    timezoneOffset = parseInt(env.TIMEZONE_OFFSET) || timezoneOffset;

    checkInResult = `配置信息:
    登录地址: ${maskSensitiveData(domain, 'url')}
    登录账号: ${maskSensitiveData(username, 'email')}
    登录密码: ${maskSensitiveData(password, 'password')}
    Webhook 推送:  ${webhookUrl ? "已启用" : "未启用"} `;
}
