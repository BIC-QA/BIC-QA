import { escapeHtml, formatTime } from '../../utils/common.js';

function bindToPopup(fn, popup) {
    return fn.bind(null, popup);
}

export function createConversationView(popup) {
    return {
        updateQuestionDisplay: bindToPopup(updateQuestionDisplay, popup),
        updateAIDisplay: bindToPopup(updateAIDisplay, popup),
        scrollToBottom: bindToPopup(scrollToBottom, popup),
        createNewConversationContainer: bindToPopup(createNewConversationContainer, popup),
        getCurrentConversationContainer: bindToPopup(getCurrentConversationContainer, popup),
        getOrCreateConversationContainer: bindToPopup(getOrCreateConversationContainer, popup),
        forceCreateNewConversationContainer: bindToPopup(forceCreateNewConversationContainer, popup),
        clearConversationContainer: bindToPopup(clearConversationContainer, popup),
        renderKnowledgeList: bindToPopup(renderKnowledgeList, popup),
        resetFeedbackButtons: bindToPopup(resetFeedbackButtons, popup)
    };
}

function updateQuestionDisplay(popup, question, container = null) {
    const targetContainer = container || popup.resultContainer;
    let questionDisplay = null;

    if (targetContainer) {
        questionDisplay = targetContainer.querySelector('.question-display');
        if (!questionDisplay) {
            questionDisplay = document.createElement('div');
            questionDisplay.className = 'question-display';
            const resultListShow = targetContainer.querySelector('.resultListShow');
            if (resultListShow) {
                resultListShow.insertBefore(questionDisplay, resultListShow.firstChild);
            }
        }
    }

    if (questionDisplay) {
        questionDisplay.style.display = 'block';
        const currentTime = new Date();
        const timeStr = formatTime(currentTime);

        questionDisplay.innerHTML = `
            <div class="question-header">
                <div class="user-avatar">
                    <img src="${popup.iconUrls.user}" alt="用户" class="avatar-img">
                </div>
                <div class="question-info">
                    <div class="question-name" data-i18n="popup.result.userName">用户</div>
                    <div class="question-time">${timeStr}</div>
                </div>
            </div>
            <div class="question-content">
                <div class="question-text">${question}</div>
                <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                    <img src="${popup.iconUrls.copy}" alt="复制" class="copy-icon">
                </button>
            </div>
        `;

        // 立即更新 question-name 的文本内容，使用当前语言的翻译
        const questionNameEl = questionDisplay.querySelector('.question-name');
        if (questionNameEl) {
            questionNameEl.textContent = popup.t('popup.result.userName');
        }
    }

    scrollToBottom(popup);
}

function updateAIDisplay(popup, container = null) {
    const targetContainer = container || popup.resultContainer;
    let aiDisplay = null;

    if (targetContainer) {
        aiDisplay = targetContainer.querySelector('.ai-display');
        if (!aiDisplay) {
            aiDisplay = document.createElement('div');
            aiDisplay.className = 'ai-display';
            const resultListShow = targetContainer.querySelector('.resultListShow');
            if (resultListShow) {
                const questionDisplay = resultListShow.querySelector('.question-display');
                const resultTitle = resultListShow.querySelector('.result-title');
                if (questionDisplay && resultTitle) {
                    resultListShow.insertBefore(aiDisplay, resultTitle);
                } else {
                    resultListShow.insertBefore(aiDisplay, resultListShow.firstChild);
                }
            }
        }
    }

    if (aiDisplay) {
        aiDisplay.style.display = 'block';
        const currentTime = new Date();
        const timeStr = formatTime(currentTime);

        aiDisplay.innerHTML = `
            <div class="ai-header">
                <div class="ai-avatar">
                    <img src="${popup.iconUrls.ai}" alt="BIC-QA" class="avatar-img">
                </div>
                <div class="ai-info">
                    <div class="ai-name">BIC-QA</div>
                    <div class="ai-time">${timeStr}</div>
                </div>
            </div>
        `;
    }

    scrollToBottom(popup);
}

