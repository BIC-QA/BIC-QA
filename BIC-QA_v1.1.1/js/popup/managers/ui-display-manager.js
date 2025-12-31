/**
 * UI显示管理器
 * 负责UI显示相关的功能，包括结果显示、消息提示、错误显示、加载遮罩等
 */
import { escapeHtml } from '../utils/common.js';

export function createUIDisplayManager(popup) {
    return {
        /**
         * 显示结果
         */
        showResult(text, container = null) {
            if (popup.hasBeenStopped) {
                // 用户主动停止后，不覆盖/清空已渲染的内容
                return;
            }

            // 获取目标容器
            const targetContainer = container || popup.resultContainer;
            if (targetContainer) {
                const errorMsgDiv = targetContainer.querySelector('.errormsgDiv');
                if (errorMsgDiv && errorMsgDiv.innerHTML.trim() !== '') {
                    console.log('检测到错误信息已显示，跳过showResult');
                    return;
                }
            }

            // 获取结果文本容器
            const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;
            if (!resultText) {
                console.error('未找到结果文本容器');
                return;
            }

            // 确保提示与内容容器存在
            let tipsEl = resultText.querySelector('.result-text-tips');
            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }

            let contentEl = resultText.querySelector('.result-text-content');
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }

            let knowlistEl = resultText.querySelector('.result-text-knowlist');
            if (!knowlistEl) {
                knowlistEl = document.createElement('div');
                knowlistEl.className = 'result-text-knowlist';
                resultText.appendChild(knowlistEl);
            }
            // 显示result-actions
            const resultActions = targetContainer ? targetContainer.querySelector('.result-actions') : popup.resultContainer.querySelector('.result-actions');
            if (resultActions) {
                resultActions.style.display = 'block';
                // 使用setTimeout确保DOM更新后再显示
                setTimeout(() => {
                    resultActions.style.opacity = '1';
                }, 100);
            }
            // 渲染结果到内容容器
            contentEl.innerHTML = popup.formatContent(text);

            // 结束提示
            if (popup._useKnowledgeBaseThisTime) {
                const count = typeof popup._kbMatchCount === 'number' ? popup._kbMatchCount : 0;
                if (count === 0) {
                    tipsEl.innerHTML = popup.t('popup.progress.kbNoMatch', { count });
                } else {
                    tipsEl.innerHTML = popup.t('popup.progress.kbMatch', { count });
                }
                // 非流式路径完成时，如有知识库结果也展示参考列表
                if (Array.isArray(popup._kbItems) && popup._kbItems.length > 0) {
                    console.log('非流式处理完成，渲染知识库列表，条目数量:', popup._kbItems.length);
                    popup.renderKnowledgeList(popup._kbItems, targetContainer, popup._kbImageList);
                } else {
                    console.log('非流式处理完成，不渲染知识库列表:', {
                        kbItems: popup._kbItems,
                        kbItemsLength: Array.isArray(popup._kbItems) ? popup._kbItems.length : 'not array'
                    });
                }
            } else {
                tipsEl.textContent = popup.t('popup.progress.completedWithResult');
                // 非知识库，强制清空参考列表
                console.log('非知识库模式，清空知识库列表');
                knowlistEl.innerHTML = '';
                console.log('知识库列表已清空');
            }

            // 滚动到底部
            popup.scrollToBottom();

            // 计算用时并更新标题
            if (popup.startTime) {
                const endTime = Date.now();
                const duration = Math.round((endTime - popup.startTime) / 1000);
                const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                if (resultTitle) {
                    resultTitle.textContent = popup.t('popup.progress.answerCompleted', { seconds: duration });
                }
            }
        },

        /**
         * 显示消息
         */
        showMessage(message, type = 'info', options = {}) {
            // options: { centered?: boolean, durationMs?: number, maxWidth?: string, background?: string, allowHtml?: boolean, replaceExisting?: boolean }
            const { centered = false, durationMs = 3000, maxWidth, background, allowHtml = false, replaceExisting = false } = options || {};

            if (replaceExisting) {
                document.querySelectorAll('.message').forEach(node => node.remove());
            }

            // 创建临时消息显示
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${type}`;
            if (allowHtml) {
                messageDiv.innerHTML = message;
            } else {
                messageDiv.textContent = message;
            }

            const resolvedBg = background || (type === 'error' ? '#e74c3c' : (type === 'success' ? '#1e7e34' : '#3498db'));

            let baseStyle = `
			position: fixed;
			padding: 10px 15px;
			border-radius: 6px;
			color: white;
			font-size: 14px;
			z-index: 20000;
            background: ${resolvedBg};
			box-shadow: 0 2px 10px rgba(0,0,0,0.2);
		`;

            if (centered) {
                const widthStyle = maxWidth ? `max-width: ${maxWidth};` : '';
                baseStyle += `
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				text-align: center;
				${widthStyle}
			`;
            } else {
                baseStyle += `
				top: 20px;
				right: 20px;
			`;
            }

            messageDiv.style.cssText = baseStyle;

            document.body.appendChild(messageDiv);

            setTimeout(() => {
                messageDiv.remove();
            }, Math.max(0, Number(durationMs) || 3000));
        },

        /**
         * 显示错误结果
         */
        showErrorResult(errorMessage, errorType = 'model', container = null) {
            // 获取目标容器
            const targetContainer = container || popup.resultContainer;
            const targetResultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;

            if (targetContainer && targetResultText) {
                targetContainer.style.display = 'block';

                // 更新标题为错误状态
                const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                if (resultTitle) {
                    resultTitle.textContent = popup.t('popup.progress.failed');
                }

                // 清空其他区域的内容
                const tipsEl = targetResultText.querySelector('.result-text-tips');
                if (tipsEl) {
                    tipsEl.innerHTML = '';
                }

                const contentEl = targetResultText.querySelector('.result-text-content');
                if (contentEl) {
                    contentEl.innerHTML = '';
                }

                const knowlistEl = targetResultText.querySelector('.result-text-knowlist');
                if (knowlistEl) {
                    knowlistEl.innerHTML = '';
                }

                // 根据错误类型确定解决方案
                let solutions = [];
                const solutionKeys = errorType === 'knowledge'
                    ? [
                        'popup.error.solution.kbTestConnection',
                        'popup.error.solution.kbApiKey',
                        'popup.error.solution.kbReconfigure'
                    ]
                    : [
                        'popup.error.solution.modelConnection',
                        'popup.error.solution.modelSettings',
                        'popup.error.solution.modelApiKey',
                        'popup.error.solution.modelReconfigure'
                    ];

                solutions = solutionKeys.map(key => popup.t(key));

                // 创建解决方案HTML
                const solutionsHtml = solutions.map(solution => `<li>${solution}</li>`).join('');

                // 创建错误显示内容
                const errorHtml = `
                <div class="errormsgDiv" style="
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px 0;
                    color: #dc2626;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 15px;
                        font-weight: 600;
                        font-size: 16px;
                    ">
                        <span style="font-size: 20px;">❌</span>
                        ${popup.t('popup.error.title')}
                    </div>
                    <div style="
                        color: #7f1d1d;
                        line-height: 1.6;
                        font-size: 14px;
                    ">
                        ${escapeHtml(errorMessage)}
                    </div>
                    <div style="
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #fecaca;
                        font-size: 12px;
                        color: #991b1b;
                    ">
                        <strong>${popup.t('popup.error.solutionsTitle')}</strong>
                        <ul style="margin: 8px 0 0 20px; padding: 0;">
                            ${solutionsHtml}
                        </ul>
                    </div>
                </div>
            `;

                // 将错误信息添加到targetResultText中，而不是替换整个innerHTML
                // 这样可以保持原有的DOM结构
                targetResultText.innerHTML = errorHtml;

                // 更新布局状态
                popup.updateLayoutState();

                // 滚动到底部
                setTimeout(() => {
                    popup.scrollToBottom();
                }, 100);
            }
        },

        /**
         * 显示全局加载遮罩
         */
        showLoadingOverlay(message) {
            const finalMessage = message || popup.t('popup.progress.processing');
            // 避免重复创建
            let overlay = document.getElementById('globalLoadingOverlay');
            if (overlay) {
                const textEl = overlay.querySelector('.loading-text');
                if (textEl) textEl.textContent = finalMessage;
                overlay.style.display = 'flex';
                return;
            }

            // 注入一次性样式（用于旋转动画）
            if (!document.getElementById('globalLoadingStyle')) {
                const styleTag = document.createElement('style');
                styleTag.id = 'globalLoadingStyle';
                styleTag.textContent = `@keyframes bicqa_spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`;
                document.head.appendChild(styleTag);
            }

            overlay = document.createElement('div');
            overlay.id = 'globalLoadingOverlay';
            overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

            const box = document.createElement('div');
            box.style.cssText = `
            background: #fff;
            border-radius: 10px;
            padding: 20px 24px;
            min-width: 260px;
            max-width: 320px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.15);
        `;

            const spinner = document.createElement('div');
            spinner.style.cssText = `
            width: 22px; height: 22px;
            border: 3px solid #e9ecef;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: bicqa_spin 0.9s linear infinite;
        `;

            const text = document.createElement('div');
            text.className = 'loading-text';
            text.textContent = finalMessage;
            text.style.cssText = `
            font-size: 14px;
            color: #333;
        `;

            box.appendChild(spinner);
            box.appendChild(text);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        },

        /**
         * 隐藏全局加载遮罩
         */
        hideLoadingOverlay() {
            const overlay = document.getElementById('globalLoadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    };
}

