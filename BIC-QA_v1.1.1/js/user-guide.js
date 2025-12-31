// BIC-QA 用户使用手册国际化初始化脚本
(function() {
    let i18n = null;
    let currentLanguage = 'zhcn';

    // 更新页面favicon
    function updateFavicon(isDarkMode) {
        try {
            const favicon = document.getElementById('favicon');
            if (favicon && typeof chrome !== 'undefined' && chrome.runtime) {
                const iconFileName = isDarkMode ? 'logo_dark-removebg-preview.png' : 'logo-removebg-preview.png';
                const iconPath = chrome.runtime.getURL(`icons/${iconFileName}`);
                favicon.href = iconPath;
                console.log('页面favicon已更新为:', iconPath, isDarkMode ? '(深色模式)' : '(浅色模式)');
            } else if (favicon) {
                // 备用方案：使用相对路径
                const iconPath = isDarkMode ? '../icons/logo_dark-removebg-preview.png' : '../icons/logo-removebg-preview.png';
                favicon.href = iconPath;
                console.log('页面favicon已更新为(相对路径):', iconPath);
            }
        } catch (error) {
            console.error('更新favicon失败:', error);
        }
    }

    // 检测系统主题并更新favicon
    function detectAndUpdateIcon() {
        try {
            // 检测系统主题
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // 更新页面favicon
            updateFavicon(isDarkMode);

            // 监听主题变化
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const newIsDarkMode = e.matches;
                // 更新页面favicon
                updateFavicon(newIsDarkMode);
            });

        } catch (error) {
            console.error('检测并更新图标失败:', error);
        }
    }

    // 初始化favicon
    function initFavicon() {
        // 延迟执行，确保DOM完全加载
        setTimeout(() => {
            detectAndUpdateIcon();
        }, 100);
    }

    // 等待 I18nService 加载
    function waitForI18nService(maxAttempts = 50, interval = 100) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const check = () => {
                if (typeof I18nService !== 'undefined') {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, interval);
                } else {
                    reject(new Error('I18nService 加载超时'));
                }
            };
            check();
        });
    }

    // 初始化 I18nService
    async function initI18nService() {
        try {
            await waitForI18nService();
            if (typeof I18nService !== 'undefined') {
                i18n = new I18nService({
                    defaultLanguage: 'zhcn',
                    fallbackLanguage: 'zhcn',
                    defaultNamespace: 'userGuide',
                    languageAliases: {
                        zh: 'zhcn',
                        'zh-cn': 'zhcn',
                        'zh-CN': 'zhcn',
                        'zh-tw': 'zh-tw',
                        'zh-TW': 'zh-tw',
                        en: 'en',
                        'en-us': 'en',
                        'en-US': 'en',
                        ja: 'jap',
                        'ja-jp': 'jap',
                        'ja-JP': 'jap'
                    }
                });
                console.log('I18nService 初始化成功');
            } else {
                console.error('I18nService 未定义');
            }
        } catch (error) {
            console.error('等待 I18nService 加载失败:', error);
        }
    }

    // 获取存储的语言偏好
    function getStoredLanguagePreference() {
        return new Promise((resolve) => {
            if (typeof chrome === 'undefined' || !chrome.storage?.sync?.get) {
                resolve({ uiLanguage: 'zhcn' });
                return;
            }
            try {
                chrome.storage.sync.get({ uiLanguage: 'zhcn' }, (items) => {
                    if (chrome.runtime?.lastError) {
                        console.error('读取语言偏好失败:', chrome.runtime.lastError);
                        resolve({ uiLanguage: 'zhcn' });
                    } else {
                        resolve(items);
                    }
                });
            } catch (error) {
                console.error('读取语言偏好异常:', error);
                resolve({ uiLanguage: 'zhcn' });
            }
        });
    }

    // 更新版本号显示
    async function updateVersionDisplay() {
        try {
            // 从 manifest.json 获取版本号
            let version = '1.1.1';
            let versionWithPrefix = 'v1.1.1';
            try {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                    const manifest = chrome.runtime.getManifest();
                    version = manifest.version || '1.1.1';
                    versionWithPrefix = `v${version}`;
                    console.log('[updateVersionDisplay] 从 manifest 获取版本号:', version, '带前缀:', versionWithPrefix);
                } else {
                    console.warn('[updateVersionDisplay] chrome.runtime.getManifest 不可用');
                }
            } catch (e) {
                console.error('[updateVersionDisplay] 获取版本号失败:', e);
            }

            // 需要更新版本号的元素和对应的翻译键
            const versionElements = [
                { selector: '[data-i18n="userGuide.header.version"]', key: 'userGuide.header.version' },
                { selector: '[data-i18n="userGuide.installation.steps.step1.content"]', key: 'userGuide.installation.steps.step1.content' },
                { selector: '[data-i18n-html="userGuide.installation.steps.step5.content"]', key: 'userGuide.installation.steps.step5.content' },
                { selector: '[data-i18n="userGuide.troubleshooting.commonIssues.issue1.solution.step3"]', key: 'userGuide.troubleshooting.commonIssues.issue1.solution.step3' },
                { selector: '[data-i18n="userGuide.footer.version"]', key: 'userGuide.footer.version' }
            ];

            versionElements.forEach(({ selector, key }) => {
                const elements = document.querySelectorAll(selector);
                console.log(`[updateVersionDisplay] 查找元素: ${selector}, 找到 ${elements.length} 个`);
                elements.forEach(el => {
                    if (el.hasAttribute('data-i18n-html')) {
                        // 处理 data-i18n-html 元素
                        let html = el.innerHTML;
                        console.log(`[updateVersionDisplay] 替换前 HTML: ${html}`);
                        // 替换所有版本号格式：v1.1, v1.1.1, BIC-QA_v1.1, BIC-QA_v1.1.1 等
                        html = html.replace(/v\d+(?:\.\d+)+/g, versionWithPrefix);
                        html = html.replace(/BIC-QA_v\d+(?:\.\d+)+/g, `BIC-QA_${versionWithPrefix}`);
                        console.log(`[updateVersionDisplay] 替换后 HTML: ${html}`);
                        el.innerHTML = html;
                    } else {
                        // 处理 data-i18n 元素
                        let text = el.textContent;
                        console.log(`[updateVersionDisplay] 替换前文本: ${text}`);
                        // 替换所有版本号格式
                        text = text.replace(/v\d+(?:\.\d+)+/g, versionWithPrefix);
                        text = text.replace(/BIC-QA_v\d+(?:\.\d+)+/g, `BIC-QA_${versionWithPrefix}`);
                        console.log(`[updateVersionDisplay] 替换后文本: ${text}`);
                        el.textContent = text;
                    }
                });
            });
            console.log('[updateVersionDisplay] 版本号更新完成');
        } catch (error) {
            console.error('更新版本号显示失败:', error);
        }
    }

    // 翻译静态元素
    function translateStaticElements(language) {
        if (!i18n) {
            console.warn('i18n 未初始化，无法翻译');
            return;
        }

        const translate = (key) => {
            if (!key) return undefined;
            try {
                // 使用当前设置的语言进行翻译
                const value = i18n.t(key, language);
                // 如果返回的是 key 本身（未找到翻译），检查是否是有效的翻译键格式
                // 如果 key 包含点号（如 userGuide.header.title），说明是有效的翻译键
                // 如果返回的 value 等于 key 且 key 包含点号，说明未找到翻译
                if (value === key && key.includes('.')) {
                    // 检查回退语言是否有翻译
                    const fallbackValue = i18n.t(key, 'zhcn');
                    if (fallbackValue !== key && fallbackValue !== '') {
                        console.warn(`未找到 ${language} 翻译键: ${key}，使用中文回退`);
                        return fallbackValue;
                    }
                    console.warn(`未找到翻译键: ${key} (语言: ${language})`);
                    return undefined; // 保持原文本不变
                }
                // 返回字符串值（包括空字符串），但排除空字符串
                if (typeof value === 'string' && value !== '') {
                    return value;
                }
                return undefined;
            } catch (error) {
                console.error(`翻译键失败: ${key}`, error);
                return undefined;
            }
        };

        const setAttribute = (el, attr, key) => {
            const translation = translate(key);
            if (translation !== undefined && translation !== '') {
                el.setAttribute(attr, translation);
            }
        };

        // 翻译所有带有 data-i18n 属性的元素
        let translatedCount = 0;
        let skippedCount = 0;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.dataset.i18n;
            if (!key) return;
            const translation = translate(key);
            if (translation !== undefined && translation !== '') {
                el.textContent = translation;
                translatedCount++;
            } else {
                skippedCount++;
            }
        });
        console.log(`翻译完成: 成功 ${translatedCount} 个，跳过 ${skippedCount} 个`);

        // 翻译所有带有 data-i18n-html 属性的元素
        document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.dataset.i18nHtml;
            if (!key) return;
            const translation = translate(key);
            if (translation !== undefined && translation !== '') {
                el.innerHTML = translation;
            }
        });

        // 翻译所有带有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            setAttribute(el, 'title', el.dataset.i18nTitle);
        });

        // 翻译所有带有 data-i18n-alt 属性的元素
        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            setAttribute(el, 'alt', el.dataset.i18nAlt);
        });
    }

    // 应用语言
    async function applyLanguage(language) {
        if (!i18n) {
            console.warn('i18n 未初始化，无法应用语言');
            return;
        }

        try {
            console.log(`开始应用语言: ${language}`);
            // 确保语言包已加载
            await i18n.ensureLanguage(language);
            await i18n.setLanguage(language);
            currentLanguage = language;
            console.log(`当前语言设置为: ${currentLanguage}, i18n.currentLanguage: ${i18n.currentLanguage}`);
            
            // 翻译静态元素
            console.log('开始翻译静态元素...');
            translateStaticElements(language);
            console.log('翻译完成');
            
            // 更新版本号显示（在翻译完成后）
            await updateVersionDisplay();
            
            // 更新 HTML lang 属性
            document.documentElement.lang = i18n.getIntlLocale ? i18n.getIntlLocale(language) : 'zh-CN';
        } catch (error) {
            console.error('应用语言失败:', error);
        }
    }

    // 初始化
    async function init() {
        if (!i18n) {
            console.error('I18nService 未加载，无法进行国际化初始化');
            return;
        }

        try {
            // 先获取存储的语言偏好
            const stored = await getStoredLanguagePreference();
            const languageToUse = stored?.uiLanguage || 'zhcn';
            console.log('读取到的语言偏好:', stored, '使用的语言:', languageToUse);
            console.log('当前 i18n 状态:', {
                initialized: !!i18n,
                currentLanguage: i18n?.currentLanguage,
                cache: Object.keys(i18n?.cache || {})
            });
            
            // 确保默认语言和用户选择的语言都已加载
            console.log('加载默认语言包: zhcn');
            await i18n.ensureLanguage('zhcn');
            if (languageToUse !== 'zhcn') {
                console.log(`加载用户选择的语言包: ${languageToUse}`);
                await i18n.ensureLanguage(languageToUse);
            }
            
            // 应用用户选择的语言
            console.log(`应用语言: ${languageToUse}`);
            await applyLanguage(languageToUse);
            console.log('国际化初始化完成');

            // 初始化favicon
            initFavicon();
        } catch (error) {
            console.error('初始化国际化失败:', error);
            console.error('错误堆栈:', error.stack);
            // 如果失败，至少尝试加载默认语言
            try {
                console.log('尝试回退到默认语言: zhcn');
                await i18n.ensureLanguage('zhcn');
                await applyLanguage('zhcn');
            } catch (fallbackError) {
                console.error('加载默认语言也失败:', fallbackError);
            }
        }
    }

    // DOM 加载完成后初始化
    async function startInit() {
        // 先初始化 I18nService
        await initI18nService();
        // 然后执行初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    
    // 开始初始化流程
    startInit();

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 返回顶部按钮显示/隐藏
    window.addEventListener('scroll', function() {
        const backToTop = document.querySelector('.back-to-top');
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'flex';
        } else {
            backToTop.style.display = 'none';
        }
    });

    // 二维码加载功能
    const SERVER_BASE_URL = 'https://res.bic-qa.com';
    const QR_CODE_PATHS = {
        assistant: 'wechat-assistant-qr.jpg',      // 微信小助手二维码
        official: 'static/publicNum-QRcode.jpg'   // 微信公众号二维码
    };

    // 检查图片是否可访问
    function checkImageAccess(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            // 设置超时
            setTimeout(() => resolve(false), 5000);
        });
    }

    // 动态加载二维码
    async function loadQRCodes() {
        const qrContainer = document.querySelector('.qr-code-container');
        if (!qrContainer) {
            console.log('未找到二维码容器，跳过加载');
            return;
        }

        // 清空现有内容
        qrContainer.innerHTML = '';

        // 优先级：微信小助手 > 微信公众号 > 本地公众号
        const qrConfigs = [
            {
                serverUrl: `${SERVER_BASE_URL}/${QR_CODE_PATHS.assistant}`,
                localUrl: '../icons/qa-helper-QRcode.jpg',
                label: '微信小助手',
                alt: '微信小助手二维码'
            },
            {
                serverUrl: `${SERVER_BASE_URL}/${QR_CODE_PATHS.official}`,
                localUrl: '../icons/publicNum-QRcode .jpg',
                label: '微信公众号',
                alt: '微信公众号二维码'
            }
        ];

        const loadedQRCodes = [];

        // 检查并加载服务器二维码
        for (const config of qrConfigs) {
            try {
                const isAccessible = await checkImageAccess(config.serverUrl);
                if (isAccessible) {
                    loadedQRCodes.push({
                        url: config.serverUrl,
                        label: config.label,
                        alt: config.alt
                    });
                    console.log(`服务器二维码加载成功: ${config.label}`);
                } else {
                    console.log(`服务器二维码不可访问，使用本地备用: ${config.label}`);
                    loadedQRCodes.push({
                        url: config.localUrl,
                        label: config.label,
                        alt: config.alt
                    });
                }
            } catch (error) {
                console.error(`检查二维码失败: ${config.label}`, error);
                loadedQRCodes.push({
                    url: config.localUrl,
                    label: config.label,
                    alt: config.alt
                });
            }
        }

        // 如果都没有加载到，使用本地公众号二维码作为最后的后备
        if (loadedQRCodes.length === 0) {
            loadedQRCodes.push({
                url: '../icons/publicNum-QRcode .jpg',
                label: '微信公众号',
                alt: '微信公众号二维码'
            });
        }

        // 渲染二维码
        loadedQRCodes.forEach(qr => {
            const qrItem = document.createElement('div');
            qrItem.className = 'qr-code-item';

            qrItem.innerHTML = `
                <img src="${qr.url}" alt="${qr.alt}" class="qr-code-image" onerror="this.src='../icons/publicNum-QRcode .jpg'">
                <p class="qr-code-label">${qr.label}</p>
            `;

            qrContainer.appendChild(qrItem);
        });

        console.log(`二维码加载完成，共加载 ${loadedQRCodes.length} 个二维码`);
    }

    // 在 DOM 加载完成后初始化二维码加载
    function initQRCodes() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadQRCodes);
        } else {
            loadQRCodes();
        }
    }

    // 开始初始化二维码
    initQRCodes();
})();

