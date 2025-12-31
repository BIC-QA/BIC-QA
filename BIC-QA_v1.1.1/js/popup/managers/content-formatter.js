/**
 * 内容格式化管理器
 * 负责内容格式化、表格处理等功能
 */
import { escapeHtml } from '../utils/common.js';

export function createContentFormatter(popup) {
    return {
        /**
         * 格式化内容
         */
        formatContent(content) {
            if (!content) return '';

            // 简单的缓存机制，避免重复处理相同内容
            if (popup._lastContent === content && popup._lastFormattedContent) {
                return popup._lastFormattedContent;
            }

            // 检查文本是否包含Markdown格式
            const hasMarkdown = /\*\*.*?\*\*|`.*?`|```.*?```|###|####|---/.test(content);

            // 如果是纯文本，直接返回pre标签包装的内容
            if (!hasMarkdown) {
                const plainTextContent = `<pre class="plain-text-pre" style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; padding: 0; background: transparent; border: none;">${escapeHtml(content)}</pre>`;

                // 缓存结果
                popup._lastContent = content;
                popup._lastFormattedContent = plainTextContent;

                return plainTextContent;
            }

            // 初始化代码块索引（使用时间戳确保唯一性）
            if (!popup._codeBlockIndex) {
                popup._codeBlockIndex = 0;
            }
            const baseIndex = Date.now();
            let codeBlockIndex = 0;

            let formattedContent = content;

            // 先处理表格格式 - 在换行符转换之前
            formattedContent = popup.formatTableWithNewlines(formattedContent);

            // 先处理代码块（多行）- 在换行符转换之前，避免代码块内的换行符被转换成<br>
            // 使用占位符临时替换代码块，处理完其他内容后再恢复
            const codeBlockPlaceholders = [];
            const copyIconUrl = popup.iconUrls?.copy || popup.getAssetUrl?.('icons/copy.svg') || '../icons/copy.svg';
            
            formattedContent = formattedContent.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
                codeBlockIndex++;
                const codeId = `code-block-${baseIndex}-${codeBlockIndex}`;
                // 代码内容转义HTML，但保留换行符（pre标签会处理）
                const escapedCode = escapeHtml(code);
                const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlockIndex}__`;
                codeBlockPlaceholders.push({
                    placeholder: placeholder,
                    html: `<div class="code-block-wrapper"><pre><code class="language-${lang}" id="${codeId}">${escapedCode}</code></pre><button class="code-copy-btn" data-code-id="${codeId}" title="复制代码"><img src="${copyIconUrl}" alt="复制" class="code-copy-icon"></button></div>`
                });
                return placeholder;
            });
            formattedContent = formattedContent.replace(/```\n([\s\S]*?)```/g, (match, code) => {
                codeBlockIndex++;
                const codeId = `code-block-${baseIndex}-${codeBlockIndex}`;
                const escapedCode = escapeHtml(code);
                const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlockIndex}__`;
                codeBlockPlaceholders.push({
                    placeholder: placeholder,
                    html: `<div class="code-block-wrapper"><pre><code id="${codeId}">${escapedCode}</code></pre><button class="code-copy-btn" data-code-id="${codeId}" title="复制代码"><img src="${copyIconUrl}" alt="复制" class="code-copy-icon"></button></div>`
                });
                return placeholder;
            });
            formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
                codeBlockIndex++;
                const codeId = `code-block-${baseIndex}-${codeBlockIndex}`;
                const escapedCode = escapeHtml(code);
                const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlockIndex}__`;
                codeBlockPlaceholders.push({
                    placeholder: placeholder,
                    html: `<div class="code-block-wrapper"><pre><code id="${codeId}">${escapedCode}</code></pre><button class="code-copy-btn" data-code-id="${codeId}" title="复制代码"><img src="${copyIconUrl}" alt="复制" class="code-copy-icon"></button></div>`
                });
                return placeholder;
            });

            // 处理换行符 - 在代码块处理之后（代码块已用占位符替换，不会被影响）
            formattedContent = formattedContent.replace(/\n/g, '<br>');

            // 处理Markdown样式的标题 - 改进处理逻辑
            // 先处理带粗体的标题
            formattedContent = formattedContent.replace(/### \*\*(.*?)\*\*/g, '<h3><strong>$1</strong></h3>');
            formattedContent = formattedContent.replace(/#### \*\*(.*?)\*\*/g, '<h4><strong>$1</strong></h4>');

            // 处理普通标题 - 使用更精确的方法
            // 先按<br>分割，然后处理每一行
            const lines = formattedContent.split('<br>');
            const processedLines = lines.map(line => {
                const trimmedLine = line.trim();
                // 检查是否是标题行 - 使用更精确的匹配
                if (trimmedLine.match(/^####\s+/)) {
                    const titleText = trimmedLine.substring(5); // 移除 '#### '
                    return `<h4>${titleText}</h4>`;
                } else if (trimmedLine.match(/^###\s+/)) {
                    const titleText = trimmedLine.substring(4); // 移除 '### '
                    return `<h3>${titleText}</h3>`;
                } else if (trimmedLine.match(/^##\s+/)) {
                    const titleText = trimmedLine.substring(3); // 移除 '## '
                    return `<h2>${titleText}</h2>`;
                } else if (trimmedLine.match(/^#\s+/)) {
                    const titleText = trimmedLine.substring(2); // 移除 '# '
                    return `<h1>${titleText}</h1>`;
                }
                return line;
            });
            formattedContent = processedLines.join('<br>');

            // 处理行内代码
            formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');

            // 处理粗体 - 改进正则表达式，避免贪婪匹配
            formattedContent = formattedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // 处理斜体
            formattedContent = formattedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // 处理分割线
            formattedContent = formattedContent.replace(/---/g, '<hr>');

            // 处理列表项
            formattedContent = formattedContent.replace(/^\d+\. \*\*(.*?)\*\*：/gm, '<li><strong>$1</strong>：');
            formattedContent = formattedContent.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
            formattedContent = formattedContent.replace(/^- \*\*(.*?)\*\*：/gm, '<li><strong>$1</strong>：');
            formattedContent = formattedContent.replace(/^- (.*?)$/gm, '<li>$1</li>');

            // 改进blockquote处理 - 修复正则表达式
            // 处理以>开头的行，支持多行blockquote
            // 先按<br>分割，然后处理连续的blockquote行
            const blockquoteLines = formattedContent.split('<br>');
            const processedBlockquoteLines = [];
            let currentBlockquote = [];

            for (let i = 0; i < blockquoteLines.length; i++) {
                const line = blockquoteLines[i];
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('> ')) {
                    // 这是一个blockquote行
                    const content = trimmedLine.substring(2); // 移除 '> '
                    currentBlockquote.push(content);
                } else {
                    // 不是blockquote行，结束表格收集
                    if (currentBlockquote.length > 0) {
                        const blockquoteHtml = `<blockquote>${currentBlockquote.join('<br>')}</blockquote>`;
                        processedBlockquoteLines.push(blockquoteHtml);
                        currentBlockquote = [];
                    }
                    // 添加当前行
                    processedBlockquoteLines.push(line);
                }
            }

            // 处理最后的blockquote
            if (currentBlockquote.length > 0) {
                const blockquoteHtml = `<blockquote>${currentBlockquote.join('<br>')}</blockquote>`;
                processedBlockquoteLines.push(blockquoteHtml);
            }

            formattedContent = processedBlockquoteLines.join('<br>');

            // 处理链接
            formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

            // 改进段落处理 - 避免在已有HTML标签外包装p标签
            // 先分割内容，分别处理表格和非表格部分
            const parts = formattedContent.split(/(<div class="table-container">.*?<\/div>|<div class="code-block-wrapper">.*?<\/div>|<h[1-6]>.*?<\/h[1-6]>|<pre>.*?<\/pre>|<blockquote>.*?<\/blockquote>)/g);
            const processedParts = parts.map((part, index) => {
                // 如果是表格部分、代码块包装器、标题部分、代码块或blockquote部分，直接返回
                if (part.includes('<div class="table-container">') ||
                    part.includes('<div class="code-block-wrapper">') ||
                    part.match(/<h[1-6]>.*?<\/h[1-6]>/) ||
                    part.includes('<pre>') ||
                    part.includes('<blockquote>')) {
                    return part;
                }

                // 如果是非特殊部分，进行段落处理
                let processedPart = part;

                // 处理连续的<br>标签，但保留单个<br>
                processedPart = processedPart.replace(/(<br>){3,}/g, '</p><p>');
                processedPart = processedPart.replace(/(<br>){2}/g, '</p><p>');

                // 包装在段落中，但避免在已有HTML标签外包装
                if (processedPart.trim() && !processedPart.match(/^<[^>]+>.*<\/[^>]+>$/)) {
                    processedPart = '<p>' + processedPart + '</p>';
                }

                // 清理空的段落，但保留包含<br>的段落
                processedPart = processedPart.replace(/<p><\/p>/g, '');

                return processedPart;
            });

            formattedContent = processedParts.join('');

            // 恢复代码块占位符
            codeBlockPlaceholders.forEach(item => {
                formattedContent = formattedContent.replace(item.placeholder, item.html);
            });

            // 缓存结果
            popup._lastContent = content;
            popup._lastFormattedContent = formattedContent;

            return formattedContent;
        },

        /**
         * 处理表格格式的辅助方法 - 基于\n换行符
         */
        formatTableWithNewlines(content) {
            // 按\n换行符分割内容
            const lines = content.split('\n');
            const processedLines = [];
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];

                // 检查是否开始表格
                if (popup.isTableRow(line) && !popup.tableState.isInTable) {
                    popup.tableState.isInTable = true;
                    popup.tableState.tableStartIndex = i;
                    popup.tableState.tableLines = [line];
                    i++;

                    // 收集表格的所有行
                    while (i < lines.length) {
                        const nextLine = lines[i];

                        // 如果是表格行，继续收集
                        if (popup.isTableRow(nextLine)) {
                            popup.tableState.tableLines.push(nextLine);
                            i++;
                        } else {
                            // 不是表格行，结束表格收集
                            break;
                        }
                    }

                    // 处理收集到的表格
                    const tableHtml = popup.processTableLinesWithNewlines(popup.tableState.tableLines);
                    processedLines.push(tableHtml);

                    // 重置表格状态
                    popup.resetTableState();
                } else {
                    // 非表格行，直接添加
                    processedLines.push(line);
                    i++;
                }
            }

            const result = processedLines.join('\n');
            return result;
        },

        /**
         * 处理表格行集合 - 基于\n换行符
         */
        processTableLinesWithNewlines(tableLines) {
            if (tableLines.length < 2) {
                // 如果表格行数不足，返回原始内容
                return tableLines.join('\n');
            }

            // 解析所有行
            const rows = tableLines.map(line => popup.parseTableRow(line));

            // 过滤掉空行
            const validRows = rows.filter(row => row && row.length > 0);

            if (validRows.length === 0) {
                return tableLines.join('\n');
            }

            // 检查是否有分隔行
            let hasSeparator = false;
            let headerRow = validRows[0];
            let dataRows = validRows.slice(1);

            // 检查第二行是否是分隔行
            if (validRows.length > 1 && popup.isTableSeparator(tableLines[1])) {
                hasSeparator = true;
                headerRow = validRows[0];
                dataRows = validRows.slice(2); // 跳过分隔行
            }

            // 生成HTML表格
            let tableHtml = '<div class="table-container"><table class="result-table">';

            // 添加表头
            if (headerRow && headerRow.length > 0) {
                tableHtml += '<thead><tr>';
                headerRow.forEach(header => {
                    tableHtml += `<th>${header}</th>`;
                });
                tableHtml += '</tr></thead>';
            }

            // 添加数据行
            if (dataRows.length > 0) {
                tableHtml += '<tbody>';
                dataRows.forEach(row => {
                    if (row && row.length > 0) {
                        tableHtml += '<tr>';
                        row.forEach(cell => {
                            // 处理单元格中的<br>标签（来自原始数据）
                            const processedCell = cell.replace(/<br>/g, '<br>');
                            tableHtml += `<td>${processedCell}</td>`;
                        });
                        tableHtml += '</tr>';
                    }
                });
                tableHtml += '</tbody>';
            }

            tableHtml += '</table></div>';
            return tableHtml;
        },

        /**
         * 重置表格状态
         */
        resetTableState() {
            popup.tableState = {
                isInTable: false,
                currentTable: null,
                tableLines: [],
                tableStartIndex: -1
            };
        },

        /**
         * 检查是否是表格行
         */
        isTableRow(line) {
            const trimmed = line.trim();
            return trimmed.startsWith('|') && trimmed.endsWith('|');
        },

        /**
         * 检查是否是表格分隔行
         */
        isTableSeparator(line) {
            const trimmed = line.trim();
            return trimmed.startsWith('|') && trimmed.endsWith('|') &&
                /^[\s|:-]+$/.test(trimmed.replace(/[|]/g, ''));
        },

        /**
         * 安全解析表格行的方法
         */
        parseTableRow(row) {
            // 移除首尾的 | 符号
            let cleanRow = row.trim();
            if (cleanRow.startsWith('|')) {
                cleanRow = cleanRow.substring(1);
            }
            if (cleanRow.endsWith('|')) {
                cleanRow = cleanRow.substring(0, cleanRow.length - 1);
            }

            // 使用正则表达式分割，但保护<br>标签
            // 匹配 | 但不匹配 | 在 <br> 标签内的情况
            const cells = [];
            let currentCell = '';
            let inBrTag = false;
            let i = 0;

            while (i < cleanRow.length) {
                const char = cleanRow[i];

                if (char === '<' && cleanRow.substring(i, i + 4) === '<br>') {
                    inBrTag = true;
                    currentCell += '<br>';
                    i += 4;
                    inBrTag = false;
                } else if (char === '|' && !inBrTag) {
                    // 遇到分隔符，保存当前单元格
                    cells.push(currentCell.trim());
                    currentCell = '';
                    i++;
                } else {
                    currentCell += char;
                    i++;
                }
            }

            // 添加最后一个单元格
            if (currentCell.trim()) {
                cells.push(currentCell.trim());
            }

            return cells.filter(cell => cell !== '');
        },

        /**
         * 清理格式缓存
         */
        clearFormatCache() {
            popup._lastContent = null;
            popup._lastFormattedContent = null;
        }
    };
}

