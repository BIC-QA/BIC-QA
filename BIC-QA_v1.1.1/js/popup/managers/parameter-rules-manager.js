/**
 * 参数规则管理器
 * 负责参数规则的加载、合并和显示
 */
export function createParameterRulesManager(popup) {
    return {
        /**
         * 加载参数规则选项
         */
        loadParameterRuleOptions() {
            try {
                const select = popup.parameterRuleSelect;

                // 从Chrome存储中获取所有规则
                chrome.storage.sync.get(['rules', 'defaultRulesModified', 'uiLanguage'], (result) => {
                    const savedRules = result.rules || [];
                    const defaultRulesModified = result.defaultRulesModified || false;
                    const uiLanguage = result.uiLanguage || 'zhcn';

                    // 获取默认规则（根据当前语言）
                    const defaultRules = popup.getDefaultRulesByLanguage(uiLanguage);

                    // 使用与settings.js相同的逻辑来合并规则
                    let allRules;
                    if (defaultRulesModified) {
                        // 如果内置规则被修改过，需要特殊处理
                        // 先合并默认规则和保存的规则
                        allRules = popup.mergeRulesWithBuiltInSupport(defaultRules, savedRules);

                        // 然后检查是否有内置规则被修改，如果有，使用保存的版本
                        savedRules.forEach(savedRule => {
                            if (popup.isBuiltInRule(savedRule.id)) {
                                const existingIndex = allRules.findIndex(rule => rule.id === savedRule.id);
                                if (existingIndex !== -1) {
                                    // 检查保存的规则是否与默认规则不同
                                    const defaultRule = defaultRules.find(r => r.id === savedRule.id);
                                    if (defaultRule) {
                                        const isModified = savedRule.temperature !== defaultRule.temperature ||
                                            savedRule.similarity !== defaultRule.similarity ||
                                            savedRule.topN !== defaultRule.topN ||
                                            savedRule.prompt !== defaultRule.prompt ||
                                            savedRule.name !== defaultRule.name ||
                                            savedRule.description !== defaultRule.description ||
                                            savedRule.isDefault !== defaultRule.isDefault; // 添加isDefault字段比较

                                        if (isModified) {
                                            // 使用修改后的版本
                                            allRules[existingIndex] = { ...savedRule };
                                        }
                                    }
                                }
                            }
                        });
                    } else {
                        // 首次加载，使用默认规则并合并用户自定义规则
                        allRules = popup.mergeRulesWithBuiltInSupport(defaultRules, savedRules);
                    }

                    // 移除"使用默认参数"选项，直接开始添加规则选项
                    select.innerHTML = '';

                    if (allRules.length === 0) {
                        // 如果没有配置规则，显示引导提示
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = popup.t('popup.main.option.noParameterRuleConfigured');
                        option.disabled = true;
                        select.appendChild(option);
                    } else {
                        // 使用所有规则（内置+用户自定义）
                        allRules.forEach((rule, index) => {
                            const option = document.createElement('option');
                            option.value = JSON.stringify(rule);
                            option.textContent = popup.getParameterRuleDisplayName(rule);
                            if (rule.isDefault) {
                                option.selected = true; // 默认选中默认规则
                            }
                            select.appendChild(option);
                        });
                    }
                });
            } catch (error) {
                console.error('加载参数规则选项失败:', error);
                // 加载默认选项时也不添加"使用默认参数"选项
                const select = popup.parameterRuleSelect;
                select.innerHTML = '';

                // 显示错误提示
                const option = document.createElement('option');
                option.value = '';
                option.textContent = popup.t('popup.main.option.parameterRuleLoadFailed');
                option.disabled = true;
                select.appendChild(option);
            }
        },

        /**
         * 根据语言获取默认规则
         */
        getDefaultRulesByLanguage(language) {
            const languageMap = {
                'zhcn': 'zh-CN',
                'zh-tw': 'zh-CN',
                'en': 'en-US',
                'jap': 'ja-JP'
            };

            const targetLanguage = languageMap[language] || 'zh-CN';

            // 所有默认规则，按语言分组
            const allDefaultRules = [
                {
                    "description": "适用于快速检索场景，返回更多相关结果",
                    "id": "default-fast-search",
                    "isDefault": true,
                    "name": "精准检索",
                    "similarity": 0.7,
                    "topN": 6,
                    "language": "zh-CN",
                    "temperature": 0.7,
                    "prompt": "你是一个专业的数据库专家，你的任务是基于提供的知识库内容为用户提供准确、实用的解答。\n\n## 回答要求\n1. 内容准确性：\n   - 严格基于提供的知识库内容回答\n   - 优先使用高相关性内容\n   - 确保信息的准确性和完整性\n   - 可以适度补充相关知识背景\n\n2. 实用性强：\n   - 提供可操作的建议和步骤\n   - 结合实际应用场景\n   - 包含必要的注意事项和最佳实践\n   - 适当添加示例和说明\n\n3. 版本信息处理：\n   - 开头注明：> 适用版本：{{version_info}}\n   - 如果不同版本有差异，需要明确指出\n   - 结尾再次确认：> 适用版本：{{version_info}}\n\n4. 回答结构：\n   - 先总结核心要点\n   - 分点详细展开\n   - 如有必要，提供具体示例\n   - 适当补充相关背景知识\n\n5. 特殊情况处理：\n   - 如果信息不完整，明确指出信息的局限性\n   - 如果存在版本差异，清晰说明各版本的区别\n   - 可以适度提供相关建议\n\n## 重要：流式输出要求\n- 请直接开始回答，不要使用<think>标签进行思考\n- 立即开始输出内容，实现真正的实时流式体验\n- 边思考边输出，让用户能够实时看到回答过程\n\n请确保回答专业、准确、实用，并始终注意版本兼容性。如果分析Oracle的错误号ORA-XXXXX，则不能随意匹配其他类似错误号，必须严格匹配号码，只允许去除左侧的0或者在左侧填充0使之达到5位数字。"
                },
                {
                    "description": "适用于创新思维场景，提供多角度分析和创新解决方案",
                    "id": "default-flexible-search",
                    "isDefault": false,
                    "name": "灵活检索",
                    "similarity": 0.6,
                    "topN": 8,
                    "language": "zh-CN",
                    "temperature": 1.0,
                    "prompt": "你是一个专业的数据库专家，你的任务是基于提供的知识库内容为用户提供创新、全面的解答。\n\n## 回答要求\n1. 创新思维：\n   - 基于知识库内容进行多角度分析\n   - 提供创新的解决方案和思路\n   - 结合行业趋势和最佳实践\n   - 鼓励探索性思维\n\n2. 全面性：\n   - 不仅回答直接问题，还要考虑相关因素\n   - 提供多种可能的解决方案\n   - 分析不同场景下的适用性\n   - 包含风险评估和优化建议\n\n3. 版本信息处理：\n   - 开头注明：> 适用版本：{{version_info}}\n   - 如果不同版本有差异，需要明确指出\n   - 结尾再次确认：> 适用版本：{{version_info}}\n\n4. 回答结构：\n   - 先总结核心要点\n   - 分点详细展开\n   - 提供多种思路和方案\n   - 包含创新性建议和未来趋势\n\n5. 特殊情况处理：\n   - 如果信息不完整，提供多种可能的解决方案\n   - 如果存在版本差异，分析各版本的优劣势\n   - 可以适度提供创新性建议和未来发展方向\n\n## 重要：流式输出要求\n- 请直接开始回答，不要使用<think>标签进行思考\n- 立即开始输出内容，实现真正的实时流式体验\n- 边思考边输出，让用户能够实时看到回答过程\n\n请确保回答专业、创新、全面，并始终注意版本兼容性。如果分析Oracle的错误号ORA-XXXXX，则不能随意匹配其他类似错误号，必须严格匹配号码，只允许去除左侧的0或者在左侧填充0使之达到5位数字。"
                },
                {
                    "description": "Suitable for fast search scenarios, returns more relevant results",
                    "id": "default-fast-search-en",
                    "isDefault": true,
                    "name": "Precise Search",
                    "similarity": 0.7,
                    "topN": 6,
                    "language": "en-US",
                    "temperature": 0.7,
                    "prompt": "You are a professional database expert. Your task is to provide accurate and practical answers to users based on the provided knowledge base content.\n\n## Answer Requirements\n1. Content Accuracy:\n   - Strictly answer based on the provided knowledge base content\n   - Prioritize high-relevance content\n   - Ensure information accuracy and completeness\n   - Can appropriately supplement relevant knowledge background\n\n2. Practicality:\n   - Provide actionable advice and steps\n   - Combine with actual application scenarios\n   - Include necessary precautions and best practices\n   - Add examples and explanations appropriately\n\n3. Version Information Handling:\n   - Note at the beginning: > Applicable Version: {{version_info}}\n   - If there are differences between versions, clearly indicate them\n   - Confirm again at the end: > Applicable Version: {{version_info}}\n\n4. Answer Structure:\n   - First summarize the core points\n   - Expand in detail point by point\n   - Provide specific examples if necessary\n   - Supplement relevant background knowledge appropriately\n\n5. Special Case Handling:\n   - If information is incomplete, clearly indicate the limitations\n   - If version differences exist, clearly explain the differences between versions\n   - Can appropriately provide relevant suggestions\n\n## Important: Streaming Output Requirements\n- Please start answering directly, do not use <think> tags for thinking\n- Immediately start outputting content to achieve a true real-time streaming experience\n- Think while outputting, allowing users to see the answering process in real-time\n\nPlease ensure answers are professional, accurate, and practical, and always pay attention to version compatibility. When analyzing Oracle error numbers ORA-XXXXX, do not arbitrarily match other similar error numbers. You must strictly match the number, only allowing removal of leading zeros or padding zeros on the left to make it 5 digits."
                },
                {
                    "description": "Suitable for innovative thinking scenarios, provides multi-angle analysis and innovative solutions",
                    "id": "default-flexible-search-en",
                    "isDefault": false,
                    "name": "Flexible Search",
                    "similarity": 0.6,
                    "topN": 8,
                    "language": "en-US",
                    "temperature": 1.0,
                    "prompt": "You are a professional database expert. Your task is to provide innovative and comprehensive answers to users based on the provided knowledge base content.\n\n## Answer Requirements\n1. Innovative Thinking:\n   - Conduct multi-angle analysis based on knowledge base content\n   - Provide innovative solutions and ideas\n   - Combine industry trends and best practices\n   - Encourage exploratory thinking\n\n2. Comprehensiveness:\n   - Not only answer direct questions but also consider related factors\n   - Provide multiple possible solutions\n   - Analyze applicability in different scenarios\n   - Include risk assessment and optimization suggestions\n\n3. Version Information Handling:\n   - Note at the beginning: > Applicable Version: {{version_info}}\n   - If there are differences between versions, clearly indicate them\n   - Confirm again at the end: > Applicable Version: {{version_info}}\n\n4. Answer Structure:\n   - First summarize the core points\n   - Expand in detail point by point\n   - Provide multiple ideas and solutions\n   - Include innovative suggestions and future trends\n\n5. Special Case Handling:\n   - If information is incomplete, provide multiple possible solutions\n   - If version differences exist, analyze the advantages and disadvantages of each version\n   - Can appropriately provide innovative suggestions and future development directions\n\n## Important: Streaming Output Requirements\n- Please start answering directly, do not use <think> tags for thinking\n- Immediately start outputting content to achieve a true real-time streaming experience\n   - Think while outputting, allowing users to see the answering process in real-time\n\nPlease ensure answers are professional, innovative, and comprehensive, and always pay attention to version compatibility. When analyzing Oracle error numbers ORA-XXXXX, do not arbitrarily match other similar error numbers. You must strictly match the number, only allowing removal of leading zeros or padding zeros on the left to make it 5 digits."
                },
                {
                    "description": "高速検索シーンに適用され、より関連性の高い結果を返します",
                    "id": "default-fast-search-ja",
                    "isDefault": true,
                    "name": "精密検索",
                    "similarity": 0.7,
                    "topN": 6,
                    "language": "ja-JP",
                    "temperature": 0.7,
                    "prompt": "あなたは専門的なデータベースエキスパートです。あなたのタスクは、提供されたナレッジベースのコンテンツに基づいて、ユーザーに正確で実用的な回答を提供することです。\n\n## 回答要件\n1. コンテンツの正確性：\n   - 提供されたナレッジベースのコンテンツに厳密に基づいて回答する\n   - 高関連性のコンテンツを優先的に使用する\n   - 情報の正確性と完全性を確保する\n   - 関連する知識背景を適度に補足できる\n\n2. 実用性：\n   - 実行可能なアドバイスと手順を提供する\n   - 実際のアプリケーションシナリオと組み合わせる\n   - 必要な注意事項とベストプラクティスを含める\n   - 例と説明を適切に追加する\n\n3. バージョン情報の処理：\n   - 冒頭に注記：> 適用バージョン：{{version_info}}\n   - 異なるバージョンに差異がある場合は、明確に指摘する\n   - 最後に再度確認：> 適用バージョン：{{version_info}}\n\n4. 回答構造：\n   - まず核心ポイントを要約する\n   - ポイントごとに詳細に展開する\n   - 必要に応じて具体的な例を提供する\n   - 関連する背景知識を適切に補足する\n\n5. 特殊ケースの処理：\n   - 情報が不完全な場合、情報の限界を明確に指摘する\n   - バージョンの差異が存在する場合、各バージョンの違いを明確に説明する\n   - 関連する提案を適度に提供できる\n\n## 重要：ストリーミング出力要件\n- <think>タグを使用して思考せず、直接回答を開始してください\n- コンテンツの出力を即座に開始し、真のリアルタイムストリーミング体験を実現する\n- 出力しながら思考し、ユーザーが回答プロセスをリアルタイムで確認できるようにする\n\n回答が専門的で、正確で、実用的であることを確保し、常にバージョン互換性に注意してください。Oracleのエラー番号ORA-XXXXXを分析する場合、他の類似するエラー番号を任意に一致させてはいけません。番号を厳密に一致させる必要があり、左側の0を削除するか、左側に0を埋めて5桁にすることを許可するのみです。"
                },
                {
                    "description": "革新的な思考シーンに適用され、多角的な分析と革新的なソリューションを提供します",
                    "id": "default-flexible-search-ja",
                    "isDefault": false,
                    "name": "柔軟検索",
                    "similarity": 0.6,
                    "topN": 8,
                    "language": "ja-JP",
                    "temperature": 1.0,
                    "prompt": "あなたは専門的なデータベースエキスパートです。あなたのタスクは、提供されたナレッジベースのコンテンツに基づいて、ユーザーに革新的で包括的な回答を提供することです。\n\n## 回答要件\n1. 革新的な思考：\n   - ナレッジベースのコンテンツに基づいて多角的な分析を行う\n   - 革新的なソリューションとアイデアを提供する\n   - 業界のトレンドとベストプラクティスを組み合わせる\n   - 探索的思考を奨励する\n\n2. 包括性：\n   - 直接的な質問に答えるだけでなく、関連する要因も考慮する\n   - 複数の可能なソリューションを提供する\n   - 異なるシナリオでの適用性を分析する\n   - リスク評価と最適化提案を含める\n\n3. バージョン情報の処理：\n   - 冒頭に注記：> 適用バージョン：{{version_info}}\n   - 異なるバージョンに差異がある場合は、明確に指摘する\n   - 最後に再度確認：> 適用バージョン：{{version_info}}\n\n4. 回答構造：\n   - まず核心ポイントを要約する\n   - ポイントごとに詳細に展開する\n   - 複数のアイデアとソリューションを提供する\n   - 革新的な提案と将来のトレンドを含める\n\n5. 特殊ケースの处理：\n   - 信息が不完全な場合、複数の可能なソリューションを提供する\n   - バージョンの差異が存在する場合、各バージョンの優劣を分析する\n   - 革新的な提案と将来の発展方向を適度に提供できる\n\n## 重要：ストリーミング出力要件\n- <think>タグを使用して思考せず、直接回答を開始してください\n- コンテンツの出力を即座に開始し、真のリアルタイムストリーミング体験を実現する\n- 出力しながら思考し、ユーザーが回答プロセスをリアルタイムで確認できるようにする\n\n回答が専門的で、革新的で、包括的であることを確保し、常にバージョン互換性に注意してください。Oracleのエラー番号ORA-XXXXXを分析する場合、他の類似するエラー番号を任意に一致させてはいけません。番号を厳密に一致させる必要があり、左側の0を删除するか、左側に0を埋めて5桁にすることを許可するのみです。"
                }
            ];

            // 根据目标语言过滤规则
            return allDefaultRules.filter(rule => rule.language === targetLanguage);
        },

        /**
         * 合并规则并支持内置规则修改的方法
         */
        mergeRulesWithBuiltInSupport(defaultRules, savedRules) {
            const mergedRules = [...defaultRules]; // 复制内置规则

            // 清理用户规则中的重复项
            const cleanedSavedRules = popup.cleanDuplicateRulesWithBuiltInSupport(savedRules);

            // 处理所有保存的规则
            cleanedSavedRules.forEach(savedRule => {
                if (!popup.isBuiltInRule(savedRule.id)) {
                    // 用户自定义规则
                    const existingIndex = mergedRules.findIndex(rule => rule.id === savedRule.id);
                    if (existingIndex !== -1) {
                        mergedRules[existingIndex] = savedRule;
                    } else {
                        mergedRules.push(savedRule);
                    }
                } else {
                    // 内置规则 - 检查是否有修改
                    const existingIndex = mergedRules.findIndex(rule => rule.id === savedRule.id);
                    if (existingIndex !== -1) {
                        // 获取对应的默认规则
                        const defaultRule = defaultRules.find(r => r.id === savedRule.id);
                        if (defaultRule) {
                            // 检查保存的规则是否与默认规则不同
                            const isModified = savedRule.temperature !== defaultRule.temperature ||
                                savedRule.similarity !== defaultRule.similarity ||
                                savedRule.topN !== defaultRule.topN ||
                                savedRule.prompt !== defaultRule.prompt ||
                                savedRule.name !== defaultRule.name ||
                                savedRule.description !== defaultRule.description ||
                                savedRule.isDefault !== defaultRule.isDefault; // 添加isDefault字段比较

                            if (isModified) {
                                // 使用修改后的版本
                                mergedRules[existingIndex] = { ...savedRule };
                            }
                            // 如果没有修改，保持默认值
                        } else {
                            // 如果找不到对应的默认规则，使用保存的版本
                            mergedRules[existingIndex] = savedRule;
                        }
                    }
                }
            });

            return mergedRules;
        },

        /**
         * 合并规则并去重的方法（保留原有方法以兼容）
         */
        mergeRulesWithoutDuplicates(defaultRules, userRules) {
            const mergedRules = [...defaultRules]; // 复制内置规则

            // 清理用户规则中的重复项
            const cleanedUserRules = popup.cleanDuplicateRules(userRules);

            // 添加用户自定义规则（非内置规则）
            cleanedUserRules.forEach(userRule => {
                // 检查是否为内置规则
                const isBuiltIn = popup.isBuiltInRule(userRule.id);

                if (!isBuiltIn) {
                    // 检查是否已存在相同的规则ID
                    const existingIndex = mergedRules.findIndex(rule => rule.id === userRule.id);
                    if (existingIndex !== -1) {
                        // 更新现有规则
                        mergedRules[existingIndex] = userRule;
                    } else {
                        // 添加新规则
                        mergedRules.push(userRule);
                    }
                }
            });

            return mergedRules;
        },

        /**
         * 清理重复规则的方法（支持内置规则）
         */
        cleanDuplicateRulesWithBuiltInSupport(savedRules) {
            const cleanedRules = [];
            const seenIds = new Set();
            const seenNames = new Set();

            savedRules.forEach(rule => {
                // 对于内置规则，直接添加（因为可能被修改过）
                if (popup.isBuiltInRule(rule.id)) {
                    cleanedRules.push(rule);
                    return;
                }

                // 对于用户自定义规则，检查ID和名称是否重复
                if (!seenIds.has(rule.id) && !seenNames.has(rule.name)) {
                    cleanedRules.push(rule);
                    seenIds.add(rule.id);
                    seenNames.add(rule.name);
                } else {
                    console.log(`清理重复规则: ${rule.name} (ID: ${rule.id})`);
                }
            });

            return cleanedRules;
        },

        /**
         * 清理重复规则的方法（保留原有方法以兼容）
         */
        cleanDuplicateRules(userRules) {
            const cleanedRules = [];
            const seenIds = new Set();
            const seenNames = new Set();

            userRules.forEach(rule => {
                // 跳过内置规则ID
                if (popup.isBuiltInRule(rule.id)) {
                    return;
                }

                // 检查ID和名称是否重复
                if (!seenIds.has(rule.id) && !seenNames.has(rule.name)) {
                    cleanedRules.push(rule);
                    seenIds.add(rule.id);
                    seenNames.add(rule.name);
                } else {
                    console.log(`清理重复规则: ${rule.name} (ID: ${rule.id})`);
                }
            });

            // 如果清理了规则，更新存储
            if (cleanedRules.length !== userRules.length) {
                chrome.storage.sync.set({ rules: cleanedRules }, () => {
                    console.log('已清理重复规则并更新存储');
                });
            }

            return cleanedRules;
        },

        /**
         * 判断是否为内置规则
         */
        isBuiltInRule(ruleId) {
            const builtInIds = ['default-fast-search', 'default-flexible-search', 'default-fast-search-en', 'default-flexible-search-en', 'default-fast-search-ja', 'default-flexible-search-ja'];
            return builtInIds.includes(ruleId);
        },

        /**
         * 获取参数规则显示名称
         */
        getParameterRuleDisplayName(rule) {
            if (!rule) {
                return '';
            }

            if (popup.isBuiltInRule(rule.id)) {
                let translationKey = '';
                if (rule.id === 'default-fast-search') {
                    translationKey = 'popup.main.option.parameterRulePrecise';
                } else if (rule.id === 'default-flexible-search') {
                    translationKey = 'popup.main.option.parameterRuleFlexible';
                }

                if (translationKey && typeof popup.t === 'function') {
                    const localized = popup.t(translationKey);
                    if (localized && typeof localized === 'string' && localized !== translationKey) {
                        return localized;
                    }
                }

                const language = popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
                const normalized = typeof popup.i18n?.normalizeLanguage === 'function'
                    ? popup.i18n.normalizeLanguage(language)
                    : language;

                const fallbackMap = {
                    'default-fast-search': {
                        'zhcn': '精准检索',
                        'en': 'Precise search',
                        'zh-tw': '精準檢索',
                        'jap': '精密検索'
                    },
                    'default-flexible-search': {
                        'zhcn': '灵活检索',
                        'en': 'Flexible search',
                        'zh-tw': '靈活檢索',
                        'jap': '柔軟検索'
                    }
                };

                const perLanguage = fallbackMap[rule.id];
                if (perLanguage) {
                    const fallbackLanguage = popup.i18n?.fallbackLanguage || 'zhcn';
                    return perLanguage[normalized] || perLanguage[fallbackLanguage] || rule.name || translationKey;
                }
            }

            if (rule.name) {
                return rule.name;
            }

            return '';
        }
    };
}

