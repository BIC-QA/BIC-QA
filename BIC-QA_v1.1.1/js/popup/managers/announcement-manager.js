/**
 * 公告管理器
 * 负责公告相关的功能
 */
export function createAnnouncementManager(popup) {
    return {
        /**
         * 处理公告点击
         */
        handleAnnouncementClick() {
            const noticeUrl = 'https://api.bic-qa.com/bic-qa-html/notice.html';

            try {
                if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
                    chrome.tabs.create({ url: noticeUrl, active: true }, () => {
                        if (chrome.runtime?.lastError) {
                            console.error('打开公告页面失败:', chrome.runtime.lastError);
                            window.open(noticeUrl, '_blank');
                        }
                    });
                } else {
                    window.open(noticeUrl, '_blank');
                }
            } catch (error) {
                console.error('打开公告页面失败:', error);
                window.open(noticeUrl, '_blank');
            }
        },

        /**
         * 加载注册邮箱
         */
        async loadRegistrationEmail(targetInput = popup.awrEmail) {
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                if (registration && registration.status === 'registered' && registration.email) {
                    if (targetInput) {
                        targetInput.value = registration.email;
                    }
                    console.log('已加载注册邮箱:', registration.email);
                } else {
                    console.log('未找到有效的注册邮箱');
                    if (targetInput) {
                        targetInput.value = '';
                    }
                }
            } catch (error) {
                console.error('加载注册邮箱失败:', error);
                if (targetInput) {
                    targetInput.value = '';
                }
            }
        }
    };
}

