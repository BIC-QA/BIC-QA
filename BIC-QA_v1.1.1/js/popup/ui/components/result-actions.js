function bindToPopup(fn, popup) {
    return fn.bind(popup);
}

export function createResultActions(popup) {
    return {
        showLoadingOverlay: bindToPopup(showLoadingOverlay, popup),
        hideLoadingOverlay: bindToPopup(hideLoadingOverlay, popup),
        copyResult: bindToPopup(copyResult, popup),
        exportResultAsHtml: bindToPopup(exportResultAsHtml, popup),
        clearResult: bindToPopup(clearResult, popup),
        copyQuestionText: bindToPopup(copyQuestionText, popup),
        fallbackCopyTextToClipboard: bindToPopup(fallbackCopyTextToClipboard, popup),
        showCopySuccess: bindToPopup(showCopySuccess, popup)
    };
}

function showLoadingOverlay(message) {
    const finalMessage = message || this.t('popup.progress.processing');
    let overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        const textEl = overlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = finalMessage;
        overlay.style.display = 'flex';
        return;
    }

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
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

async function copyResult(container = null) {
    const targetContainer = container || this.resultContainer;
    const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;

    if (!resultText) {
        this.showMessage(this.t('popup.message.noContentToCopy'), 'error');
        return;
    }

    const text = resultText.textContent;
    try {
        await navigator.clipboard.writeText(text);
        this.showMessage(this.t('popup.message.copied'), 'success');
    } catch (error) {
        console.error('复制失败:', error);
        this.showMessage(this.t('popup.message.copyFailed'), 'error');
    }
}

async function exportResultAsHtml(container = null) {
    try {
        const targetContainer = container || this.resultContainer;
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : this.resultText;

        if (!resultText) {
            this.showMessage(this.t('popup.message.noContentToExport'), 'error');
            return;
        }

        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

        const questionDisplay = targetContainer ? targetContainer.querySelector('.question-text') : this.questionText;
        const question = questionDisplay ? questionDisplay.textContent.trim() : '未知问题';
        const questionPart = question.length > 20 ? question.substring(0, 20) + '...' : question;
        const safeQuestionPart = questionPart.replace(/[<>:"/\\|?*]/g, '_');

        const fileName = `BIC-QA-结果-${safeQuestionPart}-${timestamp}.html`;

        const resultHtml = resultText.innerHTML;

        const locale = this.i18n?.getIntlLocale(this.currentLanguage);

        const copyIconUrl = this.iconUrls.copy;

        const fullHtml = `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIC-QA 结果导出</title>
    <style>
        body {
            font-family: 'Microsoft YaHei', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            color: #666;
        }
        .question-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        .question-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .question-text {
            color: #555;
            line-height: 1.6;
        }
        .result-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
        }
        .result-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .result-content {
            color: #555;
            line-height: 1.6;
        }
# ... rest of function ...