function scrollToBottom(popup) {
    if (popup.resultContainer) {
        setTimeout(() => {
            popup.resultContainer.scrollTop = popup.resultContainer.scrollHeight;
        }, 100);
    }
}

function createNewConversationContainer(popup) {
    const conversationContainer = document.createElement('div');
    conversationContainer.className = 'conversation-container';
    const containerId = `conversation-${Date.now()}`;
    conversationContainer.id = containerId;

    conversationContainer.innerHTML = `
        <div class="resultListShow">
            <div class="question-display" style="display: none;">
                <div class="question-header">
                    <div class="user-avatar">
                        <img src="${popup.iconUrls.user}" alt="用户" class="avatar-img">
                    </div>
                    <div class="question-info">
                        <div class="question-name" data-i18n="popup.result.userName">用户</div>
                        <div class="question-time"></div>
                    </div>
                </div>
                <div class="question-content">
                    <div class="question-text"></div>
                    <button class="copy-question-btn" title="复制问题" data-action="copy-question">
                        <img src="${popup.iconUrls.copy}" alt="复制" class="copy-icon">
                    </button>
                </div>
            </div>
            <div class="ai-display" style="display: none;">
                <div class="ai-header">
                    <div class="ai-avatar">
                        <img src="${popup.iconUrls.ai}" alt="BIC-QA" class="avatar-img">
                    </div>
                    <div class="ai-info">
                        <div class="ai-name">BIC-QA</div>
                        <div class="ai-time"></div>
                    </div>
                </div>
            </div>
            <h3 class="result-title">回答：</h3>
            <div class="result-text">
                <p class="result-text-tips"></p>
                <div class="result-text-content"></div>
                <div class="result-text-knowlist"></div>
            </div>
            <div class="result-actions">
                <div class="action-icons-row">
                    <button id="export-${containerId}" class="action-icon-btn export-btn" title="导出HTML">
                        <img src="${popup.iconUrls.download}" alt="导出" class="action-icon-svg">
                    </button>
                    <button id="copy-${containerId}" class="action-icon-btn copy-btn" title="复制">
                        <img src="${popup.iconUrls.copy}" alt="复制" class="action-icon-svg">
                    </button>
                    <button id="clear-${containerId}" class="action-icon-btn clear-btn" title="清空">
                        <img src="${popup.iconUrls.clear}" alt="清空" class="action-icon-svg">
                    </button>
                    <button id="like-${containerId}" class="action-icon-btn like-btn" title="点赞 - 回答有帮助">
                        <img src="${popup.iconUrls.good}" alt="点赞" class="action-icon-svg">
                    </button>
                    <button id="dislike-${containerId}" class="action-icon-btn dislike-btn" title="否定 - 回答没有帮助">
                        <img src="${popup.iconUrls.bad}" alt="否定" class="action-icon-svg">
                    </button>
                </div> 
            </div>
        </div>
    `;

    const questionNameEl = conversationContainer.querySelector('.question-display .question-name');
    if (questionNameEl) {
        questionNameEl.textContent = popup.t('popup.result.userName');
    }

    const aiNameEl = conversationContainer.querySelector('.ai-display .ai-name');
    if (aiNameEl) {
        aiNameEl.textContent = popup.t('popup.result.aiName');
    }

    const resultTitleEl = conversationContainer.querySelector('.result-title');
    if (resultTitleEl) {
        resultTitleEl.textContent = popup.t('popup.result.title');
    }

    if (popup.resultContainer) {
        popup.resultContainer.appendChild(conversationContainer);
    }
    const resultActions = conversationContainer.querySelector('.result-actions');
    if (resultActions) {
        resultActions.style.display = 'none';
        resultActions.style.opacity = '0';
        resultActions.style.transition = 'opacity 0.3s ease';
    }

    scrollToBottom(popup);

    return conversationContainer;
}

