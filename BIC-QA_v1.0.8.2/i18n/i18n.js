(function (global) {
    class I18nService {
        constructor(options = {}) {
            const {
                defaultLanguage = 'zhcn',
                fallbackLanguage = 'zhcn',
                supportedLanguages = ['zhcn', 'en'],
                localePath = 'i18n/locales',
                languageAliases = {},
                intlLocaleMap = {}
            } = options;

            this.defaultLanguage = defaultLanguage;
            this.fallbackLanguage = fallbackLanguage || defaultLanguage;
            this.supportedLanguages = new Set(
                Array.isArray(supportedLanguages) && supportedLanguages.length > 0
                    ? supportedLanguages.map((lang) => lang.toLowerCase())
                    : [defaultLanguage.toLowerCase()]
            );
            this.localePath = localePath;
            this.languageAliases = Object.assign({
                'zh-cn': 'zhcn',
                'zhcn': 'zhcn',
                'zh_cn': 'zhcn',
                'zh': 'zhcn',
                'cn': 'zhcn',
                'en-us': 'en',
                'en-gb': 'en',
                'en': 'en',
                'en_uk': 'en',
                'zh-tw': 'zh-tw',
                'zh_tw': 'zh-tw',
                'zhtw': 'zh-tw',
                'tw': 'zh-tw',
                'zh-hk': 'zh-tw',
                'jap': 'jap',
                'ja': 'jap',
                'jp': 'jap'
            }, this._normalizeAliasMap(languageAliases));
            this.intlLocaleMap = Object.assign({
                'zhcn': 'zh-CN',
                'en': 'en-US',
                'zh-tw': 'zh-TW',
                'jap': 'ja-JP'
            }, this._normalizeAliasMap(intlLocaleMap, true));

            this.cache = {};
            this.loadingPromises = {};
            this.currentLanguage = this.normalizeLanguage(this.defaultLanguage);
        }

        _normalizeAliasMap(map = {}, keepValues = false) {
            return Object.keys(map).reduce((acc, key) => {
                const normalizedKey = typeof key === 'string' ? key.toLowerCase() : key;
                let value = map[key];
                if (!keepValues && typeof value === 'string') {
                    value = value.toLowerCase();
                }
                acc[normalizedKey] = value;
                return acc;
            }, {});
        }

        normalizeLanguage(language) {
            if (!language) return this.defaultLanguage;
            const lower = String(language).toLowerCase();
            if (this.languageAliases[lower]) {
                return this.languageAliases[lower];
            }
            if (this.supportedLanguages.has(lower)) {
                return lower;
            }
            return this.fallbackLanguage;
        }

        getLocalePath(language) {
            return `${this.localePath}/${language}.json`;
        }

        async loadLocale(language) {
            const normalized = this.normalizeLanguage(language);
            const filePath = this.getLocalePath(normalized);
            const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
                ? chrome.runtime.getURL(filePath)
                : filePath;

            try {
                const response = await fetch(url, { cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error(`Failed to load locale '${normalized}' (${response.status})`);
                }
                const data = await response.json();
                this.cache[normalized] = data;
                return data;
            } catch (error) {
                console.error(`[I18nService] 加载语言包失败: ${normalized}`, error);
                this.cache[normalized] = this.cache[normalized] || {};
                return this.cache[normalized];
            } finally {
                delete this.loadingPromises[normalized];
            }
        }

        async ensureLanguage(language) {
            const normalized = this.normalizeLanguage(language || this.currentLanguage);
            if (!this.cache[normalized]) {
                if (!this.loadingPromises[normalized]) {
                    this.loadingPromises[normalized] = this.loadLocale(normalized);
                }
                await this.loadingPromises[normalized];
            }

            const fallback = this.normalizeLanguage(this.fallbackLanguage);
            if (!this.cache[fallback]) {
                if (!this.loadingPromises[fallback]) {
                    this.loadingPromises[fallback] = this.loadLocale(fallback);
                }
                await this.loadingPromises[fallback];
            }

            return this.cache[normalized];
        }

        async setLanguage(language) {
            const normalized = this.normalizeLanguage(language);
            await this.ensureLanguage(normalized);
            this.currentLanguage = normalized;
            return normalized;
        }

        t(key, language, params = undefined) {
            if (!key) return '';
            const normalized = this.normalizeLanguage(language || this.currentLanguage);
            const primary = this._resolveKey(this.cache[normalized], key);
            if (primary !== undefined) {
                return this._formatValue(primary, params);
            }
            const fallback = this.normalizeLanguage(this.fallbackLanguage);
            const fallbackValue = this._resolveKey(this.cache[fallback], key);
            return fallbackValue !== undefined ? this._formatValue(fallbackValue, params) : key;
        }

        getIntlLocale(language) {
            const normalized = this.normalizeLanguage(language || this.currentLanguage);
            return this.intlLocaleMap[normalized] || this.intlLocaleMap[this.normalizeLanguage(this.fallbackLanguage)] || 'en-US';
        }

        _resolveKey(source, path) {
            if (!source || typeof path !== 'string') return undefined;

            if (Object.prototype.hasOwnProperty.call(source, path)) {
                return source[path];
            }

            return path.split('.').reduce((acc, segment) => {
                if (acc && Object.prototype.hasOwnProperty.call(acc, segment)) {
                    return acc[segment];
                }
                return undefined;
            }, source);
        }

        _formatValue(value, params) {
            if (!params || typeof value !== 'string') {
                return value;
            }
            return Object.keys(params).reduce((acc, key) => {
                return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(params[key]));
            }, value);
        }
    }

    global.I18nService = I18nService;
})(typeof window !== 'undefined' ? window : globalThis);
