/**
 * 结果操作管理器
 * 负责结果相关的操作，包括复制、导出、清空等
 */
import { escapeHtml } from '../utils/common.js';

export function createResultOperationsManager(popup) {
    return {
        /**
         * 复制结果
         */
        async copyResult(container = null) {
            // 获取目标容器
            const targetContainer = container || popup.resultContainer;
            const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;

            if (!resultText) {
                popup.showMessage(popup.t('popup.message.noContentToCopy'), 'error');
                return;
            }

            const text = resultText.textContent;
            try {
                await navigator.clipboard.writeText(text);
                popup.showMessage(popup.t('popup.message.copied'), 'success');
            } catch (error) {
                console.error('复制失败:', error);
                popup.showMessage(popup.t('popup.message.copyFailed'), 'error');
            }
        },

        /**
         * 导出结果为HTML
         */
        async exportResultAsHtml(container = null) {
            try {
                // 获取目标容器
                const targetContainer = container || popup.resultContainer;
                const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;

                if (!resultText) {
                    popup.showMessage(popup.t('popup.message.noContentToExport'), 'error');
                    return;
                }

                // 获取当前时间作为文件名的一部分
                const now = new Date();
                const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

                // 获取问题内容作为文件名的一部分
                const questionDisplay = targetContainer ? targetContainer.querySelector('.question-text') : popup.questionText;
                const question = questionDisplay ? questionDisplay.textContent.trim() : '未知问题';
                const questionPart = question.length > 20 ? question.substring(0, 20) + '...' : question;
                const safeQuestionPart = questionPart.replace(/[<>:"/\\|?*]/g, '_');

                // 生成文件名
                const fileName = `BIC-QA-结果-${safeQuestionPart}-${timestamp}.html`;

                // 获取结果内容的HTML
                let resultHtml = resultText.innerHTML;
                
                // 清理不需要的标签和文本
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = resultHtml;
                
                // 移除所有脚本和样式标签
                tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
                
                // 移除复制按钮（导出文件中不需要）
                tempDiv.querySelectorAll('.code-copy-btn').forEach(el => el.remove());
                
                // 清理代码块包装器，只保留pre标签
                tempDiv.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
                    const pre = wrapper.querySelector('pre');
                    if (pre) {
                        wrapper.replaceWith(pre.cloneNode(true));
                    }
                });
                
                // 移除"结果如下："等多余的标签文本
                tempDiv.querySelectorAll('.result-label, .result-title').forEach(el => {
                    const text = el.textContent.trim();
                    // 如果包含"结果如下"、"回答："等，移除这些标签
                    if (text.includes('结果如下') || text.includes('回答：') || text.includes('结果：')) {
                        el.remove();
                    }
                });
                
                // 移除空的段落和多余的换行
                tempDiv.querySelectorAll('p').forEach(p => {
                    const text = p.textContent.trim();
                    if (!text || text === '' || text === '结果如下：' || text === '回答：' || text === '结果：') {
                        p.remove();
                    }
                });
                
                resultHtml = tempDiv.innerHTML;

                const locale = popup.i18n?.getIntlLocale(popup.currentLanguage);

                // 使用内联SVG图标，避免路径问题
                const copyIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                </svg>`;

                // 创建完整的HTML文档
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
        .meta-info {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e5e9;
            font-size: 12px;
            color: #888;
            text-align: center;
        }
        
        /* 知识库展开/收缩样式 */
        .kb-item {
            margin: 8px 0;
            line-height: 1.6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            transition: all 0.3s ease;
        }
        .kb-item:hover {
            border-color: #d1d5db;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .kb-item.expanded {
            background: #fef3c7;
            border-color: #f59e0b;
        }
        .kb-toggle {
            color: #2563eb;
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
            display: inline-block;
            margin-left: 8px;
            background: transparent;
        }
        .kb-toggle:hover {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        .kb-toggle.expanded {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .kb-full {
            display: none;
            margin-top: 12px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
            white-space: pre-wrap;
            font-size: 13px;
            line-height: 1.6;
            color: #4b5563;
            max-height: 0;
            overflow: hidden;
            transition: all 0.3s ease;
            opacity: 0;
        }
        .kb-full.expanded {
            display: block;
            max-height: 4000px;
            opacity: 1;
        }
        
        /* Markdown样式 */
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #e1e5e9;
        }
        h4 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin: 15px 0 8px 0;
        }
        strong {
            font-weight: 600;
            color: #333;
        }
        em {
            font-style: italic;
            color: #666;
        }
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #e83e8c;
            border: 1px solid #e9ecef;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        pre code {
            background: none;
            padding: 0;
            border: none;
            color: #333;
            font-size: 13px;
            line-height: 1.5;
        }
        .code-block-wrapper {
            position: relative;
            margin: 15px 0;
        }
        .code-block-wrapper pre {
            padding-right: 50px;
        }
        .code-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 6px 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            opacity: 0.7;
            z-index: 10;
        }
        .code-copy-btn:hover {
            background: rgba(255, 255, 255, 1);
            opacity: 1;
            border-color: #667eea;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .code-copy-icon {
            width: 14px;
            height: 14px;
            display: block;
        }
        .code-copy-icon svg {
            width: 100%;
            height: 100%;
        }
        blockquote {
            padding: 15px;
            margin: 15px 0;
            color: #666;
            background: #f8f9fa;
            border-radius: 6px;
        }
        hr {
            border: none;
            border-top: 2px solid #e1e5e9;
            margin: 20px 0;
        }
        li {
            margin: 5px 0;
            padding-left: 5px;
        }
        a {
            color: #667eea;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.3s ease;
        }
        a:hover {
            border-bottom-color: #667eea;
        }
        p {
            margin: 10px 0;
        }
        /* 表格样式 */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        th {
            background: #f8f9fa;
            color: #495057;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            border-right: 1px solid #dee2e6;
        }
        th:last-child {
            border-right: none;
        }
        td {
            padding: 12px 16px;
            border-bottom: 1px solid #dee2e6;
            border-right: 1px solid #dee2e6;
            vertical-align: top;
            word-wrap: break-word;
            max-width: 200px;
            white-space: pre-line;
            line-height: 1.4;
        }
        td:last-child {
            border-right: none;
        }
        tr:last-child td {
            border-bottom: none;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        tbody tr:nth-child(even) {
            background-color: #fafbfc;
        }
        tbody tr:nth-child(even):hover {
            background-color: #f1f3f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">BIC-QA 智能问答结果</div>
            <div class="subtitle">导出时间：${now.toLocaleString(locale)}</div>
        </div>
        
        <div class="question-section">
            <div class="question-label">问题：</div>
            <div class="question-text">${escapeHtml(question)}</div>
            <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                ${copyIconSvg}
            </button>
        </div>
        
        <div class="result-section">
            <div class="result-label">回答：</div>
            <div class="result-content">${resultHtml}</div>
        </div>
        
        <div class="meta-info">
            <p>由 BIC-QA 扩展生成 | 导出时间：${now.toLocaleString(locale)}</p>
        </div>
    </div>
    
    <script>
        // 知识库展开/收缩功能
        document.addEventListener('DOMContentLoaded', function() {
            // 为所有kb-item下的a标签添加点击事件
            const kbItems = document.querySelectorAll('.kb-item');
            
            kbItems.forEach(function(item) {
                const toggleLink = item.querySelector('a');
                const fullContent = item.querySelector('.kb-full');
                
                if (toggleLink && fullContent) {
                    // 初始化状态
                    toggleLink.textContent = '${popup.t('popup.common.expandDetails')}';
                    toggleLink.classList.add('kb-toggle');
                    fullContent.classList.add('kb-full');
                    
                    // 添加点击事件
                    toggleLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        const isExpanded = fullContent.classList.contains('expanded');
                        
                        if (isExpanded) {
                            // 收起
                            fullContent.classList.remove('expanded');
                            toggleLink.classList.remove('expanded');
                            item.classList.remove('expanded');
                            toggleLink.textContent = '${popup.t('popup.common.expandDetails')}';
                            
                            // 延迟隐藏元素
                            setTimeout(() => {
                                if (!fullContent.classList.contains('expanded')) {
                                    fullContent.style.display = 'none';
                                }
                            }, 300);
                        } else {
                            // 展开
                            fullContent.style.display = 'block';
                            // 强制重绘
                            fullContent.offsetHeight;
                            fullContent.classList.add('expanded');
                            toggleLink.classList.add('expanded');
                            item.classList.add('expanded');
                            toggleLink.textContent = '${popup.t('popup.common.collapseDetails')}';
                        }
                    });
                    
                    // 添加悬停效果
                    toggleLink.addEventListener('mouseenter', function() {
                        if (!this.classList.contains('expanded')) {
                            this.style.backgroundColor = '#dbeafe';
                            this.style.color = '#1d4ed8';
                        }
                    });
                    
                    toggleLink.addEventListener('mouseleave', function() {
                        if (!this.classList.contains('expanded')) {
                            this.style.backgroundColor = 'transparent';
                            this.style.color = '#2563eb';
                        }
                    });
                }
            });
            
            // 为现有的知识库内容添加展开/收缩功能
            const existingKbItems = document.querySelectorAll('.kb-item');
            existingKbItems.forEach(function(item) {
                const toggleLink = item.querySelector('a');
                const fullContent = item.querySelector('.kb-full');
                
                if (toggleLink && fullContent) {
                    // 确保元素有正确的类名
                    toggleLink.classList.add('kb-toggle');
                    fullContent.classList.add('kb-full');
                    
                    // 初始化状态
                    toggleLink.textContent = '${popup.t('popup.common.expandDetails')}';
                    fullContent.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;

                // 创建Blob对象
                const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });

                // 创建下载链接
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;

                // 触发下载
                document.body.appendChild(link);
                link.click();

                // 清理
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                popup.showMessage(popup.t('popup.message.exportHtmlSuccess'), 'success');

            } catch (error) {
                console.error('导出失败:', error);
                popup.showMessage(popup.t('popup.message.exportFailed'), 'error');
            }
        },

        /**
         * 清空结果
         */
        clearResult(container = null) {
            // 如果指定了容器，只清空该容器
            if (container) {
                const resultText = container.querySelector('.result-text');
                if (resultText) {
                    resultText.innerHTML = '';
                }

                const questionDisplay = container.querySelector('.question-display');
                if (questionDisplay) {
                    questionDisplay.style.display = 'none';
                }

                const questionText = container.querySelector('.question-text');
                if (questionText) {
                    questionText.textContent = '';
                }

                const resultTitle = container.querySelector('.result-title');
                if (resultTitle) {
                    resultTitle.textContent = popup.t('popup.result.title');
                }

                popup.showMessage(popup.t('popup.message.clearConversationSuccess'), 'success');
                return;
            }

            // 如果没有指定容器，清空所有内容（原有逻辑）
            if (popup.resultContainer) {
                popup.resultContainer.style.display = 'none';
                // 清空结果容器中的所有内容，但保留默认容器
                const defaultContainer = popup.resultContainer.querySelector('#conversation-default');
                popup.resultContainer.innerHTML = '';
                if (defaultContainer) {
                    popup.resultContainer.appendChild(defaultContainer);
                }
            }
            if (popup.resultText) {
                popup.resultText.innerHTML = '';
            }
            if (popup.questionDisplay) {
                popup.questionDisplay.style.display = 'none';
            }
            if (popup.questionText) {
                popup.questionText.textContent = '';
            }

            // 清空当前会话历史
            popup.currentSessionHistory = [];
            console.log('当前会话历史已清空');

            // 重置知识库相关状态变量
            popup._useKnowledgeBaseThisTime = false;
            popup._kbMatchCount = 0;
            popup._kbItems = [];
            popup._kbImageList = [];
            console.log('clearResult: 知识库状态变量已重置');

            // 重置计时
            popup.startTime = null;

            // 重置标题
            const resultTitle = document.querySelector('.result-title');
            if (resultTitle) {
                resultTitle.textContent = popup.t('popup.result.title');
            }

            // 清空输入框并聚焦
            popup.questionInput.value = '';
            popup.questionInput.focus();

            // 更新字符计数显示
            popup.updateCharacterCount();

            // 更新布局状态
            popup.updateLayoutState();

            // 重置反馈按钮状态
            popup.resetFeedbackButtons();
        }
    };
}

