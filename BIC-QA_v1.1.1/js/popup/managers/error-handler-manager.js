// 错误处理管理器
import { escapeHtml } from '../utils/common.js';

export function createErrorHandlerManager(popup) {
    return {
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

                // 滚动到结果区域
                setTimeout(() => {
                    targetContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 100);

                // 重置反馈按钮状态
                popup.resetFeedbackButtons();

                // 同时显示消息提示
                popup.showMessage(errorMessage, 'error');
            }
        }
    };
}