function getCurrentConversationContainer(popup) {
    const existingContainers = popup.resultContainer.querySelectorAll('.conversation-container');

    if (existingContainers.length === 0) {
        return getOrCreateConversationContainer(popup);
    }

    const lastContainer = existingContainers[existingContainers.length - 1];

    if (lastContainer.id === 'conversation-default' && popup.currentSessionHistory.length === 0) {
        return lastContainer;
    }

    return lastContainer;
}

function getOrCreateConversationContainer(popup) {
    const isFirstConversation = popup.currentSessionHistory.length === 0;
    let conversationContainer;

    if (isFirstConversation) {
        conversationContainer = popup.resultContainer.querySelector('#conversation-default');
        if (conversationContainer) {
            popup.resultContainer.style.display = 'block';
        }
    } else {
        conversationContainer = createNewConversationContainer(popup);
    }

    return conversationContainer;
}

function forceCreateNewConversationContainer(popup) {
    const isFirstConversation = popup.currentSessionHistory.length === 0;
    let conversationContainer;

    if (isFirstConversation) {
        conversationContainer = popup.resultContainer.querySelector('#conversation-default');
        if (conversationContainer) {
            clearConversationContainer(popup, conversationContainer);
            popup.resultContainer.style.display = 'block';
            return conversationContainer;
        }
        conversationContainer = createNewConversationContainer(popup);
        return conversationContainer;
    }

    conversationContainer = createNewConversationContainer(popup);
    return conversationContainer;
}

function clearConversationContainer(popup, container) {
    if (!container) return;

    const questionDisplay = container.querySelector('.question-display');
    if (questionDisplay) {
        questionDisplay.style.display = 'none';
    }

    const aiDisplay = container.querySelector('.ai-display');
    if (aiDisplay) {
        aiDisplay.style.display = 'none';
    }

    const resultTitle = container.querySelector('.result-title');
    if (resultTitle) {
        resultTitle.textContent = popup.t('popup.result.title');
    }

    const resultText = container.querySelector('.result-text');
    if (resultText) {
        resultText.innerHTML = `
            <p class="result-text-tips"></p>
            <div class="result-text-content"></div>
            <div class="result-text-knowlist"></div>
        `;
    }

    const resultActions = container.querySelector('.result-actions');
    if (resultActions) {
        resultActions.style.display = 'none';
        resultActions.style.opacity = '0';
    }
}

