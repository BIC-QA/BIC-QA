/**
 * 进度消息管理器
 * 负责进度消息的更新和替换
 */
export function createProgressManager(popup) {
    return {
        /**
         * 在格式化之前更新进度提示信息
         */
        updateProgressMessagesBeforeFormat(content) {
            try {
                console.log('在格式化之前检查提示信息...');
                console.log('原始内容包含blockquote相关文本:', content.includes('>'));

                // 检查是否包含blockquote相关的内容（以>开头的行）
                if (content.includes('>')) {
                    console.log('检测到可能的blockquote内容，开始处理提示信息...');

                    // 检查当前resultText中是否有第一个p标签
                    const firstP = popup.resultText.querySelector('p');
                    if (firstP) {
                        console.log('找到现有的第一个p标签:', firstP);
                        let pContent = firstP.innerHTML;
                        console.log('当前p标签内容:', pContent);

                        let hasChanged = false;

                        // 更灵活的匹配和替换
                        const searchPatterns = [
                            {
                                search: /正在搜索知识库\.\.\./g,
                                replace: '搜索知识库完成',
                                name: '搜索知识库'
                            },
                            {
                                search: /正在思考中，请稍候\.\.\./g,
                                replace: '已思考完成',
                                name: '思考中'
                            },
                            // 添加更多可能的变体
                            {
                                search: /正在搜索知识库\.\.\./g,
                                replace: '搜索知识库完成',
                                name: '搜索知识库(无转义)'
                            },
                            {
                                search: /正在思考中，请稍候\.\.\./g,
                                replace: '已思考完成',
                                name: '思考中(无转义)'
                            }
                        ];

                        for (const pattern of searchPatterns) {
                            if (pattern.search.test(pContent)) {
                                console.log(`匹配到模式: ${pattern.name}`);
                                pContent = pContent.replace(pattern.search, pattern.replace);
                                hasChanged = true;
                            }
                        }

                        // 如果有变化，更新内容
                        if (hasChanged) {
                            console.log('更新p标签内容:', pContent);
                            firstP.innerHTML = pContent;
                        } else {
                            console.log('没有找到需要替换的文本');
                        }
                    } else {
                        console.log('未找到现有的第一个p标签');
                    }
                } else {
                    console.log('未检测到blockquote相关文本');
                }
            } catch (error) {
                console.error('更新进度提示信息失败:', error);
            }
        },

        /**
         * 更新进度提示信息（保留原方法以防其他地方调用）
         */
        updateProgressMessages(formattedContent) {
            try {
                console.log('检查是否需要更新提示信息...');
                console.log('formattedContent包含blockquote:', formattedContent.includes('<blockquote>'));

                // 检查是否包含blockquote内容
                if (formattedContent.includes('<blockquote>')) {
                    console.log('检测到blockquote，开始查找第一个p标签...');

                    // 获取第一个p标签
                    const firstP = popup.resultText.querySelector('p');
                    if (firstP) {
                        console.log('找到第一个p标签:', firstP);
                        let pContent = firstP.innerHTML;
                        console.log('p标签内容:', pContent);

                        let hasChanged = false;

                        // 更灵活的匹配和替换
                        const searchPatterns = [
                            {
                                search: /正在搜索知识库\.\.\./g,
                                replace: '搜索知识库完成',
                                name: '搜索知识库'
                            },
                            {
                                search: /正在思考中，请稍候\.\.\./g,
                                replace: '已思考完成',
                                name: '思考中'
                            },
                            // 添加更多可能的变体
                            {
                                search: /正在搜索知识库\.\.\./g,
                                replace: '搜索知识库完成',
                                name: '搜索知识库(无转义)'
                            },
                            {
                                search: /正在思考中，请稍候\.\.\./g,
                                replace: '已思考完成',
                                name: '思考中(无转义)'
                            }
                        ];

                        for (const pattern of searchPatterns) {
                            if (pattern.search.test(pContent)) {
                                console.log(`匹配到模式: ${pattern.name}`);
                                pContent = pContent.replace(pattern.search, pattern.replace);
                                hasChanged = true;
                            }
                        }

                        // 如果有变化，更新内容
                        if (hasChanged) {
                            console.log('更新p标签内容:', pContent);
                            firstP.innerHTML = pContent;
                        } else {
                            console.log('没有找到需要替换的文本');
                        }
                    } else {
                        console.log('未找到第一个p标签');
                    }
                } else {
                    console.log('未检测到blockquote内容');
                }
            } catch (error) {
                console.error('更新进度提示信息失败:', error);
            }
        },

        /**
         * 开始定期检查和替换提示信息
         */
        startProgressMessageReplacement() {
            console.log('开始定期检查提示信息替换...');

            // 每500ms检查一次
            const checkInterval = setInterval(() => {
                popup.checkAndReplaceProgressMessages();
            }, 500);

            // 保存interval ID，以便后续可以停止
            popup.progressMessageInterval = checkInterval;
        },

        /**
         * 停止定期检查
         */
        stopProgressMessageReplacement() {
            if (popup.progressMessageInterval) {
                clearInterval(popup.progressMessageInterval);
                popup.progressMessageInterval = null;
                console.log('停止定期检查提示信息替换');
            }
        },

        /**
         * 检查并替换提示信息
         */
        checkAndReplaceProgressMessages() {
            try {
                // 检查resultText是否存在
                if (!popup.resultText) {
                    return;
                }

                // 获取第一个p标签
                const firstP = popup.resultText.querySelector('p');
                if (!firstP) {
                    return;
                }

                let pContent = firstP.innerHTML;
                let hasChanged = false;

                // 替换提示信息
                if (pContent.includes('正在搜索知识库...')) {
                    pContent = pContent.replace(/正在搜索知识库\.\.\./g, '搜索知识库完成');
                    hasChanged = true;
                    console.log('替换: 正在搜索知识库... → 搜索知识库完成');
                }

                if (pContent.includes('正在思考中，请稍候...')) {
                    pContent = pContent.replace(/正在思考中，请稍候\.\.\./g, '已思考完成');
                    hasChanged = true;
                    console.log('替换: 正在思考中，请稍候... → 已思考完成');
                }

                // 如果有变化，更新内容
                if (hasChanged) {
                    firstP.innerHTML = pContent;
                    console.log('提示信息已更新');
                }

            } catch (error) {
                console.error('检查并替换提示信息失败:', error);
            }
        },

        /**
         * 流式数据加载完成后替换提示信息
         */
        replaceProgressMessagesAfterStream() {
            try {
                console.log('=== 开始替换提示信息 ===');
                // console.log('resultText元素:', popup.resultText);

                // 检查resultText是否存在
                if (!popup.resultText) {
                    console.log('❌ resultText不存在');
                    return;
                }

                // 获取所有p标签
                const allP = popup.resultText.querySelectorAll('p');
                console.log('找到的p标签数量:', allP.length);

                if (allP.length === 0) {
                    console.log('❌ 未找到任何p标签');
                    return;
                }

                // 遍历所有p标签，查找包含提示信息的标签
                let hasReplaced = false;

                for (let i = 0; i < allP.length; i++) {
                    const p = allP[i];
                    let pContent = p.innerHTML;
                    let hasChanged = false;

                    console.log(`检查第${i + 1}个p标签:`, pContent);

                    // 更灵活的匹配和替换
                    const searchPatterns = [
                        {
                            search: /正在搜索知识库\.\.\./g,
                            replace: '搜索知识库完成',
                            name: '搜索知识库'
                        },
                        {
                            search: /正在思考中，请稍候\.\.\./g,
                            replace: '已思考完成',
                            name: '思考中'
                        },
                        // 添加更多可能的变体
                        {
                            search: /正在搜索知识库\.\.\./g,
                            replace: '搜索知识库完成',
                            name: '搜索知识库(无转义)'
                        },
                        {
                            search: /正在思考中，请稍候\.\.\./g,
                            replace: '已思考完成',
                            name: '思考中(无转义)'
                        },
                        // 添加可能的HTML实体变体
                        {
                            search: /正在搜索知识库&hellip;/g,
                            replace: '搜索知识库完成',
                            name: '搜索知识库(HTML实体)'
                        },
                        {
                            search: /正在思考中，请稍候&hellip;/g,
                            replace: '已思考完成',
                            name: '思考中(HTML实体)'
                        }
                    ];

                    for (const pattern of searchPatterns) {
                        if (pattern.search.test(pContent)) {
                            console.log(`✅ 匹配到模式: ${pattern.name}`);
                            pContent = pContent.replace(pattern.search, pattern.replace);
                            hasChanged = true;
                            hasReplaced = true;
                        }
                    }

                    // 如果有变化，更新内容
                    if (hasChanged) {
                        console.log(`更新第${i + 1}个p标签内容:`, pContent);
                        p.innerHTML = pContent;
                    }
                }

                if (hasReplaced) {
                    console.log('✅ 提示信息替换完成');
                } else {
                    console.log('❌ 没有找到需要替换的文本');
                }

            } catch (error) {
                console.error('❌ 替换提示信息失败:', error);
            }
        }
    };
}

