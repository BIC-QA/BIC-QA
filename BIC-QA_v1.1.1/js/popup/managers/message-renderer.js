/**
 * 消息渲染管理器
 * 负责消息列表的渲染
 */
import { escapeHtml } from '../utils/common.js';

export function createMessageRenderer(popup) {
    return {
        /**
         * 渲染消息列表
         */
        renderMessageList(messageList) {
            console.log('开始渲染消息列表，消息数量:', messageList.length);

            const resultText = popup.resultText;
            if (!resultText) {
                console.error('resultText元素不存在!');
                return;
            }

            // 只在第一次调用时清空内容
            if (messageList.length === 1) {
                console.log('首次渲染，清空resultText内容...');
                resultText.innerHTML = '';
            }

            // 只渲染最新的消息（最后一条）
            const latestMessage = messageList[messageList.length - 1];
            if (latestMessage && latestMessage.content) {
                console.log(`渲染最新消息:`, latestMessage.content);

                const messageDiv = document.createElement('div');
                messageDiv.className = 'stream-message';
                messageDiv.style.cssText = `
                    margin-bottom: 8px;
                    padding: 8px 12px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    border-left: 4px solid #007bff;
                    animation: fadeIn 0.3s ease;
                    display: block;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                `;

                // 添加时间戳（可选）
                const timestamp = latestMessage.timestamp ? new Date(latestMessage.timestamp).toLocaleTimeString() : '';
                const timeText = timestamp ? `<small style="color: #6c757d; font-size: 0.8em;">${timestamp}</small><br>` : '';

                messageDiv.innerHTML = `${timeText}${escapeHtml(latestMessage.content)}`;
                resultText.appendChild(messageDiv);

                console.log(`最新消息已添加到DOM，当前总消息数: ${messageList.length}`);
            }

            console.log('消息渲染完成，当前resultText内容长度:', resultText.innerHTML.length);

            // 添加CSS动画
            if (!document.getElementById('stream-animation-style')) {
                const style = document.createElement('style');
                style.id = 'stream-animation-style';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    };
}

