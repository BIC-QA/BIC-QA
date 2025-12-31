// 法律文档页面国际化初始化脚本
(function () {
    class LegalPageI18n {
        constructor(pageKey) {
            this.pageKey = pageKey;
            this.supportedLanguages = ['zhcn', 'en', 'zh-tw', 'jap'];
            this.languageAliases = {
                'zh': 'zhcn',
                'zh-cn': 'zhcn',
                'zh_cn': 'zhcn',
                'zh-CN': 'zhcn',
                'cn': 'zhcn',
                'zh-tw': 'zh-tw',
                'zh_tw': 'zh-tw',
                'zh-TW': 'zh-tw',
                'zhtw': 'zh-tw',
                'tw': 'zh-tw',
                'zh-hk': 'zh-tw',
                'en': 'en',
                'en-us': 'en',
                'en_US': 'en',
                'en-GB': 'en',
                'jap': 'jap',
                'ja': 'jap',
                'ja-jp': 'jap',
                'ja_JP': 'jap',
                'jp': 'jap'
            };

            if (typeof I18nService === 'undefined') {
                console.warn('I18nService 未加载，无法对页面进行国际化处理。');
                this.i18n = null;
                return;
            }

            this.i18n = new I18nService({
                defaultLanguage: 'zhcn',
                fallbackLanguage: 'zhcn',
                supportedLanguages: this.supportedLanguages,
                languageAliases: this.languageAliases
            });
        }

        async init() {
            if (!this.i18n) {
                return;
            }

            try {
                await this.i18n.ensureLanguage(this.i18n.defaultLanguage);
            } catch (error) {
                console.error('初始化默认语言资源失败:', error);
            }

            const preferredLanguage = await this.detectPreferredLanguage();
            await this.applyLanguage(preferredLanguage, { persist: false });
        }

        async detectPreferredLanguage() {
            const defaultLanguage = this.i18n?.defaultLanguage || 'zhcn';
            const urlLanguage = this.getUrlLanguage();
            if (urlLanguage) {
                return urlLanguage;
            }

            const storedLanguage = await this.getStoredLanguagePreference();
            if (storedLanguage) {
                return storedLanguage;
            }

            const browserLanguage = this.getBrowserLanguage();
            if (browserLanguage) {
                return browserLanguage;
            }

            return defaultLanguage;
        }

        getUrlLanguage() {
            if (typeof window === 'undefined' || !window.location?.search) {
                return null;
            }
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const lang = urlParams.get('lang');
                return lang ? this.i18n.normalizeLanguage(lang) : null;
            } catch (error) {
                console.warn('解析 URL 语言参数失败:', error);
                return null;
            }
        }

        getBrowserLanguage() {
            if (typeof navigator === 'undefined' || !navigator.language) {
                return null;
            }
            return this.i18n.normalizeLanguage(navigator.language);
        }

        async getStoredLanguagePreference() {
            const defaultLanguage = this.i18n?.defaultLanguage || 'zhcn';
            if (typeof chrome !== 'undefined' && chrome.storage?.sync?.get) {
                try {
                    const language = await new Promise((resolve) => {
                        try {
                            chrome.storage.sync.get({ uiLanguage: defaultLanguage }, (items) => {
                                if (chrome.runtime?.lastError) {
                                    console.error('读取语言偏好失败:', chrome.runtime.lastError);
                                    resolve(defaultLanguage);
                                } else {
                                    resolve(items.uiLanguage || defaultLanguage);
                                }
                            });
                        } catch (error) {
                            console.error('读取语言偏好异常:', error);
                            resolve(defaultLanguage);
                        }
                    });
                    return language;
                } catch (error) {
                    console.error('读取语言偏好失败:', error);
                }
            }

            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const stored = window.localStorage.getItem('bicqa.uiLanguage');
                    if (stored) {
                        return this.i18n.normalizeLanguage(stored);
                    }
                }
            } catch (error) {
                console.warn('读取本地语言偏好失败:', error);
            }

            return defaultLanguage;
        }

        async applyLanguage(language, options = {}) {
            if (!this.i18n) return;

            const { persist = true } = options;
            let normalizedLanguage = language;

            try {
                normalizedLanguage = await this.i18n.setLanguage(language);
            } catch (error) {
                console.error('设置语言失败，使用回退语言:', error);
                normalizedLanguage = await this.i18n.setLanguage(this.i18n.fallbackLanguage);
            }

            try {
                await this.i18n.ensureLanguage(normalizedLanguage);
            } catch (error) {
                console.error('加载语言资源失败:', error);
            }

            this.translateStaticElements(normalizedLanguage);
            this.updateDocumentMetadata(normalizedLanguage);

            if (persist) {
                this.persistLanguagePreference(normalizedLanguage);
            }
        }

        translateStaticElements(language) {
            const translate = (key) => {
                if (!key) return undefined;
                const value = this.i18n.t(key, language);
                return typeof value === 'string' ? value : undefined;
            };

            const setAttribute = (el, attr, key) => {
                const translation = translate(key);
                if (translation !== undefined) {
                    el.setAttribute(attr, translation);
                }
            };

            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const translation = translate(el.dataset.i18n);
                if (translation !== undefined) {
                    el.textContent = translation;
                }
            });

            document.querySelectorAll('[data-i18n-html]').forEach((el) => {
                const translation = translate(el.dataset.i18nHtml);
                if (translation !== undefined) {
                    el.innerHTML = translation;
                }
            });

            document.querySelectorAll('[data-i18n-title]').forEach((el) => {
                setAttribute(el, 'title', el.dataset.i18nTitle);
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
                setAttribute(el, 'placeholder', el.dataset.i18nPlaceholder);
            });
        }

        updateDocumentMetadata(language) {
            const titleKey = `${this.pageKey}.meta.title`;
            const translatedTitle = this.i18n.t(titleKey, language);
            if (translatedTitle) {
                document.title = translatedTitle;
            }

            const htmlLang = this.i18n.getIntlLocale(language);
            if (htmlLang && document.documentElement) {
                document.documentElement.lang = htmlLang;
            }
        }

        persistLanguagePreference(language) {
            if (typeof chrome !== 'undefined' && chrome.storage?.sync?.set) {
                try {
                    chrome.storage.sync.set({ uiLanguage: language }, () => {
                        if (chrome.runtime?.lastError) {
                            console.error('保存语言偏好失败:', chrome.runtime.lastError);
                        }
                    });
                    return;
                } catch (error) {
                    console.error('保存语言偏好失败:', error);
                }
            }

            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('bicqa.uiLanguage', language);
                }
            } catch (error) {
                console.warn('保存本地语言偏好失败:', error);
            }
        }
    }

    function bootstrap() {
        if (typeof document === 'undefined') {
            return;
        }

        const pageKey = document.body?.dataset?.page;
        if (!pageKey) {
            console.warn('未检测到页面标识，跳过法律文档国际化处理。');
            return;
        }

        const legalPage = new LegalPageI18n(pageKey);
        legalPage.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    window.BICLegalPageI18n = LegalPageI18n;
})();

