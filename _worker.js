let domain = "Enter your domain here";
let username = "Enter your email here";
let password = "Enter your password here"; 
let token; 
let botToken = '';  
let chatId = '';  
let checkInResult;
let jcType = '69yun69';  
 // 初始化变量
let fetch, Response; 

// 判断当前环境是否是 Node.js 环境
if (typeof globalThis.fetch === "undefined") {
  import('node-fetch').then(module => {
    fetch = module.default;
    Response = module.Response;
    console.log("在 Node.js 环境中，已导入 node-fetch");
    const env = {
        JC_TYPE: process.env.JC_TYPE,
        DOMAIN: process.env.DOMAIN,
        USERNAME: process.env.USERNAME,
        PASSWORD: process.env.PASSWORD,
        TOKEN: process.env.TOKEN,
        TG_TOKEN: process.env.TG_TOKEN,
        TG_ID: process.env.TG_ID
    };
   //console.log("在 Node.js 环境中env",env);

    const handler = {
        async scheduled(controller, env) {
            console.log("定时任务开始");
            try {
                await initConfig(env);
                await handleCheckIn();
                console.log("定时任务成功完成");
            } catch (error) {
                console.error("定时任务失败:", error);
                await sendMessage(`${jcType}定时任务失败: ${error.message}`);
            }
        }
    };
      
    handler.scheduled(null, env);
      }).catch(error => {
        console.error("导入 node-fetch 失败:", error);
      });
    
} else {
  fetch = globalThis.fetch;
  Response = globalThis.Response;
  console.log("在 Cloudflare Worker 环境中，已使用内置 fetch");
}


export default {
    async fetch(request, env) {
        await initConfig(env);
        const url = new URL(request.url);

        if (url.pathname === "/tg") {
            return await handleTgMsg();
        } else if (url.pathname === `/${token}`) { 
            return await handleCheckIn();
        }

        return new Response(checkInResult, {
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            status: 200
        });
    },

    async scheduled(controller, env) {
        console.log("定时任务开始");
        try {
            await initConfig(env);
            await handleCheckIn();
            console.log("定时任务成功完成");
        } catch (error) {
            console.error("定时任务失败:", error);
            await sendMessage(`${jcType}定时任务失败: ${error.message}`);
        }
    },
};

function decodeBase64Utf8(b64) {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
}

async function handleCheckIn() {
    try {
        validateConfig();
        if (jcType === "hongxingdl") {
          checkInResult = await hongxingdlCheckIn();
        } else {
          const cookies = await loginAndGetCookies();
          checkInResult = await performCheckIn(cookies);
        }
 
        await sendMessage(checkInResult);
        return new Response(checkInResult, { status: 200 });
    } catch (error) {
        console.error("签到失败:", error);
        const errorMsg = `${checkInResult}\n🎁${error.message}`;
        await sendMessage(errorMsg);
        return new Response(errorMsg, { status: 500 });
    }
}

function validateConfig() {
    if (!domain || !username  || !password) {  
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
        body: JSON.stringify({ email: username , passwd: password, remember_me: "on", code: "" }),  
    });

    if (!response.ok) {
        throw new Error(`${jcType}登录失败: ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.ret !== 1) {
        throw new Error(`${jcType}登录失败: ${jsonResponse.msg || "未知错误"}`);
    }

    const cookieHeader = response.headers.get("set-cookie");
    if (!cookieHeader) {
        throw new Error("${jcType}登录成功但未收到 Cookies");
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
        throw new Error(`${jcType}签到请求失败: ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    console.log("签到信息:", jsonResponse);
    if (jsonResponse.ret !== 1 && jsonResponse.ret !== 0) {
        throw new Error(`${jcType}签到失败: ${jsonResponse.msg || "未知错误"}`);
    }

    return `🎉 ${jcType}签到结果 🎉\n${jsonResponse.msg || "签到完成"}`;
}

async function hongxingdlCheckIn() {
    const checkInUrl = atob("aHR0cHM6Ly9zaWduLmhvbmd4aW5nLm9uZS9zaWdu");
    const response = await fetch(checkInUrl, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ email: username , password: password }), 
    });

    if (!response.ok) {
        throw new Error(`${jcType}签到请求失败: ${await response.text()}`);
    }

    const jsonResponse = await response.json();
    console.log("签到信息:", jsonResponse);
    if (jsonResponse.status !== 200) {
        throw new Error(`${jcType}签到失败: ${jsonResponse.data?.mag ?? "未知错误"}`);
    }
 
    const bytesToMB = jsonResponse.data?.bytes ? jsonResponse.data.bytes / (1024 * 1024) : null;
    const str = bytesToMB ? (
      bytesToMB >= 1024 
      ? `，您获得了 ${(bytesToMB / 1024).toFixed(3)} GB 流量.` 
      : `，您获得了 ${bytesToMB.toFixed(3)} MB 流量.` 
    ) : '';
    return `🎉 ${jcType}签到结果 🎉\n${jsonResponse.data?.mag ?? "签到完成"}${str}`;
}


