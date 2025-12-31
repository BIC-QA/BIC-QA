/**
 * 知识库管理器
 * 负责知识库的加载、格式化和本地化
 */
export function createKnowledgeBaseManager(popup) {
    return {
        /**
         * 加载知识库选项
         */
        loadKnowledgeBaseOptions() {
            const select = popup.knowledgeBaseSelect;
            if (!select) return;

            popup.previousKnowledgeBaseValue = select.value || '';
            select.innerHTML = '';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = popup.t('popup.main.option.knowledgeNone');
            select.appendChild(defaultOption);

            console.log('开始加载知识库选项...');
            console.log('window.knowledgeBaseManager:', window.knowledgeBaseManager);

            // 等待知识库管理器初始化完成
            if (window.knowledgeBaseManager && window.knowledgeBaseManager.getKnowledgeBases) {
                // 检查是否已初始化
                if (window.knowledgeBaseManager.isInitialized && window.knowledgeBaseManager.isInitialized()) {
                    popup.loadKnowledgeBasesFromManager();
                } else {
                    // 如果未初始化，等待一段时间后重试
                    console.log('知识库管理器未初始化，等待初始化完成...');
                    setTimeout(() => {
                        popup.loadKnowledgeBaseOptions();
                    }, 500);
                }
            } else {
                console.error('知识库管理器未初始化或不可用');
                // 如果知识库管理器不可用，直接调用API或使用默认值
                popup.loadKnowledgeBasesDirectly();
            }
            // 知识库选项加载完成后，更新字符计数显示
            popup.updateCharacterCount();
        },

        /**
         * 从知识库管理器加载知识库
         */
        async loadKnowledgeBasesFromManager() {
            try {
                // 优先尝试从API获取
                console.log('尝试从API获取知识库列表...');
                const apiResult = await popup.loadKnowledgeBasesFromAPI();
                if (apiResult.success) {
                    console.log('从API成功获取知识库列表:', apiResult.data);
                    popup.renderKnowledgeBasesFromData(apiResult.data);
                    return;
                }

                // API失败，尝试从知识库管理器获取
                console.log('API获取失败，尝试从知识库管理器获取...');
                const knowledgeBases = window.knowledgeBaseManager.getKnowledgeBases();

                if (knowledgeBases && knowledgeBases.length > 0) {
                    popup.renderKnowledgeBasesFromData(knowledgeBases);
                } else {
                    console.log('知识库列表为空');
                    popup.loadDefaultKnowledgeBases();
                }
            } catch (error) {
                console.error('从知识库管理器加载失败:', error);
                await popup.loadKnowledgeBasesDirectly();
            }
        },

        /**
         * 直接加载知识库配置（备用方案）
         */
        async loadKnowledgeBasesDirectly() {
            try {
                console.log('尝试从API加载知识库列表...');

                // 优先尝试调用接口获取知识库列表
                const apiResult = await popup.loadKnowledgeBasesFromAPI();
                if (apiResult.success) {
                    console.log('从API成功获取知识库列表:', apiResult.data);
                    popup.renderKnowledgeBasesFromData(apiResult.data);
                    return;
                }

                // API调用失败，直接使用硬编码的默认值
                console.log('API调用失败，使用硬编码的默认值...');
                popup.loadDefaultKnowledgeBases();

            } catch (error) {
                console.error('加载知识库列表失败:', error);
                // 如果所有方法都失败，使用硬编码的默认值
                popup.loadDefaultKnowledgeBases();
            }
        },

        /**
         * 从API加载知识库列表
         * @param {string} type - 数据类型: 'all' | 'awr' | 'inspection'，默认为 'all'
         */
        async loadKnowledgeBasesFromAPI(type = 'all') {
            try {
                console.log(`正在调用知识库API... (type: ${type})`);
                const apiUrl = '/api/knowledge-datasets/list';

                // 构建请求体参数
                const requestBody = {};
                if (type === 'awr') {
                    requestBody.supportAwr = 1;
                } else if (type === 'inspection') {
                    requestBody.supportDiagnosis = 1;
                } else if (type === 'supportSQL') {
                    requestBody.supportSql = 1;
                }
                // type === 'all' 时不添加任何过滤参数，返回全部数据

                // 添加超时控制，避免长时间等待阻塞初始化
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('API请求超时')), 5000); // 5秒超时
                });

                const data = await Promise.race([
                    popup.requestUtil.post(apiUrl, requestBody, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }),
                    timeoutPromise
                ]);

                console.log('API返回数据:', data);

                // 根据API返回的数据结构进行适配
                let knowledgeBases = [];

                if (data.status === "success" && Array.isArray(data.data)) {
                    // 格式1: { status: "success", data: [...] }
                    knowledgeBases = data.data;
                } else if (data.success && Array.isArray(data.data)) {
                    // 格式2: { success: true, data: [...] }
                    knowledgeBases = data.data;
                } else if (Array.isArray(data)) {
                    // 格式3: 直接返回数组
                    knowledgeBases = data;
                } else if (data.knowledge_bases && Array.isArray(data.knowledge_bases)) {
                    // 格式4: { knowledge_bases: [...] }
                    knowledgeBases = data.knowledge_bases;
                } else {
                    throw new Error(popup.t('popup.error.apiUnexpectedFormat'));
                }

                // 验证数据格式
                if (!knowledgeBases.every(kb => (kb.id || kb.code) && kb.name)) {
                    throw new Error(popup.t('popup.error.kbDataInvalid'));
                }

                // 数据格式标准化，确保id字段存在
                knowledgeBases = knowledgeBases.map(kb => ({
                    ...kb,
                    id: kb.code || kb.id // 优先使用code字段作为id
                }));

                return {
                    success: true,
                    data: knowledgeBases
                };

            } catch (error) {
                // 静默处理错误，不阻塞初始化
                console.warn('API调用失败（将使用备用方案）:', error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * 从配置文件加载知识库列表
         */
        async loadKnowledgeBasesFromConfig() {
            try {
                console.log('从配置文件加载知识库列表...');
                const language = popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
                const fallbackFile = 'config/knowledge_bases.json';
                const languageSpecificFile = language === 'en' ? 'config/knowledge_bases_en.json' : fallbackFile;

                const fetchConfig = async (file) => {
                    const url = chrome.runtime.getURL(file);
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`配置文件加载失败: ${file} (${response.status})`);
                    }
                    return response.json();
                };

                let config;
                try {
                    config = await fetchConfig(languageSpecificFile);
                } catch (langError) {
                    if (languageSpecificFile !== fallbackFile) {
                        console.warn(`加载语言专属知识库配置失败，回退到默认配置: ${langError.message}`);
                        config = await fetchConfig(fallbackFile);
                    } else {
                        throw langError;
                    }
                }

                const knowledgeBases = Array.isArray(config.knowledge_bases) ? config.knowledge_bases : [];
                console.log('从配置文件加载的知识库列表:', knowledgeBases);
                popup.renderKnowledgeBasesFromData(knowledgeBases);

            } catch (error) {
                console.error('从配置文件加载知识库列表失败:', error);
                throw error; // 继续抛出错误，让上层处理
            }
        },

        /**
         * 获取语言候选键
         */
        getLanguageCandidateKeys(language) {
            const lang = (language || '').toString().toLowerCase();
            const normalized = typeof popup.i18n?.normalizeLanguage === 'function'
                ? popup.i18n.normalizeLanguage(lang)
                : lang;
            const candidates = new Set();
            const addCandidate = (value) => {
                if (!value) return;
                candidates.add(value.toLowerCase());
            };

            addCandidate(normalized);
            addCandidate(normalized.replace('-', '_'));
            addCandidate(normalized.replace('_', '-'));
            addCandidate(normalized.replace(/[-_]/g, ''));

            normalized.split(/[-_]/).forEach(addCandidate);

            const aliasMap = {
                'zhcn': ['zh', 'zh-cn', 'zh_cn', 'cn', 'zh-hans', 'zh_hans'],
                'zh-tw': ['zh-tw', 'zh_tw', 'tw', 'zh-hant', 'zh_hant'],
                'en': ['en', 'en-us', 'en_us', 'en-gb', 'en_gb'],
                'jap': ['jap', 'ja', 'jp', 'ja-jp', 'ja_jp']
            };
            (aliasMap[normalized] || []).forEach(addCandidate);

            return Array.from(candidates).filter(Boolean);
        },

        /**
         * 获取本地化值
         */
        getLocalizedValue(value, defaultValue = '') {
            if (value === null || value === undefined) {
                return defaultValue;
            }

            if (typeof value === 'string') {
                return value;
            }

            if (typeof value !== 'object') {
                return defaultValue;
            }

            const language = popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
            const fallbackLanguage = popup.i18n?.fallbackLanguage || 'zhcn';

            const searchKeys = [
                ...popup.getLanguageCandidateKeys(language),
                ...popup.getLanguageCandidateKeys(fallbackLanguage)
            ];

            for (const key of searchKeys) {
                if (key && Object.prototype.hasOwnProperty.call(value, key)) {
                    const candidate = value[key];
                    if (typeof candidate === 'string' && candidate.trim() !== '') {
                        return candidate;
                    }
                }
            }

            const firstString = Object.values(value).find(item => typeof item === 'string' && item.trim() !== '');
            return firstString !== undefined ? firstString : defaultValue;
        },

        /**
         * 格式化知识库显示名称
         */
        formatKnowledgeBaseName(name) {
            const normalizationMap = {
                'Mysql生态': 'MySQL',
                'Mysql,PG兼容生态': 'PostgreSQL'
            };
            const language = popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
            const sourceName = popup.getLocalizedValue(name, typeof name === 'string' ? name : '');
            if (!sourceName) {
                return '';
            }

            const normalizedName = normalizationMap[sourceName] || sourceName;
            const defaultMap = {
                'MySQL兼容': 'MySQL',
                'PG兼容生态': 'PostgreSQL',
                '盘古数据库': '盘古(PanGu)'
            };

            if (language === 'en') {
                if (!/[\u4e00-\u9fff]/.test(sourceName)) {
                    return normalizedName;
                }
                const englishMap = {
                    'MySQL兼容': 'MySQL Compatible',
                    'Mysql生态': 'MySQL Ecosystem',
                    'Mysql,PG兼容生态': 'PostgreSQL Compatible Ecosystem',
                    'PG兼容生态': 'PostgreSQL Compatible Ecosystem',
                    '盘古数据库': 'Pangu (PanGu)',
                    '磐维': 'Panwei',
                    '达梦': 'Dameng',
                    'Gbase': 'GBase',
                    'Gbase 分布式': 'GBase Distributed',
                    'GBase 分布式': 'GBase Distributed',
                    '神通-OSCAR': 'Shentong OSCAR',
                    '虚谷数据库': 'Xugu Database',
                    '操作系统': 'Operating Systems',
                    'KingBase': 'Kingbase',
                    'OpenGauss': 'openGauss'
                };
                return englishMap[sourceName] || englishMap[normalizedName] || normalizedName;
            }

            if (language === 'zh-tw') {
                const traditionalMap = {
                    '知识库': '知識庫',
                    '盘古数据库': '盤古資料庫',
                    '磐维': '磐維',
                    '操作系统': '操作系統'
                };
                return traditionalMap[sourceName] || traditionalMap[normalizedName] || defaultMap[sourceName] || defaultMap[normalizedName] || normalizedName;
            }

            return defaultMap[sourceName] || defaultMap[normalizedName] || normalizedName;
        },

        /**
         * 标准化数据集名称
         */
        normalizeDatasetName(localizedName, datasetName, language) {
            const normalizedLanguage = typeof popup.i18n?.normalizeLanguage === 'function'
                ? popup.i18n.normalizeLanguage(language)
                : (language || '').toLowerCase();
            const fallbackLang = typeof popup.i18n?.normalizeLanguage === 'function'
                ? popup.i18n.normalizeLanguage(popup.i18n?.fallbackLanguage || 'zhcn')
                : (popup.i18n?.fallbackLanguage || 'zhcn').toLowerCase();
            const rawName = popup.getLocalizedValue(datasetName, typeof datasetName === 'string' ? datasetName : '');
            const trimmed = (rawName || '').trim();
            const suffixMap = {
                'zhcn': '知识库',
                'zh-tw': '知識庫',
                'en': 'Knowledge Base',
                'jap': 'ナレッジベース'
            };
            const suffix = suffixMap[normalizedLanguage] || suffixMap[fallbackLang] || 'Knowledge Base';
            const hasChinese = /[\u4e00-\u9fff]/.test(trimmed);
            const hasEnglish = /[A-Za-z]/.test(trimmed);

            if (!localizedName) {
                return trimmed || '';
            }

            if (!trimmed) {
                return `${localizedName} ${suffix}`.trim();
            }

            if (normalizedLanguage === 'en') {
                if (hasChinese) {
                    return `${localizedName} ${suffix}`.trim();
                }
                return trimmed.replace(/知识库|知識庫/g, 'Knowledge Base');
            }

            if (normalizedLanguage === 'zh-tw') {
                if (!hasChinese && hasEnglish) {
                    return trimmed.replace(/Knowledge Base/gi, suffix);
                }
                return trimmed.replace(/知识库/g, suffix);
            }

            if (!hasChinese && hasEnglish) {
                return trimmed.replace(/Knowledge Base/gi, suffix);
            }

            return trimmed;
        },

        /**
         * 本地化知识库
         */
        localizeKnowledgeBase(kb) {
            if (!kb) return kb;
            const language = popup.currentLanguage || popup.i18n?.defaultLanguage || 'zhcn';
            let localizedName = popup.formatKnowledgeBaseName(kb.name);
            if (!localizedName) {
                const fallbackName = popup.getLocalizedValue(kb.name, typeof kb.name === 'string' ? kb.name : '');
                localizedName = fallbackName || kb.id || '';
            }
            const datasetName = popup.normalizeDatasetName(localizedName, kb.dataset_name, language);

            return {
                ...kb,
                name: localizedName,
                dataset_name: datasetName
            };
        },

        /**
         * 渲染知识库数据到下拉框
         */
        renderKnowledgeBasesFromData(knowledgeBases) {
            const select = popup.knowledgeBaseSelect;
            if (!select || !Array.isArray(knowledgeBases)) return;

            const optionById = new Map();
            Array.from(select.options).forEach(option => {
                try {
                    const value = JSON.parse(option.value);
                    if (value && value.id) {
                        optionById.set(value.id, option);
                    }
                } catch (e) {
                    // 忽略默认项或解析失败的选项
                }
            });

            // 清理非默认项，避免语言切换时残留旧文案
            Array.from(select.options).forEach(option => {
                if (option.value) {
                    select.removeChild(option);
                }
            });

            let appendedCount = 0;

            knowledgeBases.forEach(kb => {
                const localized = popup.localizeKnowledgeBase(kb);
                let option = optionById.get(localized.id);
                if (!option) {
                    option = document.createElement('option');
                    optionById.set(localized.id, option);
                    appendedCount += 1;
                }
                option.value = JSON.stringify(localized);
                option.textContent = localized.name;
                select.appendChild(option);
            });

            console.log(`成功加载 ${knowledgeBases.length} 个知识库选项 (新增 ${appendedCount} 个)`);
            if (popup.previousKnowledgeBaseValue) {
                select.value = popup.previousKnowledgeBaseValue;
                popup.previousKnowledgeBaseValue = '';
            }
            popup.updateCharacterCount();
        },

        /**
         * 加载硬编码的默认知识库（最终备用方案）
         */
        loadDefaultKnowledgeBases() {
            console.log('使用硬编码的默认知识库列表');

            const language = popup.currentLanguage || popup.i18n?.defaultLanguage || "zhcn";
            const isEnglish = language === "en";

            const baseKnowledgeBases = [
                {
                    id: "2101",
                    name: { zh: "Oracle", en: "Oracle" },
                    dataset_name: { zh: "Oracle 知识库", en: "Oracle Knowledge Base" }
                },
                {
                    id: "2102",
                    name: { zh: "MySQL兼容", en: "MySQL Compatible" },
                    dataset_name: { zh: "MySQL兼容 知识库", en: "MySQL Compatible Knowledge Base" }
                },
                {
                    id: "2103",
                    name: { zh: "达梦", en: "Dameng" },
                    dataset_name: { zh: "达梦 知识库", en: "Dameng Knowledge Base" }
                },
                {
                    id: "2104",
                    name: { zh: "PG兼容生态", en: "PostgreSQL Compatible Ecosystem" },
                    dataset_name: { zh: "PG兼容生态 知识库", en: "PostgreSQL Compatible Ecosystem Knowledge Base" }
                },
                {
                    id: "2105",
                    name: { zh: "SQL Server", en: "SQL Server" },
                    dataset_name: { zh: "SQL Server 知识库", en: "SQL Server Knowledge Base" }
                },
                {
                    id: "2106",
                    name: { zh: "神通-OSCAR", en: "Shentong OSCAR" },
                    dataset_name: { zh: "神通-OSCAR 知识库", en: "Shentong OSCAR Knowledge Base" }
                },
                {
                    id: "2107",
                    name: { zh: "YashanDB", en: "YashanDB" },
                    dataset_name: { zh: "YashanDB 知识库", en: "YashanDB Knowledge Base" }
                },
                {
                    id: "2108",
                    name: { zh: "Redis", en: "Redis" },
                    dataset_name: { zh: "Redis 知识库", en: "Redis Knowledge Base" }
                },
                {
                    id: "2109",
                    name: { zh: "MongoDB", en: "MongoDB" },
                    dataset_name: { zh: "MongoDB 知识库", en: "MongoDB Knowledge Base" }
                },
                {
                    id: "2110",
                    name: { zh: "Redis Cluster", en: "Redis Cluster" },
                    dataset_name: { zh: "Redis Cluster 知识库", en: "Redis Cluster Knowledge Base" }
                },
                {
                    id: "2111",
                    name: { zh: "DB2", en: "DB2" },
                    dataset_name: { zh: "DB2 知识库", en: "DB2 Knowledge Base" }
                },
                {
                    id: "2114",
                    name: { zh: "KingBase", en: "Kingbase" },
                    dataset_name: { zh: "KingBase 知识库", en: "Kingbase Knowledge Base" }
                },
                {
                    id: "2115",
                    name: { zh: "Gbase", en: "GBase" },
                    dataset_name: { zh: "Gbase 知识库", en: "GBase Knowledge Base" }
                },
                {
                    id: "2116",
                    name: { zh: "磐维", en: "Panwei" },
                    dataset_name: { zh: "磐维 知识库", en: "Panwei Knowledge Base" }
                },
                {
                    id: "2117",
                    name: { zh: "OpenGauss", en: "openGauss" },
                    dataset_name: { zh: "OpenGauss 知识库", en: "openGauss Knowledge Base" }
                },
                {
                    id: "2201",
                    name: { zh: "TDSQL", en: "TDSQL" },
                    dataset_name: { zh: "TDSQL 知识库", en: "TDSQL Knowledge Base" }
                },
                {
                    id: "2202",
                    name: { zh: "GaussDB", en: "GaussDB" },
                    dataset_name: { zh: "GaussDB 知识库", en: "GaussDB Knowledge Base" }
                },
                {
                    id: "2203",
                    name: { zh: "OceanBase", en: "OceanBase" },
                    dataset_name: { zh: "OceanBase 知识库", en: "OceanBase Knowledge Base" }
                },
                {
                    id: "2204",
                    name: { zh: "TiDB", en: "TiDB" },
                    dataset_name: { zh: "TiDB 知识库", en: "TiDB Knowledge Base" }
                },
                {
                    id: "2205",
                    name: { zh: "GoldenDB", en: "GoldenDB" },
                    dataset_name: { zh: "GoldenDB 知识库", en: "GoldenDB Knowledge Base" }
                },
                {
                    id: "2206",
                    name: { zh: "Gbase 分布式", en: "GBase Distributed" },
                    dataset_name: { zh: "Gbase 分布式 知识库", en: "GBase Distributed Knowledge Base" }
                },
                {
                    id: "2208",
                    name: { zh: "GBase 8a", en: "GBase 8a" },
                    dataset_name: { zh: "GBase 8a 知识库", en: "GBase 8a Knowledge Base" }
                },
                {
                    id: "2209",
                    name: { zh: "HashData", en: "HashData" },
                    dataset_name: { zh: "HashData 知识库", en: "HashData Knowledge Base" }
                },
                {
                    id: "2118",
                    name: { zh: "GreatSQL", en: "GreatSQL" },
                    dataset_name: { zh: "GreatSQL 知识库", en: "GreatSQL Knowledge Base" }
                },
                {
                    id: "2119",
                    name: { zh: "虚谷数据库", en: "Xugu Database" },
                    dataset_name: { zh: "虚谷 知识库", en: "Xugu Knowledge Base" }
                },
                {
                    id: "1111",
                    name: { zh: "操作系统", en: "Operating Systems" },
                    dataset_name: { zh: "操作系统 知识库", en: "Operating Systems Knowledge Base" }
                }
            ];

            const defaultKnowledgeBases = baseKnowledgeBases.map(item => ({
                id: item.id,
                name: isEnglish ? item.name.en : item.name.zh,
                dataset_name: isEnglish ? item.dataset_name.en : item.dataset_name.zh
            }));

            const select = popup.knowledgeBaseSelect;
            defaultKnowledgeBases.forEach(kb => {
                const option = document.createElement('option');
                option.value = JSON.stringify(kb); // 存储完整的知识库对象
                option.textContent = popup.formatKnowledgeBaseName(kb.name);
                select.appendChild(option);
            });

            console.log(`使用默认值，添加了 ${defaultKnowledgeBases.length} 个知识库选项`);
            if (popup.previousKnowledgeBaseValue) {
                select.value = popup.previousKnowledgeBaseValue;
                popup.previousKnowledgeBaseValue = "";
            }
            popup.updateCharacterCount();
        }
    };
}

