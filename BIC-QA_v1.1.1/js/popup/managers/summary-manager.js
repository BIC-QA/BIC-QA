/**
 * 摘要管理器
 * 负责摘要相关的功能，包括生成摘要、显示摘要对话框等
 */
import { escapeHtml } from '../utils/common.js';

export function createSummaryManager(popup) {
    return {
        /**
         * 获取页面摘要
         */
        async getPageSummary() {
            // 检查resultText区域是否有内容
            const resultContent = popup.resultText.textContent.trim();

            if (!resultContent) {
                popup.showMessage(popup.t('popup.message.generateSummaryHint'), 'info');
                return;
            }

            popup.setLoading(true);

            try {
                // 直接对resultText区域的内容生成摘要
                const summary = await popup.generateSummaryFromText(resultContent);
                popup.showSummaryDialog(summary);
            } catch (error) {
                console.error('生成摘要失败:', error);
                popup.showMessage(popup.t('popup.message.generateSummaryError'), 'error');
            } finally {
                popup.setLoading(false);
            }
        },

        /**
         * 显示摘要弹窗
         */
        showSummaryDialog(summary) {
            // 创建摘要弹窗
            const summaryDialog = document.createElement('div');
            summaryDialog.id = 'summaryDialog';
            summaryDialog.className = 'dialog-overlay';
            summaryDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

            summaryDialog.innerHTML = `
            <div class="dialog-content" style="
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                max-height: 80vh;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease;
            ">
                <div class="dialog-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #f0f0f0;
                ">
                    <h3 style="
                        margin: 0;
                        color: #333;
                        font-size: 18px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <span style="font-size: 20px;">📄</span>
                        内容摘要
                    </h3>
                    <button id="closeSummaryDialog" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    " title="关闭">×</button>
                </div>
                
                <div class="dialog-body" style="
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                    margin-right: -10px;
                ">
                    <div id="summaryContent" style="
                        white-space: pre-wrap;
                        line-height: 1.6;
                        color: #333;
                        font-size: 14px;
                    ">${popup.formatContent(summary)}</div>
                </div>
                
                <div class="dialog-footer" style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #f0f0f0;
                ">
                    <button id="copySummaryBtn" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">复制摘要</button>
                    <button id="closeSummaryBtn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background-color 0.2s;
                    ">关闭</button>
                </div>
            </div>
        `;

            // 添加到页面
            document.body.appendChild(summaryDialog);

            // 绑定事件
            const closeSummaryDialog = document.getElementById('closeSummaryDialog');
            const closeSummaryBtn = document.getElementById('closeSummaryBtn');
            const copySummaryBtn = document.getElementById('copySummaryBtn');

            // 关闭弹窗事件
            const closeDialog = () => {
                summaryDialog.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    if (summaryDialog.parentNode) {
                        summaryDialog.parentNode.removeChild(summaryDialog);
                    }
                }, 300);
            };

            closeSummaryDialog.addEventListener('click', closeDialog);
            closeSummaryBtn.addEventListener('click', closeDialog);

            // 点击背景关闭弹窗
            summaryDialog.addEventListener('click', (e) => {
                if (e.target === summaryDialog) {
                    closeDialog();
                }
            });

            // 复制摘要事件
            copySummaryBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(summary);
                    popup.showMessage(popup.t('popup.message.summaryCopied'), 'success');
                } catch (error) {
                    console.error('复制失败:', error);
                    popup.showMessage(popup.t('popup.message.copyFailed'), 'error');
                }
            });

            // 添加CSS动画
            if (!document.getElementById('summary-dialog-animation-style')) {
                const style = document.createElement('style');
                style.id = 'summary-dialog-animation-style';
                style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                #closeSummaryDialog:hover {
                    background-color: #f0f0f0;
                }
                
                #copySummaryBtn:hover {
                    background-color: #0056b3;
                }
                
                #closeSummaryBtn:hover {
                    background-color: #545b62;
                }
                
                .dialog-body::-webkit-scrollbar {
                    width: 6px;
                }
                
                .dialog-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .dialog-body::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `;
                document.head.appendChild(style);
            }
        },

        /**
         * 从文本生成摘要
         */
        async generateSummaryFromText(text) {
            try {
                const locale = popup.i18n?.getIntlLocale(popup.currentLanguage);
                // 分析文本内容
                const lines = text.split('\n').filter(line => line.trim());
                const words = text.split(/\s+/).filter(word => word.length > 0);
                const sentences = text.split(/[.!?。！？]/).filter(sentence => sentence.trim());

                // 计算基本统计信息
                const charCount = text.length;
                const wordCount = words.length;
                const lineCount = lines.length;
                const sentenceCount = sentences.length;

                // 提取可能的标题（第一行或包含关键词的行）
                let title = '';
                if (lines.length > 0) {
                    title = lines[0].trim();
                    if (title.length > 50) {
                        title = title.substring(0, 50) + '...';
                    }
                }

                // 提取主要内容预览
                let contentPreview = '';
                if (text.length > 200) {
                    contentPreview = text.substring(0, 200) + '...';
                } else {
                    contentPreview = text;
                }

                // 检测内容类型
                let contentTypeKey = 'text';
                if (text.includes('http') || text.includes('www')) {
                    contentTypeKey = 'withLinks';
                }
                if (text.includes('代码') || text.includes('function') || text.includes('class')) {
                    contentTypeKey = 'code';
                }
                if (text.includes('错误') || text.includes('Error') || text.includes('失败')) {
                    contentTypeKey = 'error';
                }
                const contentType = popup.t(`popup.summary.contentType.${contentTypeKey}`);

                // 构建摘要
                const summaryParts = [];
                summaryParts.push(popup.t('popup.summary.header'));
                summaryParts.push('');
                summaryParts.push(popup.t('popup.summary.contentTypeLabel', { type: contentType }));
                summaryParts.push('');

                if (title) {
                    summaryParts.push(popup.t('popup.summary.titleLabel', { title }));
                    summaryParts.push('');
                }

                summaryParts.push(popup.t('popup.summary.statsHeader'));
                summaryParts.push(popup.t('popup.summary.statChars', { count: charCount }));
                summaryParts.push(popup.t('popup.summary.statWords', { count: wordCount }));
                summaryParts.push(popup.t('popup.summary.statLines', { count: lineCount }));
                summaryParts.push(popup.t('popup.summary.statSentences', { count: sentenceCount }));
                summaryParts.push('');

                summaryParts.push(popup.t('popup.summary.previewHeader', { preview: contentPreview }));
                summaryParts.push('');

                // 如果内容很长，提供分段分析
                if (lines.length > 10) {
                    const sections = popup.analyzeContentStructure(lines);
                    summaryParts.push(popup.t('popup.summary.structureHeader'));
                    sections.forEach((section, index) => {
                        summaryParts.push(popup.t('popup.summary.structureItem', {
                            index: index + 1,
                            title: section.title,
                            lines: section.lines
                        }));
                    });
                    summaryParts.push('');
                }

                // 添加关键词分析
                const keywords = popup.extractKeywords(text);
                if (keywords.length > 0) {
                    summaryParts.push(`${popup.t('popup.summary.keywordsLabel')}${keywords.slice(0, 10).join(', ')}`);
                    summaryParts.push('');
                }

                summaryParts.push(`${popup.t('popup.summary.generatedAt')}${new Date().toLocaleString(locale || undefined)}`);

                return summaryParts.join('\n');

            } catch (error) {
                console.error('生成文本摘要失败:', error);
                return popup.t('popup.summary.generateFailed', { error: error.message || 'Unknown error' });
            }
        },

        /**
         * 分析内容结构
         */
        analyzeContentStructure(lines) {
            const sections = [];
            let sectionIndex = 1;
            let currentSection = { title: popup.t('popup.summary.section.start'), lines: 0 };

            lines.forEach((line, index) => {
                currentSection.lines++;

                // 检测新的段落或标题
                if (line.trim().length === 0 ||
                    line.startsWith('#') ||
                    line.startsWith('##') ||
                    line.startsWith('###') ||
                    line.length < 50 && line.endsWith(':') ||
                    /^[A-Z][A-Z\s]+$/.test(line.trim())) {

                    if (currentSection.lines > 1) {
                        sections.push({ ...currentSection });
                    }

                    sectionIndex += 1;
                    currentSection = {
                        title: line.trim() || popup.t('popup.summary.section.default', { index: sectionIndex }),
                        lines: 0
                    };
                }
            });

            // 添加最后一个部分
            if (currentSection.lines > 0) {
                sections.push(currentSection);
            }

            return sections.slice(0, 5); // 只返回前5个部分
        },

        /**
         * 提取关键词
         */
        extractKeywords(text) {
            // 简单的关键词提取
            const words = text.toLowerCase()
                .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2);

            const wordCount = {};
            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });

            return Object.entries(wordCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([word]) => word);
        }
    };
}

