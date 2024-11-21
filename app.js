// DOM 元素
const messageInput = document.getElementById('messageInput');
const sendButton = document.querySelector('.send-btn');
const chatContainer = document.querySelector('.chat-container');
const questionButtons = document.querySelectorAll('.question-item');

// 对话历史
let conversationHistory = [{
    role: "system",
    content: "你是一个智能管家，可以帮助用户解决各种问题。请用简短友好的方式回答。"
}];

// 获取 AI 响应
async function getAIResponse(userMessage) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [...conversationHistory, {
                    role: "user",
                    content: userMessage
                }],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error);
        return '抱歉，服务器出现了一些问题。请稍后再试。';
    }
}

// 发送消息
async function sendMessage(text) {
    if (!text.trim()) return;

    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'message user fade-in';
    userMessage.innerHTML = `
        <div class="content">${text}</div>
    `;
    chatContainer.appendChild(userMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 添加到对话历史
    conversationHistory.push({
        role: "user",
        content: text
    });

    // 显示加载状态
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message assistant fade-in';
    loadingMessage.innerHTML = `
        <div class="avatar">AI</div>
        <div class="content typing-dots">思考中...</div>
    `;
    chatContainer.appendChild(loadingMessage);

    // 获取AI响应
    const aiResponse = await getAIResponse(text);
    
    // 移除加载消息
    chatContainer.removeChild(loadingMessage);

    // 添加AI响应（带打字机效果）
    const aiMessage = document.createElement('div');
    aiMessage.className = 'message assistant fade-in';
    aiMessage.innerHTML = `
        <div class="avatar">AI</div>
        <div class="content"></div>
    `;
    chatContainer.appendChild(aiMessage);

    // 打字机效果
    const contentDiv = aiMessage.querySelector('.content');
    let index = 0;
    const typeWriter = () => {
        if (index < aiResponse.length) {
            contentDiv.textContent += aiResponse.charAt(index);
            index++;
            chatContainer.scrollTop = chatContainer.scrollHeight;
            setTimeout(typeWriter, 30);
        }
    };
    typeWriter();

    // 添加到对话历史
    conversationHistory.push({
        role: "assistant",
        content: aiResponse
    });

    // 清空输入框
    messageInput.value = '';
}

// 服务信息展示函数
function showServiceInfo(type) {
    if (type === 'record') {
        document.getElementById('healthRecordModal').style.display = 'block';
        return;
    }
    let message = '';
    switch(type) {
        case 'checkup':
            message = `体检预约服务包括：
1. 个性化体检套餐推荐
2. 专家门诊预约
3. 体检时间安排
4. 体检注意事项提醒
5. VIP绿色通道服务

您想了解哪项具体服务？`;
            break;
        case 'report':
            message = `体检报告解读服务包括：
1. 检查指标说明
2. 异常标分析
3. 健康风险评估
4. 专家在线咨询
5. 个性化健康建议

需要我为您解读哪方面的内容？`;
            break;
        case 'symptom':
            message = `症状查询服务包括：
1. 常见症状分析
2. 可能疾病预判
3. 就医建议
4. 自我保健指导
5. 用药参考建议

请描述您的症状，我来为您分析。`;
            break;
    }
    sendMessage(message);
}

// AI 功能实现
async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value;
    const loadingIndicator = document.getElementById('loadingIndicator');
    const imageResult = document.getElementById('imageResult');
    
    if (!prompt) {
        alert('请输入图片描述');
        return;
    }

    try {
        loadingIndicator.style.display = 'block';
        imageResult.innerHTML = '';

        const selectedModel = document.querySelector('.model-btn.active').dataset.model;
        const apiKey = selectedModel === 'stability' ? CONFIG.STABILITY_API_KEY : CONFIG.CLAUDE_API_KEY;
        const apiEndpoint = selectedModel === 'stability' ? CONFIG.STABILITY_API_ENDPOINT : CONFIG.CLAUDE_API_ENDPOINT;

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                text_prompts: [{ text: prompt }],
                cfg_scale: 7,
                height: 512,
                width: 512,
                steps: 30,
                samples: 1,
            })
        });

        if (!response.ok) {
            throw new Error('图片生成失败');
        }

        const result = await response.json();
        const image = document.createElement('img');
        image.src = `data:image/png;base64,${result.artifacts[0].base64}`;
        imageResult.appendChild(image);
    } catch (error) {
        alert('生成图片时出错：' + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// 餐食分析功能
async function handleFoodImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('originalImagePreview');
    const analysisResult = document.getElementById('foodAnalysisResult');
    const loadingIndicator = document.getElementById('foodLoadingIndicator');

    if (!file) return;

    try {
        // 显示原始图片
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="食物图片">`;
        }
        reader.readAsDataURL(file);

        // 分析图片
        loadingIndicator.style.display = 'block';
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/analyze-food', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('分析失败');
        }

        const result = await response.json();
        analysisResult.innerHTML = `
            <h3>分析结果</h3>
            <p>卡路里：${result.calories} kcal</p>
            <p>营养成分：${result.nutrition}</p>
            <p>建议：${result.suggestions}</p>
        `;
    } catch (error) {
        alert('分析图片时出错：' + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// 模态框控制
function showImageGenerator() {
    document.getElementById('imageGeneratorModal').style.display = 'block';
}

function closeImageGenerator() {
    document.getElementById('imageGeneratorModal').style.display = 'none';
}

function showFoodAnalyzer() {
    document.getElementById('foodAnalyzerModal').style.display = 'block';
}

function closeFoodAnalyzer() {
    document.getElementById('foodAnalyzerModal').style.display = 'none';
}

// 模型选择
document.querySelectorAll('.model-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelector('.model-btn.active').classList.remove('active');
        this.classList.add('active');
    });
});

// 关闭模态框的点击事件
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// 初始化函数
function initializeApp() {
    // 绑定服务项点击事件
    document.querySelectorAll('.service-item').forEach(item => {
        item.addEventListener('click', function() {
            const type = this.getAttribute('data-service');
            if (type) {
                showServiceInfo(type);
            }
            
            // 添加点击效果
            this.classList.add('service-active');
            setTimeout(() => {
                this.classList.remove('service-active');
            }, 200);
        });
    });

    // 绑定模态框关闭按钮
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // 绑定图片生成按钮
    document.getElementById('generateBtn')?.addEventListener('click', generateImage);

    // 绑定食物图片上传
    document.getElementById('foodImage')?.addEventListener('change', handleFoodImage);

    // 绑定消息发送
    sendButton?.addEventListener('click', () => {
        sendMessage(messageInput.value);
    });

    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value);
        }
    });

    // 绑定快速问题按钮
    questionButtons.forEach(button => {
        button.addEventListener('click', () => {
            sendMessage(button.textContent);
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // 添加模型切换事件处理
    document.querySelectorAll('.model-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}
// 在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeApp);

// 将需要在 HTML 中直接调用的函数暴露到全局作用域
window.generateImage = generateImage;
window.handleFoodImage = handleFoodImage;
window.showServiceInfo = showServiceInfo;
window.showImageGenerator = function() {
    document.getElementById('imageGeneratorModal').style.display = 'block';
};
window.closeImageGenerator = function() {
    document.getElementById('imageGeneratorModal').style.display = 'none';
};
window.showFoodAnalyzer = function() {
    document.getElementById('foodAnalyzerModal').style.display = 'block';
};
window.closeFoodAnalyzer = function() {
    document.getElementById('foodAnalyzerModal').style.display = 'none';
};
