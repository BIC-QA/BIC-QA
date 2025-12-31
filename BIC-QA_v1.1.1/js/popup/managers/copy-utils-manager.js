/**
 * 复制工具管理器
 * 负责复制相关的工具方法
 */
export function createCopyUtilsManager(popup) {
    return {
        /**
         * 复制问题文本功能
         */
        copyQuestionText(button) {
            try {
                // 获取问题文本
                const questionText = button.parentElement.querySelector('.question-text');
                const textToCopy = questionText.textContent || questionText.innerText;

                if (!textToCopy || textToCopy.trim() === '') {
                    console.log('没有找到问题文本');
                    return;
                }

                // 复制到剪贴板
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // 显示复制成功提示
                    this.showCopySuccess(button);
                }).catch(err => {
                    console.error('复制失败:', err);
                    // 降级方案：使用传统方法
                    this.fallbackCopyTextToClipboard(textToCopy, button);
                });
            } catch (error) {
                console.error('复制功能出错:', error);
            }
        },

        /**
         * 降级复制方案
         */
        fallbackCopyTextToClipboard(text, button) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    this.showCopySuccess(button);
                } else {
                    console.log('复制失败');
                }
            } catch (err) {
                console.error('复制失败:', err);
            }

            document.body.removeChild(textArea);
        },

        /**
         * 显示复制成功提示
         * 简洁蓝色提示：屏幕居中显示"复制成功"
         */
        showCopySuccess() {
            try {
                const existing = document.querySelector('.bicqa-toast');
                if (existing) existing.remove();

                const toast = document.createElement('div');
                toast.className = 'bicqa-toast';
                toast.textContent = popup.t('popup.message.copied');
                toast.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(.98);
                    background: #1d4ed8;
                    color: #fff;
                    padding: 12px 18px;
                    border-radius: 8px;
                    font-size: 14px;
                    line-height: 1;
                    box-shadow: 0 4px 16px rgba(0,0,0,.2);
                    z-index: 2147483647;
                    opacity: 0;
                    transition: opacity .15s ease, transform .15s ease;
                    pointer-events: none;
                `;
                document.body.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translate(-50%, -50%) scale(1)';
                });

                setTimeout(() => {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translate(-50%, -50%) scale(.98)';
                    setTimeout(() => toast.remove(), 150);
                }, 1500);
            } catch (e) {
                console.warn(e);
            }
        }
    };
}