const jcButtons = {
    "69yun69": [
        [
            {
                text: decodeBase64Utf8('44CQNjnkupHjgJHkuK3ovazpq5jpgJ/mnLrlnLos5YWo5rWB5aqS5L2T6Kej6ZSBLDEwLjg55YWDNDAwRw=='),
                url: decodeBase64Utf8('aHR0cHM6Ly82OXl1bjY5LmNvbS9hdXRoL3JlZ2lzdGVyP2NvZGU9eWY4Z1Br')
            }
        ]
    ],
    "hongxingdl": [
        [
            {
                text: decodeBase64Utf8('44CQOOaKmOegge+8mkFN56eR5oqA44CRW+e6ouadj+S6kV3kuK3ovazpq5jpgJ/mnLrlnLos6Kej6ZSB5YWo5rWB54Wk5L2T5ZKMR1BU'),
                url: decodeBase64Utf8('aHR0cHM6Ly9ob25neGluZ3l1bjMudmlwL3dlYi8jL2xvZ2luP2NvZGU9bW41VHVpcGY=')
            }
        ]
    ]
};


async function sendMessage(msg) {
    if (!botToken || !chatId) {
        console.log("Telegram 推送未启用. 消息内容:", msg);
        return;
    }

    const now = new Date();
    const formattedTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

    const messageText = `执行时间: ${formattedTime}\n${msg}`;

    const inline_keyboard = jcButtons[jcType] || [];
    const payload = {
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard
        }
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            console.error("Telegram 消息发送失败:", data);
            return `Telegram 消息发送失败: ${data.description || '未知错误'}`;
        }

        console.log("Telegram 消息发送成功:", data);
        return messageText;
    } catch (error) {
        console.error("发送 Telegram 消息失败:", error);
        return `发送 Telegram 消息失败: ${error.message}`;
    }
}


function formatDomain(domain) {
    return domain.includes("//") ? domain : `https://${domain}`;
}

async function handleTgMsg() {
    const message = `${checkInResult}`;
    const sendResult = await sendMessage(message);
    return new Response(sendResult, { status: 200 });
}


function maskSensitiveData(str, type = 'default') {
    if (!str) return "N/A";

   const urlPattern = /^(https?:\/\/)([^\/]+)(.*)$/;
    if (type === 'url' && urlPattern.test(str)) {
        return str.replace(/(https:\/\/)(\w)(\w+)(\w)(\.\w+)/, '$1$2****$4$5');;
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (type === 'email' && emailPattern.test(str)) {
        return str.replace(/^(\w)(\w+)(\@)(\w)(\w+)(\.\w+)$/, '$1****$3$4****$6');
    }

    return `${str[0]}****${str[str.length - 1]}`;
}

async function initConfig(env) {
    domain = formatDomain(env.DOMAIN || domain);
    username  = env.USERNAME || username ;
    password = env.PASSWORD || password;  
    token = env.TOKEN || token;  
    botToken = env.TG_TOKEN || botToken;  
    chatId = env.TG_ID || chatId; 
    jcType = env.JC_TYPE || jcType; 
    
    checkInResult = `配置信息: 
    机场类型: ${jcType} 
    登录地址: ${maskSensitiveData(domain, 'url')} 
    登录账号: ${maskSensitiveData(username, 'email')} 
    登录密码: ${maskSensitiveData(password)} 
    TG 推送:  ${botToken && chatId ? "已启用" : "未启用"} `;
 
    //console.log("initConfig-->", checkInResult);
}
