export function createStreamService(popup) {
    async function handleStreamResponse(response, container = null, question = '', provider = null, model = null) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let fullContent = ''; // 完整的中文内容
        let lastUpdateTime = 0;
        let updateQueue = [];
        let isUpdating = false;
        
        // 检查是否需要翻译
        const targetLanguageName = popup.getLanguageDisplayName(popup.currentLanguage);
        const needsTranslation = popup.currentLanguage && popup.currentLanguage !== 'zhcn' && !targetLanguageName.includes('中文');

        const targetContainer = container || popup.resultContainer;
        const resultText = targetContainer ? targetContainer.querySelector('.result-text') : popup.resultText;

        let tipsEl = null;
        let contentEl = null;
        if (resultText) {
            tipsEl = resultText.querySelector('.result-text-tips');
            contentEl = resultText.querySelector('.result-text-content');

            if (!tipsEl) {
                tipsEl = document.createElement('p');
                tipsEl.className = 'result-text-tips';
                resultText.appendChild(tipsEl);
            }
            if (!contentEl) {
                contentEl = document.createElement('div');
                contentEl.className = 'result-text-content';
                resultText.appendChild(contentEl);
            }
        }

        if (targetContainer) {
            targetContainer.style.display = 'block';
        }

        popup.clearFormatCache();
        popup.resetTableState();

        if (resultText) {
            resultText.style.display = 'block';
            resultText.style.minHeight = '100px';
            resultText.style.padding = '10px';
            resultText.style.backgroundColor = '#fff';
        }

        // 模拟流式展示翻译后的内容
        async function simulateStreamDisplay(translatedText) {
            if (!translatedText || translatedText.length === 0) {
                return;
            }

            const chunkSize = 3; // 每次显示的字符数，可以根据需要调整
            let displayedLength = 0;
            const totalLength = translatedText.length;

            return new Promise((resolve) => {
                const displayInterval = setInterval(() => {
                    if (popup.hasBeenStopped || displayedLength >= totalLength) {
                        clearInterval(displayInterval);
                        // 确保显示完整内容
                        const finalFormattedContent = popup.formatContent(translatedText);
                        if (contentEl) {
                            contentEl.innerHTML = finalFormattedContent;
                        }
                        resolve();
                        return;
                    }

                    displayedLength = Math.min(displayedLength + chunkSize, totalLength);
                    const currentContent = translatedText.slice(0, displayedLength);
                    
                    popup.updateProgressMessagesBeforeFormat(currentContent);
                    const formattedContent = popup.formatContent(currentContent);
                    if (contentEl) {
                        contentEl.innerHTML = formattedContent;
                    }

                    if (popup.resultContainer) {
                        popup.resultContainer.scrollTop = popup.resultContainer.scrollHeight;
                    }
                }, 30); // 每30ms更新一次，模拟流式效果
            });
        }

        const debouncedUpdate = async (content) => {
            if (popup.hasBeenStopped) {
                return;
            }
            if (!content || content.length === 0) {
                return;
            }
            const now = Date.now();
            if (now - lastUpdateTime < 100) {
                return;
            }
            lastUpdateTime = now;

            if (isUpdating) {
                updateQueue.push(content);
                return;
            }

            isUpdating = true;
            try {
                popup.updateProgressMessagesBeforeFormat(content);

                // 如果需要翻译，不显示原始内容，等待翻译完成后再显示
                if (!needsTranslation || !provider || !model) {
                    const formattedContent = popup.formatContent(content);
                    if (contentEl) {
                        contentEl.innerHTML = formattedContent;
                    } else {
                        console.warn('未能获取到contentEl，跳过最终内容更新');
                    }

                    if (popup.resultContainer) {
                        popup.resultContainer.scrollTop = popup.resultContainer.scrollHeight;
                    }
                }
                // 如果需要翻译，这里不显示，等待流式结束后统一翻译和显示
            } finally {
                isUpdating = false;

                if (updateQueue.length > 0) {
                    const nextContent = updateQueue.pop();
                    updateQueue = [];
                    setTimeout(() => debouncedUpdate(nextContent), 50);
                }
            }
        };

        console.log('开始读取流式数据...');

        while (true) {
            if (popup.hasBeenStopped) {
                console.log('检测到停止标志，结束流式处理');
                break;
            }
            const { done, value } = await reader.read();
            if (done) {
                console.log('流式读取完成');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim() === '') continue;

                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);

                    if (dataStr.trim() === '[DONE]') {
                        console.log('流式响应结束');
                        
                        // 如果需要翻译，先翻译完整内容，然后模拟流式展示
                        let finalContent = fullContent;
                        if (needsTranslation && provider && model && fullContent.trim().length > 0) {
                            try {
                                console.log('开始翻译完整内容:', fullContent.length, '字符');
                                // 显示翻译中的提示
                                if (tipsEl) {
                                    tipsEl.textContent = popup.t('popup.progress.translating') || '正在翻译...';
                                }
                                
                                const translated = await popup.requestChatCompletionTranslation(
                                    fullContent,
                                    provider,
                                    model,
                                    targetLanguageName
                                );
                                
                                if (translated && translated.trim()) {
                                    finalContent = translated.trim();
                                    console.log('翻译完成，开始模拟流式展示');
                                    // 模拟流式展示翻译后的内容
                                    await simulateStreamDisplay(finalContent);
                                } else {
                                    // 翻译失败，直接显示原始内容
                                    console.warn('翻译结果为空，显示原始内容');
                                    const finalFormattedContent = popup.formatContent(fullContent);
                                    if (contentEl) {
                                        contentEl.innerHTML = finalFormattedContent;
                                    }
                                }
                            } catch (error) {
                                console.error('翻译失败:', error);
                                // 翻译失败，直接显示原始内容
                                const finalFormattedContent = popup.formatContent(fullContent);
                                if (contentEl) {
                                    contentEl.innerHTML = finalFormattedContent;
                                }
                            }
                        } else {
                            // 不需要翻译，直接显示
                            const finalFormattedContent = popup.formatContent(finalContent);
                            if (contentEl) {
                                contentEl.innerHTML = finalFormattedContent;
                            }
                        }

                        if (tipsEl) {
                            if (popup._useKnowledgeBaseThisTime) {
                                const count = typeof popup._kbMatchCount === 'number' ? popup._kbMatchCount : 0;
                                if (count === 0) {
                                    tipsEl.innerHTML = popup.t('popup.progress.kbNoMatch', { count });
                                } else {
                                    tipsEl.innerHTML = popup.t('popup.progress.kbMatch', { count });
                                }
                            } else {
                                tipsEl.textContent = popup.t('popup.progress.completedWithResult');
                            }
                        }

                        if (!popup.hasBeenStopped && popup._useKnowledgeBaseThisTime && Array.isArray(popup._kbItems) && popup._kbItems.length > 0) {
                            console.log('流式处理完成，渲染知识库列表，条目数量:', popup._kbItems.length);
                            popup.renderKnowledgeList(popup._kbItems, targetContainer, popup._kbImageList);
                        } else {
                            console.log('流式处理完成，不渲染知识库列表');
                        }

                        setTimeout(() => {
                            popup.replaceProgressMessagesAfterStream();
                        }, 100);

                        popup.resetFeedbackButtons(targetContainer);
                        const resultActions = targetContainer ? targetContainer.querySelector('.result-actions') : null;
                        if (resultActions) {
                            resultActions.style.display = 'block';
                            setTimeout(() => {
                                resultActions.style.opacity = '1';
                            }, 100);
                        }
                        if (popup.startTime) {
                            const endTime = Date.now();
                            const duration = Math.round((endTime - popup.startTime) / 1000);
                            const resultTitle = targetContainer ? targetContainer.querySelector('.result-title') : document.querySelector('.result-title');
                            if (resultTitle) {
                                resultTitle.textContent = popup.t('popup.progress.answerCompleted', { seconds: duration });
                            }
                        }

                        // 保存翻译后的内容到会话历史
                        popup.addToCurrentSessionHistory(question, finalContent);

                        return finalContent;
                    }

                    try {
                        const data = JSON.parse(dataStr);

                        if (data.choices && data.choices[0] && data.choices[0].delta) {
                            const delta = data.choices[0].delta;
                            if (delta.content) {
                                fullContent += delta.content;
                                await debouncedUpdate(fullContent);
                            }
                        } else if (data.content) {
                            fullContent += data.content;
                            await debouncedUpdate(fullContent);
                        }

                    } catch (parseError) {
                        console.error('解析流式数据失败:', parseError, '原始数据:', line);
                    }
                }
            }
        }

        console.log('流式读取循环结束');
        
        // 如果需要翻译，先翻译完整内容，然后模拟流式展示
        let finalContent = fullContent;
        if (needsTranslation && provider && model && fullContent.trim().length > 0) {
            try {
                console.log('开始翻译完整内容:', fullContent.length, '字符');
                // 显示翻译中的提示
                if (tipsEl) {
                    tipsEl.textContent = popup.t('popup.progress.translating') || '正在翻译...';
                }
                
                const translated = await popup.requestChatCompletionTranslation(
                    fullContent,
                    provider,
                    model,
                    targetLanguageName
                );
                
                if (translated && translated.trim()) {
                    finalContent = translated.trim();
                    console.log('翻译完成，开始模拟流式展示');
                    // 模拟流式展示翻译后的内容
                    await simulateStreamDisplay(finalContent);
                } else {
                    // 翻译失败，直接显示原始内容
                    console.warn('翻译结果为空，显示原始内容');
                    const finalFormattedContent = popup.formatContent(fullContent);
                    if (contentEl) {
                        contentEl.innerHTML = finalFormattedContent;
                    }
                }
            } catch (error) {
                console.error('翻译失败:', error);
                // 翻译失败，直接显示原始内容
                const finalFormattedContent = popup.formatContent(fullContent);
                if (contentEl) {
                    contentEl.innerHTML = finalFormattedContent;
                }
            }
        } else {
            // 不需要翻译，直接显示
            const finalFormattedContent = popup.formatContent(finalContent);
            if (contentEl) {
                contentEl.innerHTML = finalFormattedContent;
            }
        }
        
        if (popup.hasBeenStopped) {
            return finalContent;
        }
        console.log('最终累积内容长度:', finalContent.length);

        setTimeout(() => {
            popup.replaceProgressMessagesAfterStream();
        }, 100);

        return finalContent;
    }

    return {
        handleStreamResponse
    };
}