function renderKnowledgeList(popup, items, container = null, imageList = []) {
    try {
        let targetContainer = container;
        let resultText = null;

        if (targetContainer) {
            resultText = targetContainer.querySelector('.result-text');
        }

        if (!resultText) {
            resultText = popup.resultText;
        }

        if (!resultText) {
            console.error('无法找到result-text容器');
            return;
        }

        let knowlistEl = resultText.querySelector('.result-text-knowlist');
        if (!knowlistEl) {
            knowlistEl = document.createElement('div');
            knowlistEl.className = 'result-text-knowlist';
            resultText.appendChild(knowlistEl);
        }

        if ((!items || !Array.isArray(items) || items.length === 0) && 
            (!imageList || !Array.isArray(imageList) || imageList.length === 0)) {
            knowlistEl.innerHTML = '';
            knowlistEl.style.display = 'none';
            return;
        }

        knowlistEl.innerHTML = '';
        knowlistEl.style.display = 'block';

        // 解析图片列表，提取图片URL
        const parsedImages = [];
        if (imageList && Array.isArray(imageList) && imageList.length > 0) {
            imageList.forEach(imgStr => {
                if (typeof imgStr === 'string') {
                    // 解析 Markdown 格式的图片: ![alt](/path/to/image.png)
                    const match = imgStr.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    if (match) {
                        parsedImages.push({
                            alt: match[1] || '',
                            url: match[2]
                        });
                    } else if (imgStr.trim()) {
                        // 如果不是 Markdown 格式，直接作为 URL
                        parsedImages.push({
                            alt: '',
                            url: imgStr.trim()
                        });
                    }
                }
            });
        }

        // 如果有图片，显示图片缩略图区域
        if (parsedImages.length > 0) {
            const imageSection = document.createElement('div');
            imageSection.className = 'kb-image-section';
            imageSection.style.cssText = 'margin-bottom: 16px;';

            const imageTitle = document.createElement('div');
            imageTitle.textContent = popup.t('popup.knowledge.referenceImages') || '参考图片';
            imageTitle.className = 'kb-image-title';
            imageTitle.style.cssText = 'margin-bottom: 8px; font-weight: 600; color: #111827; font-size: 14px;';
            imageSection.appendChild(imageTitle);

            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'kb-image-thumbnails';
            thumbnailContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';

            parsedImages.forEach((img, index) => {
                const thumbnailWrapper = document.createElement('div');
                thumbnailWrapper.className = 'kb-image-thumbnail-wrapper';
                thumbnailWrapper.style.cssText = 'position: relative; cursor: pointer; border: 2px solid #e5e7eb; border-radius: 6px; overflow: hidden; transition: all 0.2s;';
                thumbnailWrapper.style.cssText += 'width: 80px; height: 80px;';

                const thumbnail = document.createElement('img');
                thumbnail.src = img.url;
                thumbnail.alt = img.alt || `图片 ${index + 1}`;
                thumbnail.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
                
                // 图片加载错误处理
                thumbnail.onerror = function() {
                    this.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; font-size: 12px;';
                    errorDiv.textContent = '加载失败';
                    thumbnailWrapper.appendChild(errorDiv);
                };

                thumbnailWrapper.appendChild(thumbnail);
                thumbnailWrapper.dataset.imageIndex = String(index);

                // 点击缩略图打开查看器
                thumbnailWrapper.addEventListener('click', () => {
                    openImageViewer(popup, parsedImages, index);
                });

                // 悬停效果
                thumbnailWrapper.addEventListener('mouseenter', () => {
                    thumbnailWrapper.style.borderColor = '#3b82f6';
                    thumbnailWrapper.style.transform = 'scale(1.05)';
                });
                thumbnailWrapper.addEventListener('mouseleave', () => {
                    thumbnailWrapper.style.borderColor = '#e5e7eb';
                    thumbnailWrapper.style.transform = 'scale(1)';
                });

                thumbnailContainer.appendChild(thumbnailWrapper);
            });

            imageSection.appendChild(thumbnailContainer);
            knowlistEl.appendChild(imageSection);
        }

        // 显示知识库文本内容
        if (items && Array.isArray(items) && items.length > 0) {
            const titleEl = document.createElement('div');
            titleEl.textContent = popup.t('popup.knowledge.referenceTitle');
            titleEl.className = 'cankao-list';
            titleEl.style.cssText = 'margin-top: 12px; font-weight: 600; color: #111827;';
            knowlistEl.appendChild(titleEl);

            const listEl = document.createElement('div');
            listEl.className = 'kb-list';
            knowlistEl.appendChild(listEl);

            items.forEach((raw, index) => {
                const full = String(raw || '');
                const plain = full.replace(/\s+/g, ' ').trim();
                const truncated = plain.length > 50 ? (plain.slice(0, 50) + '...') : plain;

                const itemEl = document.createElement('div');
                itemEl.className = 'kb-item';
                itemEl.style.cssText = 'margin: 6px 0; line-height: 1.6;';

                const summaryEl = document.createElement('span');
                summaryEl.innerHTML = `${escapeHtml(truncated)} `;
                itemEl.appendChild(summaryEl);

                const toggleEl = document.createElement('a');
                toggleEl.href = '#';
                toggleEl.textContent = popup.t('popup.common.viewAll');
                toggleEl.style.cssText = 'color: #2563eb; text-decoration: none;';
                toggleEl.dataset.index = String(index);
                itemEl.appendChild(toggleEl);

                const fullEl = document.createElement('div');
                fullEl.className = 'kb-full';
                fullEl.style.cssText = 'display: none; margin-top: 6px; padding: 8px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #93c5fd; white-space: pre-wrap;';
                fullEl.textContent = full;
                itemEl.appendChild(fullEl);

                toggleEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = fullEl.style.display === 'none';
                    fullEl.style.display = isHidden ? 'block' : 'none';
                    toggleEl.textContent = isHidden
                        ? popup.t('popup.common.collapseDetails')
                        : popup.t('popup.common.viewAll');
                });

                listEl.appendChild(itemEl);
            });
        }
    } catch (error) {
        console.error('渲染参考知识库列表失败:', error);
    }

    scrollToBottom(popup);
}

