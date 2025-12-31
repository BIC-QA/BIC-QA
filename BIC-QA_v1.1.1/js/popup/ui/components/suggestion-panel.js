function bindToPopup(fn, popup) {
    return fn.bind(null, popup);
}

export function createSuggestionPanel(popup) {
    return {
        displaySuggestions: bindToPopup(displaySuggestions, popup),
        selectSuggestion: bindToPopup(selectSuggestion, popup),
        keepOriginalQuestion: bindToPopup(keepOriginalQuestion, popup),
        regenerateSuggestions: bindToPopup(regenerateSuggestions, popup)
    };
}

function displaySuggestions(popup, suggestions, conversationContainer) {
    const resultTitle = conversationContainer.querySelector('.result-title');
    if (resultTitle) {
        resultTitle.textContent = popup.t('popup.suggestion.title');
    }
    if (popup.resultContainer) {
        popup.resultContainer.style.display = 'block';
    }

    const isFirstConversation = conversationContainer.id === 'conversation-default';

    let suggestionContainer;
    let suggestionList;

    if (isFirstConversation) {
        suggestionContainer = conversationContainer.querySelector('#suggestionContainer');
        suggestionList = conversationContainer.querySelector('#suggestionList');
        if (suggestionContainer && suggestionList) {
            suggestionList.innerHTML = '';
            suggestionContainer.style.display = 'block';
        } else {
            suggestionContainer = document.createElement('div');
            suggestionContainer.id = 'suggestionContainer';
            suggestionContainer.className = 'suggestion-container';
            suggestionContainer.style.display = 'block';

            const suggestionHeader = document.createElement('div');
            suggestionHeader.className = 'suggestion-header';
            suggestionHeader.innerHTML = popup.t('popup.suggestion.headerHtml');

            suggestionList = document.createElement('div');
            suggestionList.id = 'suggestionList';
            suggestionList.className = 'suggestion-list';

            suggestionContainer.appendChild(suggestionHeader);
            suggestionContainer.appendChild(suggestionList);

            const resultText = conversationContainer.querySelector('.result-text');
            if (resultText) {
                resultText.appendChild(suggestionContainer);
            }
        }
    } else {
        const existingSuggestion = conversationContainer.querySelector('.suggestion-container');
        if (existingSuggestion) {
            existingSuggestion.remove();
        }

        suggestionContainer = document.createElement('div');
        suggestionContainer.id = `suggestionContainer-${Date.now()}`;
        suggestionContainer.className = 'suggestion-container';
        suggestionContainer.style.display = 'block';

        const suggestionHeader = document.createElement('div');
        suggestionHeader.className = 'suggestion-header';
        suggestionHeader.innerHTML = popup.t('popup.suggestion.headerHtml');

        suggestionList = document.createElement('div');
        suggestionList.className = 'suggestion-list';

        suggestionContainer.appendChild(suggestionHeader);
        suggestionContainer.appendChild(suggestionList);

        const resultText = conversationContainer.querySelector('.result-text');
        if (resultText) {
            resultText.appendChild(suggestionContainer);
        }
    }

    suggestions.forEach((suggestion) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';

        suggestionItem.innerHTML = `
            <div class="suggestion-text">${suggestion}</div>
            <button class="suggestion-select-btn" data-suggestion="${suggestion}">选择此问题</button>
        `;

        const selectBtn = suggestionItem.querySelector('.suggestion-select-btn');
        selectBtn.addEventListener('click', () => {
            popup.selectSuggestion(suggestion);
        });

        suggestionList.appendChild(suggestionItem);
    });

    const keepOriginalItem = document.createElement('div');
    keepOriginalItem.className = 'suggestion-item keep-original-item';
    keepOriginalItem.innerHTML = `
        <div class="suggestion-text">生成的建议问题中没有我想要的</div>
        <div class="suggestion-buttons">
            <button class="suggestion-select-btn keep-original-btn">直接问答</button>
            <button class="suggestion-select-btn regenerate-btn">重新生成</button>
        </div>
    `;
    const regenerateBtn = keepOriginalItem.querySelector('.regenerate-btn');
    regenerateBtn.addEventListener('click', () => {
        popup.regenerateSuggestions();
    });
    const keepOriginalBtn = keepOriginalItem.querySelector('.keep-original-btn');
    keepOriginalBtn.addEventListener('click', () => {
        popup.keepOriginalQuestion();
    });

    suggestionList.appendChild(keepOriginalItem);
    popup.setLoading(false);
    const resultActions = conversationContainer.querySelector('.result-actions');
    if (resultActions) {
        resultActions.style.display = 'block';
        setTimeout(() => {
            resultActions.style.opacity = '1';
        }, 100);
    }
}

function selectSuggestion(popup, suggestion) {
    if (!popup.questionInput) {
        console.error('questionInput 未初始化');
        return;
    }
    popup.questionInput.value = suggestion;
    popup.updateCharacterCount();
    popup.handleAskQuestion();
}

function keepOriginalQuestion(popup) {
    const currentContainer = popup.getCurrentConversationContainer();
    if (!currentContainer) {
        console.error('无法获取当前对话容器');
        return;
    }

    const questionDisplay = currentContainer.querySelector('.question-display .question-text');
    if (!questionDisplay) {
        console.error('无法获取原始问题');
        return;
    }

    const originalQuestion = questionDisplay.textContent.trim();

    if (!popup.questionInput) {
        console.error('questionInput 未初始化');
        return;
    }

    popup.questionInput.value = originalQuestion;
    popup.updateCharacterCount();
    popup._skipLetterLimitCheck = true;
    popup.handleAskQuestion();
}

function regenerateSuggestions(popup) {
    const currentContainer = popup.getCurrentConversationContainer();
    if (!currentContainer) {
        console.error('无法获取当前对话容器');
        return;
    }

    const questionDisplay = currentContainer.querySelector('.question-display .question-text');
    if (!questionDisplay) {
        console.error('无法获取原始问题');
        return;
    }

    const originalQuestion = questionDisplay.textContent.trim();

    if (!popup.questionInput) {
        console.error('questionInput 未初始化');
        return;
    }

    popup.questionInput.value = originalQuestion;
    popup.updateCharacterCount();
    popup._skipLetterLimitCheck = false;
    popup.handleAskQuestion();
}

