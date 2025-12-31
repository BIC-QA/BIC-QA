/**
 * UI文本管理器
 * 负责UI文本相关的工具方法
 */
export function createUITextManager(popup) {
    return {
        /**
         * 获取运行分析倒计时文本
         */
        getRunAnalysisCountdownText(seconds) {
            const suffix = popup.t('popup.main.text.secondSuffix');
            return `${popup.t('popup.main.action.runAnalysis')} (${seconds}${suffix})`;
        }
    };
}

