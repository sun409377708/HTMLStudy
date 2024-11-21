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
2. 异常��标分析
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

// 图片生成函数
async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value;
    const selectedModel = document.querySelector('.model-btn.active').dataset.model;
    const loadingIndicator = document.getElementById('loadingIndicator');
    const imageResult = document.getElementById('imageResult');

    if (!prompt) {
        alert('请输入图片描述');
        return;
    }

    loadingIndicator.style.display = 'block';
    imageResult.innerHTML = '';

    try {
        let imageUrl;
        if (selectedModel === 'claude') {
            imageUrl = await generateImageWithClaude(prompt);
        } else {
            // 原有的 Stability AI 处理逻辑
            imageUrl = await generateImageWithStability(prompt);
        }

        const img = document.createElement('img');
        img.src = imageUrl;
        imageResult.appendChild(img);
    } catch (error) {
        alert('生成图片失败：' + error.message);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// 添加 Claude API 处理函数
async function generateImageWithClaude(prompt) {
    try {
        const response = await fetch(CONFIG.CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CONFIG.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: `请根据以下描述生成图片：${prompt}`
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Claude API 请求失败');
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Claude API 错误:', error);
        throw error;
    }
}

// 处理食物图片上传
async function handleFoodImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loadingIndicator = document.getElementById('foodLoadingIndicator');
    const analysisResult = document.getElementById('foodAnalysisResult');
    const animeImageResult = document.getElementById('animeImageResult');
    const originalPreview = document.getElementById('originalImagePreview');

    try {
        // 将图片转换为base64
        const base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });

        // 显示原始图片预览
        originalPreview.innerHTML = `<img src="${base64Image}" class="preview-image">`;

        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = '分析中...';
        analysisResult.innerHTML = '';
        animeImageResult.innerHTML = '';

        // 使用 DeepSeek API 识别食物
        const recognitionResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{
                    role: "system",
                    content: "你是一个专业的食物识别和营养分析专家。请仔细观察图片中的食物，准确识别它是什么，并提供营养信息。请严格按照以下JSON格式返回：{\"name\":\"食物名称\",\"calories\":\"卡路里\",\"protein\":\"蛋白质(g)\",\"carbs\":\"碳水(g)\",\"fat\":\"脂肪(g)\"}。对于水果、蔬菜等常见食物，请提供真实的营养数据。只返回JSON数据，不要包含任何其他字符。"
                }, {
                    role: "user",
                    content: `这是一张食物图片的base64编码：${base64Image}，请识别图中的食物并提供准确的营养信息。`
                }],
                temperature: 0.3
            })
        });

        const recognitionData = await recognitionResponse.json();
        console.log('Recognition Response:', recognitionData);

        const foodData = JSON.parse(recognitionData.choices[0].message.content.trim());

        // 检查是否需要生成动画风格图片
        const generateAnime = document.getElementById('animeStyle').checked;

        if (generateAnime) {
            // 使用 Stability AI 生成动画风格图片
            loadingIndicator.textContent = '生成动画风格图片...';
            const animeResponse = await fetch(
                'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${STABILITY_API_KEY}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        text_prompts: [
                            {
                                text: `cute anime style illustration of ${foodData.name}, food illustration, kawaii style, vibrant colors, detailed, appetizing, top view, food photography style`,
                                weight: 1
                            },
                            {
                                text: "realistic, photograph, 3d rendering, low quality, blurry",
                                weight: -1
                            }
                        ],
                        cfg_scale: 8,
                        height: 1024,
                        width: 1024,
                        samples: 1,
                        steps: 40,
                        style_preset: "anime"
                    })
                }
            );

            if (!animeResponse.ok) {
                throw new Error('动画生成失败');
            }

            const responseData = await animeResponse.json();
            const imageUrl = `data:image/png;base64,${responseData.artifacts[0].base64}`;

            // 显示生成的动画图片
            const animeImage = document.createElement('img');
            animeImage.src = imageUrl;
            animeImage.className = 'generated-image';
            animeImageResult.appendChild(animeImage);
        }

        // 显示分析结果
        analysisResult.innerHTML = `
            <div class="food-info">
                <h3>${foodData.name}</h3>
                <div class="calories">🔥 ${foodData.calories} 卡路里</div>
                <div class="nutrition">
                    <div>蛋白质: ${foodData.protein}g</div>
                    <div>碳水: ${foodData.carbs}g</div>
                    <div>脂肪: ${foodData.fat}g</div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error:', error);
        analysisResult.innerHTML = `
            <div class="error-message">
                分析失败，请重试<br>
                ${error.message}
            </div>
        `;
    } finally {
        loadingIndicator.style.display = 'none';
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