// 图片查看器函数
function openImageViewer(popup, images, currentIndex) {
    // 移除已存在的查看器
    const existingViewer = document.getElementById('kb-image-viewer');
    if (existingViewer) {
        existingViewer.remove();
    }

    if (!images || images.length === 0) return;

    const viewer = document.createElement('div');
    viewer.id = 'kb-image-viewer';
    viewer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;

    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        position: relative;
        max-width: 90%;
        max-height: 90%;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const image = document.createElement('img');
    image.src = images[currentIndex].url;
    image.alt = images[currentIndex].alt || `图片 ${currentIndex + 1}`;
    image.style.cssText = `
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 4px;
    `;

    // 图片加载错误处理
    image.onerror = function() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: #fff; font-size: 16px; padding: 20px;';
        errorDiv.textContent = '图片加载失败';
        imageContainer.innerHTML = '';
        imageContainer.appendChild(errorDiv);
    };

    imageContainer.appendChild(image);

    // 导航按钮（如果有多张图片）
    if (images.length > 1) {
        // 上一张按钮
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '‹';
        prevBtn.style.cssText = `
            position: absolute;
            left: -50px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #fff;
            font-size: 48px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        prevBtn.addEventListener('mouseenter', () => {
            prevBtn.style.background = 'rgba(255, 255, 255, 0.4)';
        });
        prevBtn.addEventListener('mouseleave', () => {
            prevBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
            viewer.remove();
            openImageViewer(popup, images, newIndex);
        });
        imageContainer.appendChild(prevBtn);

        // 下一张按钮
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '›';
        nextBtn.style.cssText = `
            position: absolute;
            right: -50px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #fff;
            font-size: 48px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        nextBtn.addEventListener('mouseenter', () => {
            nextBtn.style.background = 'rgba(255, 255, 255, 0.4)';
        });
        nextBtn.addEventListener('mouseleave', () => {
            nextBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
            viewer.remove();
            openImageViewer(popup, images, newIndex);
        });
        imageContainer.appendChild(nextBtn);

        // 图片计数器
        const counter = document.createElement('div');
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
        counter.style.cssText = `
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            color: #fff;
            font-size: 14px;
        `;
        imageContainer.appendChild(counter);
    }

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #fff;
        font-size: 36px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 10001;
    `;
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.4)';
    });
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewer.remove();
    });

    viewer.appendChild(imageContainer);
    viewer.appendChild(closeBtn);

    // 点击背景关闭
    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
            viewer.remove();
        }
    });

    // 键盘事件：ESC 关闭，左右箭头切换
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            viewer.remove();
            document.removeEventListener('keydown', handleKeyDown);
        } else if (e.key === 'ArrowLeft' && images.length > 1) {
            const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
            viewer.remove();
            document.removeEventListener('keydown', handleKeyDown);
            openImageViewer(popup, images, newIndex);
        } else if (e.key === 'ArrowRight' && images.length > 1) {
            const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
            viewer.remove();
            document.removeEventListener('keydown', handleKeyDown);
            openImageViewer(popup, images, newIndex);
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    document.body.appendChild(viewer);
}

function resetFeedbackButtons(popup, container = null) {
    if (container) {
        const likeBtn = container.querySelector('.like-btn');
        const dislikeBtn = container.querySelector('.dislike-btn');

        if (likeBtn) likeBtn.classList.remove('active');
        if (dislikeBtn) dislikeBtn.classList.remove('active');
        return;
    }

    if (popup.likeButton) popup.likeButton.classList.remove('active');
    if (popup.dislikeButton) popup.dislikeButton.classList.remove('active');
}

