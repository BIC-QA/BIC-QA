// 政策对话框管理器
export function createPolicyDialogManager(popup) {
    return {
        async showPolicyDialog(dialogId) {
            if (!dialogId || !popup.policyDialogs || !popup.policyDialogs[dialogId]) return;
            const dialog = popup.policyDialogs[dialogId];
            
            // 查找内容容器
            const contentContainer = dialog.querySelector('.policy-dialog-content');
            if (contentContainer) {
                const htmlPath = contentContainer.getAttribute('data-policy-html-path');
                
                // 如果指定了 HTML 文件路径，加载并应用 i18n
                if (htmlPath) {
                    try {
                        // 检查是否已加载过（避免重复加载）
                        if (!contentContainer.dataset.loaded) {
                            const url = chrome.runtime.getURL(`pages/${htmlPath}`);
                            const response = await fetch(url);
                            if (response.ok) {
                                const htmlContent = await response.text();
                                // 创建临时容器来解析 HTML
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = htmlContent;
                                
                                // 提取 main 标签内的内容
                                const mainContent = tempDiv.querySelector('main');
                                if (mainContent) {
                                    contentContainer.innerHTML = mainContent.innerHTML;
                                    // 标记为已加载
                                    contentContainer.dataset.loaded = 'true';
                                } else {
                                    // 如果没有 main 标签，直接使用整个内容
                                    contentContainer.innerHTML = htmlContent;
                                    contentContainer.dataset.loaded = 'true';
                                }
                            } else {
                                console.error(`无法加载政策文件: ${htmlPath}`);
                            }
                        }
                        
                        // 每次显示对话框时都重新应用 i18n 翻译（确保使用当前语言）
                        const currentLang = popup.currentLanguage || popup.i18n.currentLanguage;
                        console.log(`应用政策对话框翻译，语言: ${currentLang}`);
                        popup.applyI18nToElement(contentContainer, currentLang);
                    } catch (error) {
                        console.error(`加载政策文件失败: ${htmlPath}`, error);
                    }
                }
            }
            
            dialog.style.display = 'flex';
            dialog.setAttribute('aria-hidden', 'false');
            const focusTarget = dialog.querySelector('.js-close-policy') || dialog.querySelector('.close-btn');
            if (focusTarget) {
                setTimeout(() => focusTarget.focus(), 0);
            }
        },

        hidePolicyDialog(dialogId) {
            if (!dialogId || !popup.policyDialogs || !popup.policyDialogs[dialogId]) return;
            const dialog = popup.policyDialogs[dialogId];
            dialog.style.display = 'none';
            dialog.setAttribute('aria-hidden', 'true');
        },

        hideAllPolicyDialogs() {
            if (!popup.policyDialogs) return;
            Object.keys(popup.policyDialogs).forEach(dialogId => {
                this.hidePolicyDialog(dialogId);
            });
        }
    };
}

