/**
 * 巡检诊断功能模块，将相关方法绑定到 BicQAPopup 实例。
 * @param {import('../app.js').BicQAPopup} app
 */
import { escapeHtml } from '../utils/common.js';

/**
 * 格式化日期，只保留年月日部分
 * @param {string} dateStr - 日期字符串，格式如 "2025-12-05 21:28:11" 或 "2025-12-05"
 * @returns {string} 格式化后的日期字符串，如 "2025-12-05"，如果无效则返回 '未知'
 */
function formatDateToYMD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return '未知';
    }
    // 如果包含空格，只取空格前的部分（年月日）
    const datePart = dateStr.trim().split(/\s+/)[0];
    // 验证日期格式（YYYY-MM-DD）
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart;
    }
    return '未知';
}

/**
 * 解析 pluginVersion JSON 字符串
 * @param {string} pluginVersionStr - pluginVersion JSON 字符串，格式: '[{"osType":"windows","version":"1.0.0"},{"osType":"linux","version":"1.0.0"}]'
 * @returns {Object} 解析后的版本对象，格式: { windows: "1.0.0", linux: "1.0.0" }
 */
function parsePluginVersion(pluginversion, type = 'dbCheck') {
    // 如果是字符串，尝试解析为对象（兼容旧格式）
    if (typeof pluginversion === 'string') {
        if (!pluginversion.trim()) {
            return { windows: '', linux: '', extras: {} };
        }

        // 对后端返回的非标准 JSON 进行容错清洗，避免因为末尾逗号/缺失括号导致解析失败
        const normalizePluginVersionStr = (raw) => {
            // 去除换行符
            let cleaned = raw.replace(/\r\n/g, '').replace(/\n/g, '').trim();
            // 去掉末尾悬挂逗号，如 {"windows":"1.0.0",  -> {"windows":"1.0.0"}
            cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
            // 如果缺失结尾括号，尝试补齐
            if (cleaned.startsWith('{') && !cleaned.endsWith('}')) {
                cleaned = `${cleaned}}`;
            } else if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
                cleaned = `${cleaned}]`;
            }
            return cleaned;
        };

        try {
            const cleanedStr = normalizePluginVersionStr(pluginversion);
            pluginversion = JSON.parse(cleanedStr);
        } catch (error) {
            console.error('解析 pluginversion 字符串失败:', error, '原始值:', pluginversion);
            return { windows: '', linux: '', extras: {} };
        }
    }

    // 如果不是对象，返回空结果
    if (!pluginversion || typeof pluginversion !== 'object') {
        return { windows: '', linux: '', extras: {} };
    }

    const result = { windows: '', linux: '', extras: {} };

    // 新格式：对象格式 { qa: {...}, dbCheck: [...], sqlOptimization: [...] }
    if (pluginversion[type] && Array.isArray(pluginversion[type])) {
        // 从指定类型的数据中提取插件版本信息
        pluginversion[type].forEach(item => {
            if (item && item.plugins && Array.isArray(item.plugins)) {
                item.plugins.forEach(plugin => {
                    if (plugin && plugin.osType && plugin.version) {
                        const osType = plugin.osType.toLowerCase();
                        if (osType === 'windows' || osType === 'linux') {
                            result[osType] = plugin.version;
                        } else if (osType) {
                            result.extras[osType] = plugin.version;
                        }
                    }
                });
            }
        });
    } else if (Array.isArray(pluginversion)) {
        // 兼容旧格式：数组格式 [{"osType":"windows","version":"1.0.0"},{"osType":"linux","version":"1.0.0"}]
        pluginversion.forEach(item => {
            if (item && item.osType && item.version) {
                const osType = (item.osType || '').toLowerCase();
                if (osType === 'windows' || osType === 'linux') {
                    result[osType] = item.version;
                } else if (osType) {
                    result.extras[osType] = item.version;
                }
            }
        });
    } else if (typeof pluginversion === 'object' && pluginversion !== null) {
        // 兼容旧格式：对象格式 {"windows": "1.0.0", "linux": "1.0.0", "mac":"1.0.0"}
        Object.keys(pluginversion).forEach(key => {
            const lower = key.toLowerCase();
            if (lower === 'windows' || lower === 'linux') {
                result[lower] = pluginversion[key];
            } else {
                result.extras[lower] = pluginversion[key];
            }
        });
    }

    return result;
}

export function attachInspectionModule(app) {
    app.showInspectionDialog = showInspectionDialog.bind(app);
    app.hideInspectionDialog = hideInspectionDialog.bind(app);
    app.resetInspectionForm = resetInspectionForm.bind(app);
    app.loadInspectionDatabaseTypes = loadInspectionDatabaseTypes.bind(app);
    app.handleInspectionFileSelect = handleInspectionFileSelect.bind(app);
    app.handleInspectionSubmit = handleInspectionSubmit.bind(app);
    app.submitInspectionAnalysis = submitInspectionAnalysis.bind(app);

    app.switchInspectionTab = switchInspectionTab.bind(app);
    app.handleInspectionSearch = handleInspectionSearch.bind(app);
    app.handleInspectionReset = handleInspectionReset.bind(app);
    app.loadInspectionHistoryList = loadInspectionHistoryList.bind(app);
    app.renderInspectionHistoryList = renderInspectionHistoryList.bind(app);
    app.createInspectionHistoryTableRow = createInspectionHistoryTableRow.bind(app);
    app.getInspectionStatusText = getInspectionStatusText.bind(app);
    app.getInspectionStatusClass = getInspectionStatusClass.bind(app);
    app.getInspectionNotifyStatusText = getInspectionNotifyStatusText.bind(app);
    app.getInspectionNotifyStatusClass = getInspectionNotifyStatusClass.bind(app);
    app.updateInspectionPagination = updateInspectionPagination.bind(app);
    app.handleInspectionResend = handleInspectionResend.bind(app);

    // 新增方法绑定
    app.bindInspectionDatabaseTypeChange = bindInspectionDatabaseTypeChange.bind(app);
    app.updateInspectionDatabaseDescription = updateInspectionDatabaseDescription.bind(app);
    app.updateInspectionScriptCollectorDownloadLinks = updateInspectionScriptCollectorDownloadLinks.bind(app);
    app.handleInspectionDownload = handleInspectionDownload.bind(app);
    
    // 下载客户端方法（保留）
    app.downloadInspectionClient = downloadInspectionClient.bind(app);
    
    // 刷新脚本包方法
    app.refreshScriptPackage = refreshScriptPackage.bind(app);
    app.getUserProfile = getUserProfile.bind(app);
    app.loadScriptCollectorCodeOptions = loadScriptCollectorCodeOptions.bind(app);
    app.getSelectedScriptCollectorCode = getSelectedScriptCollectorCode.bind(app);
    app.fetchLatestPluginsList = fetchLatestPluginsList.bind(app);
    app.getRemoteScriptPackageInfo = getRemoteScriptPackageInfo.bind(app);
    app.downloadPlugin = downloadPlugin.bind(app);
    app.downloadPluginFile = downloadPluginFile.bind(app);
    app.triggerDownload = triggerDownload.bind(app);
    app.calculateBlobMD5 = calculateBlobMD5.bind(app);
    app.checkScriptCollectorVersion = checkScriptCollectorVersion.bind(app);
    app.showScriptCollectorOptions = showScriptCollectorOptions.bind(app);
    app.getPluginList = getPluginList.bind(app);
    app.updatePluginVersion = updatePluginVersion.bind(app);
}

async function showInspectionDialog() {
    if (!this.inspectionDialog) return;
    
    // 重置表单
    this.resetInspectionForm();
    
    // 显示对话框
    this.inspectionDialog.style.display = 'flex';

    // 确保更新图标仍然可见（如果应该显示）
    if (this.ensureUpdateIconVisible) {
        setTimeout(() => {
            this.ensureUpdateIconVisible();
        }, 100);
    }

    // 更新弹窗内的国际化文本
    this.translateStaticElements(this.currentLanguage);

    // 加载数据库类型选项
    await this.loadInspectionDatabaseTypes();
    
    // 根据环境类型控制邮箱输入框显示
    const envType = await this.getEnvType();
    const emailGroup = document.querySelector('#inspectionEmail')?.closest('.form-group');
    if (emailGroup) {
        emailGroup.style.display = envType === 'in_env' ? 'none' : 'block';
    }
    
    // 初始化脚本采集器编码下拉框
    await this.loadScriptCollectorCodeOptions();
    
    await this.loadRegistrationEmail(this.inspectionEmail);
    
    // 只调用一次接口获取用户信息，然后复用结果
    let userProfileData = null;
    try {
        // 直接调用getUserProfile获取完整用户信息（包括pluginVersion）
        userProfileData = await this.getUserProfile();
        
        // 手动填充用户名和邮箱到输入框
        if (this.inspectionUserName && userProfileData.userName) {
            this.inspectionUserName.value = userProfileData.userName;
        }
        // 仅当邮箱为空时才用接口返回覆盖，避免覆盖注册邮箱
        if (this.inspectionEmail && !this.inspectionEmail.value && userProfileData.email) {
            this.inspectionEmail.value = userProfileData.email;
        }
    } catch (error) {
        console.error('加载巡检诊断用户信息失败:', error);
        // 如果获取失败，尝试使用原来的方法作为降级方案
    try {
        await this.populateUserProfileFromApi({
            userNameInput: this.inspectionUserName,
            emailInput: this.inspectionEmail
        });
        } catch (fallbackError) {
            console.error('降级方案也失败:', fallbackError);
    }
    }
    
    if (typeof this.switchInspectionTab === 'function') {
        this.switchInspectionTab('new');
    }
    
    // 绑定下载/更新按钮事件
    const downloadOrUpdateBtn = document.getElementById('downloadOrUpdateScriptCollectorBtn');
    if (downloadOrUpdateBtn) {
        downloadOrUpdateBtn.replaceWith(downloadOrUpdateBtn.cloneNode(true));
        const newDownloadOrUpdateBtn = document.getElementById('downloadOrUpdateScriptCollectorBtn');
        newDownloadOrUpdateBtn.addEventListener('click', () => this.showScriptCollectorOptions());
    }
    
    // 绑定下载按钮事件（动态卡片，事件委托）
    const downloadOptions = document.getElementById('pluginDownloadOptions');
    if (downloadOptions) {
        downloadOptions.onclick = (e) => {
            const btn = e.target.closest('.btn-download-plugin');
            if (btn && btn.dataset.os) {
                this.downloadPluginFile(btn.dataset.os);
            }
        };
    }
    
    // 打开弹框时检查用户版本并更新按钮状态
    this.checkScriptCollectorVersion(userProfileData);
    
    // 设置操作系统图标路径
    const linuxIcon = document.getElementById('linuxOsIcon');
    const windowsIcon = document.getElementById('windowsOsIcon');
    if (linuxIcon && typeof chrome !== 'undefined' && chrome.runtime) {
        linuxIcon.src = chrome.runtime.getURL('icons/linux.png');
    }
    if (windowsIcon && typeof chrome !== 'undefined' && chrome.runtime) {
        windowsIcon.src = chrome.runtime.getURL('icons/Windows.png');
    }
}

/**
 * 获取当前选择的脚本采集器编码
 */
function getSelectedScriptCollectorCode() {
    // 直接复用“新建诊断”下拉框的数据库 code
    const value = this.inspectionDatabaseType?.value || '2101';
    return (value || '').trim() || '2101';
}

/**
 * 加载脚本采集器编码下拉框（改为复用新建诊断下拉数据，且隐藏该下拉）
 */
async function loadScriptCollectorCodeOptions() {
    const select = document.getElementById('scriptCollectorCodeSelect');
    if (!select) return;
    
    // 从“新建诊断”下拉框复制选项与选中值，并隐藏脚本采集器的下拉
    const sourceSelect = this.inspectionDatabaseType;
    if (sourceSelect && sourceSelect.options) {
        select.innerHTML = '';
        Array.from(sourceSelect.options).forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.textContent;
            option.selected = opt.selected;
            select.appendChild(option);
        });
    }
    const container = select.closest('.script-collector-code-select');
    if (container) {
        container.style.display = 'none';
    } else {
        select.style.display = 'none';
    }
}

/**
 * 获取脚本采集器最新列表（一次接口返回全部 OS）
 * @param {string} code - 插件编码
 * @param {object} options - { force: boolean }
 * @returns {Promise<Array>}
 */
async function fetchLatestPluginsList(code = '2101', options = { force: false }, pluginType = 'db_check') {
    const cacheKey = code || 'default';
    this.latestPluginListCache = this.latestPluginListCache || {};
    
    if (!options.force && this.latestPluginListCache[cacheKey]) {
        return this.latestPluginListCache[cacheKey];
    }
    
    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }
        
        const url = '/api/plugin/getLatestPlugins';
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        
        const requestBody = {
            pluginId: 0,
            pluginName: '',
            pluginType: pluginType,
            code: code || '',
            version: '',
            md5: '',
            path: '',
            supportOs: ''
        };
        
        const result = await this.requestUtil.post(url, requestBody, {
            provider: tempProvider
        });
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            const parsed = result.data.map(item => ({
                plugin_id: item.plugin_id || item.pluginId || 0,
                plugin_name: item.plugin_name || item.pluginName || '',
                plugin_type: item.plugin_type || item.pluginType || '',
                code: item.code || '',
                version: item.version || '',
                md5: item.md5 || '',
                path: item.path || '',
                support_os: (item.support_os || item.supportOs || '').toLowerCase(),
                created_at: item.created_at || item.createdAt || '',
                updated_at: item.updated_at || item.updatedAt || '',
                createdAt: item.created_at || item.createdAt || '',
                updatedAt: item.updated_at || item.updatedAt || ''
            }));
            this.latestPluginListCache[cacheKey] = parsed;
            return parsed;
        }
        
        // 未知格式时返回空数组
        console.warn('获取脚本采集器列表返回非成功状态或数据为空', result);
        this.latestPluginListCache[cacheKey] = [];
        return [];
    } catch (error) {
        console.error('获取脚本采集器列表失败:', error);
        this.latestPluginListCache[cacheKey] = [];
        return [];
    }
}

/**
 * 检查脚本采集器版本并更新按钮状态
 * @param {Object} userProfileData - 已获取的用户信息（可选，避免重复调用接口）
 */
async function checkScriptCollectorVersion(userProfileData = null, options = {}) {
    const { preserveVisibility = false } = options || {};
    const statusDiv = document.getElementById('scriptCollectorStatus');
    const currentVersionDiv = document.getElementById('scriptCollectorCurrentVersion');
    const downloadOrUpdateBtn = document.getElementById('downloadOrUpdateScriptCollectorBtn');
    const downloadOptions = document.getElementById('pluginDownloadOptions');
    const keepCardsVisible = preserveVisibility && downloadOptions && (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block');
    
    try {
        // 获取用户信息（如果未传入，则调用接口获取）
        let userProfile = userProfileData;
        if (!userProfile) {
            userProfile = await this.getUserProfile();
        }
        const userPluginVersion = userProfile?.pluginversion || {};
        // 解析 pluginversion 对象
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'dbCheck');
        const hasAnyUserVersion = Boolean(
            userPluginVersions.windows ||
            userPluginVersions.linux ||
            (userPluginVersions.extras && Object.keys(userPluginVersions.extras).length)
        );

        // 检查pluginversion对象是否为空（没有dbCheck数据）
        const hasPluginVersionData = userPluginVersion && 
            (userPluginVersion.dbCheck && Array.isArray(userPluginVersion.dbCheck) && userPluginVersion.dbCheck.length > 0);

        // 如果没有版本号，标记状态但继续渲染卡片
        if (!hasPluginVersionData || !hasAnyUserVersion) {
            if (statusDiv) {
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status info';
                statusDiv.textContent = this.t('popup.inspection.form.notDownloaded', '监测到您还未下载过脚本采集器');
            }
            if (downloadOrUpdateBtn) {
                downloadOrUpdateBtn.textContent = this.t('popup.inspection.form.downloadScriptCollector', '下载脚本采集器');
            }
        }
        
        // 如果有版本号，获取远程版本信息进行比较
        try {
            const code = this.getSelectedScriptCollectorCode();
            const latestList = await this.fetchLatestPluginsList(code);
            
            // 缓存按操作系统的最新信息
            this.latestPluginInfoCache = {};
            latestList.forEach(item => {
                if (item.support_os) {
                    this.latestPluginInfoCache[item.support_os] = item;
                }
            });
            
            // 渲染动态下载卡片
            renderScriptCollectorCards.call(this, {
                latestList,
                userPluginVersions,
                show: keepCardsVisible
            });
            
            // 状态判定
            let hasUpdateNeeded = false;
            let hasUndownloadedOs = false;
            latestList.forEach(item => {
                const os = item.support_os;
                if (!os) return;
                const userVersion = (userPluginVersions[os] || userPluginVersions.extras?.[os] || '').trim();
                if (!userVersion) {
                    if (item.version) {
                        hasUndownloadedOs = true;
                    }
                    return;
                }
                if (item.version && userVersion !== item.version) {
                    hasUpdateNeeded = true;
                }
            });
            
            if (hasUndownloadedOs || hasUpdateNeeded) {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                    statusDiv.className = 'script-collector-status info';
                    statusDiv.textContent = this.t('popup.inspection.form.newVersionAvailable', '检测到新版本可用');
                }
                if (downloadOrUpdateBtn) {
                    downloadOrUpdateBtn.textContent = this.t('popup.inspection.form.updateScriptCollector', '更新脚本采集器');
                }
            } else if (latestList.length > 0) {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                    statusDiv.className = 'script-collector-status success';
                    statusDiv.textContent = this.t('popup.inspection.form.allVersionsLatest', '各版本插件采集器均是最新版本');
                }
                if (downloadOrUpdateBtn) {
                    downloadOrUpdateBtn.textContent = this.t('popup.inspection.form.updateScriptCollector', '更新脚本采集器');
                }
            }
        } catch (error) {
            console.error('获取远程版本信息失败:', error);
            // 即使获取失败，也不显示当前版本
            if (currentVersionDiv) {
                currentVersionDiv.style.display = 'none';
            }
            if (downloadOrUpdateBtn) {
                downloadOrUpdateBtn.textContent = this.t('popup.inspection.form.downloadScriptCollector', '下载脚本采集器');
            }
        }
    } catch (error) {
        console.error('检查脚本采集器版本失败:', error);
        // 出错时默认显示下载按钮
        if (downloadOrUpdateBtn) {
            downloadOrUpdateBtn.textContent = this.t('popup.inspection.form.downloadScriptCollector', '下载脚本采集器');
        }
    }
}

/**
 * 渲染脚本采集器卡片（根据接口返回动态生成）
 */
function renderScriptCollectorCards({ latestList = [], userPluginVersions = {}, show = false }) {
    const container = document.getElementById('pluginDownloadOptions');
    if (!container) return;
    
    if (!latestList.length) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '';

    // 定义国际化文本变量
    const unknownText = this.t('popup.inspection.form.unknown', '未知');

    latestList.forEach(item => {
        const os = item.support_os || 'unknown';
        const latestVersion = item.version || '';
        const userVersion = (userPluginVersions[os] || userPluginVersions.extras?.[os] || '').trim();
        const isDownloaded = !!userVersion;
        const needsUpdate = isDownloaded && latestVersion && userVersion !== latestVersion;
        
        const currentVersionText = isDownloaded
            ? (needsUpdate ? `${userVersion}（需更新）` : userVersion || this.t('popup.inspection.form.unknown', '未知'))
            : this.t('popup.inspection.form.notDownloadedShort', '未下载过');
        
        const card = document.createElement('div');
        card.className = 'plugin-download-item';
        card.innerHTML = `
            <div class="plugin-download-card">
                <div class="plugin-download-header">
                    <span class="plugin-os-name">${os.toUpperCase()}</span>
                    <span class="plugin-version">${latestVersion}</span>
                </div>
                <div class="plugin-download-info">
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.inspection.form.currentVersion', '当前版本：')}</span>
                        <span class="plugin-info-value">${currentVersionText}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.inspection.form.latestVersion', '最新版本：')}</span>
                        <span class="plugin-info-value">${latestVersion || unknownText}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.inspection.form.updateDate', '更新日期：')}</span>
                        <span class="plugin-info-value">${formatDateToYMD(item.updatedAt || item.updated_at || '')}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.inspection.form.md5', 'MD5：')}</span>
                        <span class="plugin-info-value">${item.md5 || ''}</span>
                    </div>
                </div>
                <button type="button" class="btn-download-plugin" data-os="${os}">
                    <span>${this.t('popup.inspection.form.download', '下载')}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    container.style.display = show ? 'flex' : 'none';
}

/**
 * 显示下载选项容器（带动画效果）
 * @param {HTMLElement} downloadOptions - 下载选项容器元素
 */
function showDownloadOptionsWithAnimation(downloadOptions) {
    if (!downloadOptions) return;
    downloadOptions.style.display = 'flex';
    // 移除之前的动画类，以便重新触发动画
    downloadOptions.classList.remove('show');
    // 重置子元素的动画状态
    const items = downloadOptions.querySelectorAll('.plugin-download-item');
    items.forEach(item => {
        item.style.animation = 'none';
        // 强制重排，然后重新应用动画
        void item.offsetWidth;
        item.style.animation = '';
    });
    // 使用 requestAnimationFrame 确保 DOM 更新后再添加动画类
    requestAnimationFrame(() => {
        downloadOptions.classList.add('show');
    });
}

/**
 * 隐藏下载选项容器
 * @param {HTMLElement} downloadOptions - 下载选项容器元素
 */
function hideDownloadOptions(downloadOptions) {
    if (!downloadOptions) return;
    downloadOptions.classList.remove('show');
    // 等待动画完成后再隐藏
    setTimeout(() => {
        downloadOptions.style.display = 'none';
    }, 400);
}

/**
 * 显示脚本采集器选项（点击下载/更新按钮后）
 */
async function showScriptCollectorOptions() {
    const downloadOptions = document.getElementById('pluginDownloadOptions');
    const statusDiv = document.getElementById('scriptCollectorStatus');
    
    if (!downloadOptions) {
        console.error('未找到下载选项元素 pluginDownloadOptions');
        return;
    }
    
    // 如果已经显示，则隐藏；否则显示
    if (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block') {
        hideDownloadOptions(downloadOptions);
        return;
    }
    
    try {
        // 显示加载状态
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.className = 'script-collector-status loading';
            statusDiv.textContent = this.t('popup.inspection.form.loadingScriptCollector', '正在加载脚本采集器信息...');
        }
        
        // 获取用户当前版本
        const userProfile = await this.getUserProfile();
        const userPluginVersion = userProfile?.pluginversion || {};
        // 解析 pluginversion 对象
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'dbCheck');
        
        const code = this.getSelectedScriptCollectorCode();
        const latestList = await this.fetchLatestPluginsList(code);
        // 通过单次接口结果拆分 OS
        const windowsLatestInfo = latestList.find(item => item.support_os === 'windows') || { version: '', md5: '', path: '', updatedAt: '', plugin_id: '' };
        const linuxLatestInfo = latestList.find(item => item.support_os === 'linux') || { version: '', md5: '', path: '', updatedAt: '', plugin_id: '' };
        
        console.log('Linux最新版本信息:', linuxLatestInfo);
        console.log('Windows最新版本信息:', windowsLatestInfo);
        
        // 更新Linux信息
        const linuxVersionEl = document.getElementById('linuxPluginVersion');
        const linuxLatestVersionEl = document.getElementById('linuxLatestVersion');
        const linuxCurrentVersionEl = document.getElementById('linuxCurrentVersion');
        const linuxUpdateDateEl = document.getElementById('linuxPluginUpdateDate');
        const linuxPathEl = document.getElementById('linuxPluginPath');
        
        const linuxLatestVersion = linuxLatestInfo?.version || '';
        
        // 从 profile 数据判断用户是否下载过（有版本号就表示下载过）
        const linuxUserVersion = userPluginVersions.linux || '';
        const linuxIsDownloaded = !!linuxUserVersion;
        const linuxNeedsUpdate = linuxIsDownloaded && linuxUserVersion && linuxLatestVersion && linuxUserVersion !== linuxLatestVersion;
        
        // 计算当前版本（用于右上角显示）
        let linuxCurrentVersionDisplay = '';
        if (linuxIsDownloaded) {
            // 如果已下载，优先使用用户版本，如果没有则使用最新版本
            linuxCurrentVersionDisplay = linuxUserVersion || linuxLatestVersion || '';
        }
        
        // 设置右上角版本号（与当前版本一致）
        if (linuxVersionEl) {
            if (linuxCurrentVersionDisplay) {
                linuxVersionEl.textContent = linuxCurrentVersionDisplay;
            } else {
                linuxVersionEl.textContent = '未下载';
            }
        }
        
        if (linuxLatestVersionEl) linuxLatestVersionEl.textContent = linuxLatestVersion || this.t('popup.inspection.form.unknown', '未知');
        
        if (linuxCurrentVersionEl) {
            const currentVersionItem = linuxCurrentVersionEl.closest('.plugin-info-item');
            if (currentVersionItem) {
                currentVersionItem.style.display = 'flex';
                if (linuxIsDownloaded) {
                    // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                    const currentVersion = linuxUserVersion || linuxLatestVersion;
                    if (currentVersion) {
                        if (linuxUserVersion && linuxUserVersion === linuxLatestVersion) {
                            linuxCurrentVersionEl.textContent = linuxUserVersion;
                            linuxCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                        } else if (linuxUserVersion && linuxUserVersion !== linuxLatestVersion) {
                            linuxCurrentVersionEl.textContent = `${linuxUserVersion}（需更新）`;
                            linuxCurrentVersionEl.className = 'plugin-info-value version-current version-outdated';
                        } else {
                            // 用户版本为空，但已下载，使用最新版本
                            linuxCurrentVersionEl.textContent = linuxLatestVersion || this.t('popup.inspection.form.unknown', '未知');
                            linuxCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                        }
                    } else {
                        linuxCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                        linuxCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                    }
                } else {
                    linuxCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                    linuxCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                }
            }
        }
        // 标记最新版本是否需要更新
        if (linuxLatestVersionEl) {
            linuxLatestVersionEl.className = linuxNeedsUpdate 
                ? 'plugin-info-value version-latest version-new' 
                : 'plugin-info-value version-latest';
        }
        if (linuxUpdateDateEl) linuxUpdateDateEl.textContent = formatDateToYMD(linuxLatestInfo?.updatedAt || '');
        if (linuxPathEl) linuxPathEl.textContent = linuxLatestInfo?.path || this.t('popup.inspection.form.unknown', '未知');
        
        // 更新Windows信息
        const windowsVersionEl = document.getElementById('windowsPluginVersion');
        const windowsLatestVersionEl = document.getElementById('windowsLatestVersion');
        const windowsCurrentVersionEl = document.getElementById('windowsCurrentVersion');
        const windowsUpdateDateEl = document.getElementById('windowsPluginUpdateDate');
        const windowsPathEl = document.getElementById('windowsPluginPath');
        
        const windowsLatestVersion = windowsLatestInfo?.version || '';
        
        // 从 profile 数据判断用户是否下载过（有版本号就表示下载过）
        const windowsUserVersion = userPluginVersions.windows || '';
        const windowsIsDownloaded = !!windowsUserVersion;
        const windowsNeedsUpdate = windowsIsDownloaded && windowsUserVersion && windowsLatestVersion && windowsUserVersion !== windowsLatestVersion;
        
        // 计算当前版本（用于右上角显示）
        let windowsCurrentVersionDisplay = '';
        if (windowsIsDownloaded) {
            // 如果已下载，优先使用用户版本，如果没有则使用最新版本
            windowsCurrentVersionDisplay = windowsUserVersion || windowsLatestVersion || '';
        }
        
        // 设置右上角版本号（与当前版本一致）
        if (windowsVersionEl) {
            if (windowsCurrentVersionDisplay) {
                windowsVersionEl.textContent = windowsCurrentVersionDisplay;
            } else {
                windowsVersionEl.textContent = '未下载';
            }
        }
        
        if (windowsLatestVersionEl) windowsLatestVersionEl.textContent = windowsLatestVersion || this.t('popup.inspection.form.unknown', '未知');
        
        if (windowsCurrentVersionEl) {
            const currentVersionItem = windowsCurrentVersionEl.closest('.plugin-info-item');
            if (currentVersionItem) {
                currentVersionItem.style.display = 'flex';
                if (windowsIsDownloaded) {
                    // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                    const currentVersion = windowsUserVersion || windowsLatestVersion;
                    if (currentVersion) {
                        if (windowsUserVersion && windowsUserVersion === windowsLatestVersion) {
                            windowsCurrentVersionEl.textContent = windowsUserVersion;
                            windowsCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                        } else if (windowsUserVersion && windowsUserVersion !== windowsLatestVersion) {
                            windowsCurrentVersionEl.textContent = `${windowsUserVersion}（需更新）`;
                            windowsCurrentVersionEl.className = 'plugin-info-value version-current version-outdated';
                        } else {
                            // 用户版本为空，但已下载，使用最新版本
                            windowsCurrentVersionEl.textContent = windowsLatestVersion || this.t('popup.inspection.form.unknown', '未知');
                            windowsCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                        }
                    } else {
                        windowsCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                        windowsCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                    }
                } else {
                    windowsCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                    windowsCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                }
            }
        }
        // 标记最新版本是否需要更新
        if (windowsLatestVersionEl) {
            windowsLatestVersionEl.className = windowsNeedsUpdate 
                ? 'plugin-info-value version-latest version-new' 
                : 'plugin-info-value version-latest';
        }
        if (windowsUpdateDateEl) windowsUpdateDateEl.textContent = formatDateToYMD(windowsLatestInfo?.updatedAt || '');
        if (windowsPathEl) windowsPathEl.textContent = windowsLatestInfo?.path || this.t('popup.inspection.form.unknown', '未知');
        
        // 存储插件信息供下载使用
        downloadOptions.setAttribute('data-linux-plugin-id', linuxLatestInfo?.plugin_id || '');
        downloadOptions.setAttribute('data-windows-plugin-id', windowsLatestInfo?.plugin_id || '');
        downloadOptions.setAttribute('data-linux-info', JSON.stringify(linuxLatestInfo));
        downloadOptions.setAttribute('data-windows-info', JSON.stringify(windowsLatestInfo));
        
        // 显示下载选项（带动画效果）
        showDownloadOptionsWithAnimation(downloadOptions);
        
        // 隐藏加载状态
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
        
    } catch (error) {
        console.error('加载脚本采集器选项失败:', error);
        
        if (statusDiv) {
            statusDiv.className = 'script-collector-status error';
            statusDiv.textContent = `${this.t('popup.inspection.form.loadFailed', '加载失败')}: ${error.message || this.t('popup.common.unknownError')}`;
        }
        
        // 即使出错，也尝试显示下载选项
        showDownloadOptionsWithAnimation(downloadOptions);
    }
}

function hideInspectionDialog() {
    // 清理日期时间过滤器的事件监听器
    this.cleanupDateTimeFilters();

    // 关闭日期选择器
    this.closeDateTimePicker();

    if (!this.inspectionDialog) return;
    this.inspectionDialog.style.display = 'none';
    if (this.inspectionSaveBtn) {
        this.inspectionSaveBtn.disabled = false;
        this.inspectionSaveBtn.textContent = this.t('popup.inspection.form.submit');
    }
    // 移除数据库类型选择事件监听器
    if (this.inspectionDatabaseType && this._inspectionDatabaseTypeChangeHandler) {
        this.inspectionDatabaseType.removeEventListener('change', this._inspectionDatabaseTypeChangeHandler);
        this._inspectionDatabaseTypeChangeHandler = null;
    }
    // 隐藏描述信息
    const descriptionElement = document.getElementById('inspectionDatabaseDescription');
    if (descriptionElement) {
        descriptionElement.style.display = 'none';
    }
    this.resetInspectionForm();
}

/**
 * 从API加载巡检诊断数据库类型选项
 */
async function loadInspectionDatabaseTypes() {
    const select = this.inspectionDatabaseType;
    if (!select) return;

    try {
        // 使用知识库管理器的方法，传递 'inspection' 类型参数
        const apiResult = await this.loadKnowledgeBasesFromAPI('inspection');
        
        if (apiResult.success && apiResult.data && apiResult.data.length > 0) {
            // 存储知识库数据以便后续使用
            this.inspectionKnowledgeBases = apiResult.data;

            // 清空现有选项（保留占位符选项）
            const placeholderOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (placeholderOption) {
                select.appendChild(placeholderOption);
            } else {
                // 如果没有占位符，创建一个
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = this.t('popup.inspection.form.databasePlaceholder');
                select.appendChild(defaultOption);
            }

            // 添加从API获取的选项
            apiResult.data.forEach(kb => {
                const option = document.createElement('option');
                option.value = kb.id || kb.code;
                // 使用本地化名称
                const localizedName = this.formatKnowledgeBaseName(kb.name);
                option.textContent = localizedName || kb.name;
                select.appendChild(option);
            });

            // 默认选中第一项（排除占位符）
            if (apiResult.data.length > 0) {
                const firstDataItem = apiResult.data[0];
                const firstValue = firstDataItem.id || firstDataItem.code;
                if (firstValue) {
                    select.value = firstValue;
                    // 当有默认选中值时，启用下载按钮
                    const downloadBtn = document.getElementById('inspectionDownloadClientBtn');
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                    }
                }
            }

            // 绑定数据库类型选择变化事件
            this.bindInspectionDatabaseTypeChange();

            // 初始化显示当前选中数据库类型的描述
            this.updateInspectionDatabaseDescription();
            
            // 初始化显示脚本采集器下载地址
            this.updateInspectionScriptCollectorDownloadLinks();

            console.log(`成功加载 ${apiResult.data.length} 个巡检诊断数据库类型选项`);
        } else {
            console.warn('从API加载巡检诊断数据库类型失败');
        }
    } catch (error) {
        console.error('加载巡检诊断数据库类型失败:', error);
    }
}

function resetInspectionForm() {
    if (this.inspectionEmail) {
        this.inspectionEmail.value = this.inspectionEmail.value || '';
    }
    if (this.inspectionFileDisplay) {
        this.inspectionFileDisplay.value = '';
        this.inspectionFileDisplay.placeholder = this.t('popup.inspection.form.uploadPlaceholder');
    }
    if (this.inspectionFileInput) {
        this.inspectionFileInput.value = '';
    }
    if (this.inspectionLanguage) {
        this.inspectionLanguage.value = 'zh';
    }
    if (this.inspectionDatabaseType) {
        this.inspectionDatabaseType.value = '';
    }
    if (this.inspectionAgreeTerms) {
        this.inspectionAgreeTerms.checked = false;
    }
    this.inspectionSelectedFile = null;
}

function handleInspectionFileSelect(e) {
    const file = e?.target?.files?.[0];
    if (file) {
        this.inspectionSelectedFile = file;
        if (this.inspectionFileDisplay) {
            this.inspectionFileDisplay.value = file.name;
            this.inspectionFileDisplay.placeholder = file.name;
        }
    } else {
        this.inspectionSelectedFile = null;
        if (this.inspectionFileDisplay) {
            this.inspectionFileDisplay.value = '';
            this.inspectionFileDisplay.placeholder = this.t('popup.inspection.form.uploadPlaceholder');
        }
    }
}

async function handleInspectionSubmit() {
    if (!this.inspectionSaveBtn || this.inspectionSaveBtn.disabled) {
        return;
    }

    const email = this.inspectionEmail?.value.trim() || '';
    if (!email) {
        this.showMessage(this.t('popup.message.enterEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.inspectionEmail?.focus();
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        this.showMessage(this.t('popup.message.invalidEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.inspectionEmail?.focus();
        return;
    }

    if (!this.inspectionSelectedFile) {
        this.showMessage(this.t('popup.message.selectFile'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.inspectionFileUploadBtn?.focus();
        return;
    }

    const databaseCode = this.inspectionDatabaseType?.value || '';
    if (!databaseCode) {
        this.showMessage(this.t('popup.message.selectDatabaseType'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.inspectionDatabaseType?.focus();
        return;
    }

    if (!this.inspectionAgreeTerms || !this.inspectionAgreeTerms.checked) {
        this.showMessage(this.t('popup.message.agreeTerms'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.inspectionAgreeTerms?.focus();
        return;
    }

    const originalButtonText = this.inspectionSaveBtn.textContent || '';
    this.inspectionSaveBtn.disabled = true;

    const formData = {
        username: this.inspectionUserName?.value.trim() || '',
        email,
        file: this.inspectionSelectedFile,
        language: this.inspectionLanguage?.value || 'zh',
        databaseCode
    };

    this.showLoadingOverlay(this.t('popup.inspection.loading'));
    try {
        const response = await this.submitInspectionAnalysis(formData);
        this.hideLoadingOverlay();

        if (response && response.status === 'success') {
            if (this.inspectionHistoryView?.classList.contains('active')) {
                const startTime = this.getDateTimeInputValue('inspectionStartTime');
                const endTime = this.getDateTimeInputValue('inspectionEndTime');
                const status = document.getElementById('inspectionStatusFilter')?.value || '';
                this.loadInspectionHistoryList(this.inspectionHistoryCurrentPage, this.inspectionHistoryPageSize, '', startTime, endTime, status);
            }
            
            // 根据环境类型显示不同的成功消息
            const envType = await this.getEnvType();
            const successMessage = envType === 'in_env' 
                ? this.t('popup.message.inspectionSubmitSuccessInEnv')
                : this.t('popup.message.inspectionSubmitSuccess');
            
            this.showMessage(successMessage, 'success', { centered: true, durationMs: 6000, maxWidth: '380px', background: '#1e7e34' });
            this.hideInspectionDialog();
        } else {
            const errorMsg = response?.message || this.t('popup.message.inspectionSubmitFailed', { error: this.t('popup.common.unknownError') });
            this.showMessage(errorMsg, 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        }
    } catch (error) {
        console.error('提交巡检诊断失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.inspectionSubmitFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
    } finally {
        this.inspectionSaveBtn.disabled = false;
        this.inspectionSaveBtn.textContent = originalButtonText || this.t('popup.inspection.form.submit');
    }
}

async function submitInspectionAnalysis(formData) {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
        throw new Error(this.t('popup.message.apiKeyNotConfigured'));
    }

    // 获取当前选择的模型信息（仅在内网环境下）
    let modelParams = null;
    try {
        // 检查环境类型，只有内网环境才传递 modelParams
        const envType = await this.getEnvType();
        console.log('巡检诊断 - 当前环境类型:', envType);
        
        if (envType === 'in_env') {
            const selectedModelValue = this.modelSelect?.value;
            if (selectedModelValue) {
                // 解析选中的模型（模型名 + 服务商）
                let selectedKey;
                try {
                    selectedKey = JSON.parse(selectedModelValue);
                } catch (_) {
                    selectedKey = { name: selectedModelValue };
                }

                // 获取选中的模型和服务商
                const selectedModel = this.models.find(m => m.name === selectedKey.name && (!selectedKey.provider || m.provider === selectedKey.provider));
                const provider = selectedModel ? this.providers.find(p => p.name === selectedModel.provider) : null;

                if (selectedModel && provider) {
                    modelParams = {
                        modelName: selectedModel.displayName || selectedModel.name,
                        apiEndpoint: provider.apiEndpoint || ''
                    };
                    console.log('巡检诊断 - 模型参数:', modelParams);
                } else {
                    console.warn('巡检诊断 - 未找到选中的模型或服务商:', { selectedModelValue, selectedKey, selectedModel: !!selectedModel, provider: !!provider });
                }
            } else {
                console.warn('巡检诊断 - 未选择模型，modelSelect.value 为空');
            }
        } else {
            console.log('巡检诊断 - 外网环境，不传递 modelParams');
        }
    } catch (error) {
        console.warn('获取模型参数失败，继续执行巡检诊断:', error);
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', formData.file);

    const queryParams = new URLSearchParams();
    queryParams.append('username', formData.username);
    queryParams.append('email', formData.email);
    queryParams.append('language', formData.language || 'zh');
    queryParams.append('diagnosisType', 'db_check');
    if (formData.databaseCode) {
        queryParams.append('code', formData.databaseCode);
    }
    // 添加 modelParams 参数（JSON格式）- 仅在内网环境下
    if (modelParams) {
        queryParams.append('modelParams', JSON.stringify(modelParams));
        console.log('巡检诊断 - 已添加 modelParams 到查询参数');
    } else {
        console.log('巡检诊断 - modelParams 为空，未添加到查询参数');
    }

    const url = `/api/diagnosis/upload?${queryParams.toString()}`;

    try {
        // 使用请求工具
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        const result = await this.requestUtil.upload(url, formDataToSend, {
            provider: tempProvider
        });
        return result;
    } catch (error) {
        console.error('巡检诊断接口调用失败:', error);
        throw error;
    }
}

function switchInspectionTab(tabName) {
    if (this.inspectionTabs && this.inspectionTabs.length > 0) {
        this.inspectionTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    }

    if (this.inspectionNewView) {
        this.inspectionNewView.classList.toggle('active', tabName === 'new');
    }
    if (this.inspectionHistoryView) {
        this.inspectionHistoryView.classList.toggle('active', tabName === 'history');
    }

    if (tabName === 'history') {
        // 延迟执行以确保DOM完全渲染
        setTimeout(() => {
            const historyView = document.getElementById('inspectionHistoryView');
            if (historyView) {
                // 强制清理之前的设置，确保干净的状态
                this.cleanupDateTimeFilters();
                // 重新初始化
                this.setupDateTimeFilters(true, historyView);
                console.log('巡检诊断日期时间过滤器初始化完成');
            } else {
                console.error('找不到inspectionHistoryView元素');
            }
        }, 100);

        // 重置时间过滤器
        this.clearDateTimeInputValue('inspectionStartTime');
        this.clearDateTimeInputValue('inspectionEndTime');

        const startTime = '';
        const endTime = '';
        const status = document.getElementById('inspectionStatusFilter')?.value || '';
        this.loadInspectionHistoryList(1, this.inspectionHistoryPageSize, '', startTime, endTime, status);
    }
}

function handleInspectionSearch() {
    const startTime = this.getDateTimeInputValue('inspectionStartTime');
    const endTime = this.getDateTimeInputValue('inspectionEndTime');
    const status = document.getElementById('inspectionStatusFilter')?.value || '';
    this.loadInspectionHistoryList(1, this.inspectionHistoryPageSize, '', startTime, endTime, status);
}

function handleInspectionReset() {
    const statusSelect = document.getElementById('inspectionStatusFilter');
    this.clearDateTimeInputValue('inspectionStartTime');
    this.clearDateTimeInputValue('inspectionEndTime');
    if (statusSelect) statusSelect.value = '';
    this.loadInspectionHistoryList(1, this.inspectionHistoryPageSize, '', '', '', '');
}

async function loadInspectionHistoryList(page = 1, pageSize = 10, keyword = '', startTime = '', endTime = '', status = '') {
    try {
        // 确保知识库列表已经加载完成
        if (!this.knowledgeBases) {
            const apiResult = await this.loadKnowledgeBasesFromAPI('inspection');
            if (apiResult.success && apiResult.data) {
                this.knowledgeBases = apiResult.data;
            }
        }
        
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            this.showMessage(this.t('popup.message.apiKeyNotConfigured'), 'error');
            return;
        }

        let username = this.inspectionUserName?.value.trim() || '';

        if (!username) {
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                if (registration && registration.status === 'registered' && registration.username) {
                    username = registration.username;
                    if (this.inspectionUserName) {
                        this.inspectionUserName.value = username;
                    }
                }
            } catch (error) {
                console.error('获取注册信息失败:', error);
            }
        }

        if (!username) {
            try {
                await this.populateUserProfileFromApi({
                    userNameInput: this.inspectionUserName,
                    emailInput: this.inspectionEmail
                });
                username = this.inspectionUserName?.value.trim() || '';
            } catch (error) {
                console.error('从API获取用户信息失败:', error);
            }
        }

        if (!username || username === '-') {
            this.showMessage(this.t('popup.message.fetchUserInfoFailed'), 'error');
            return;
        }

        const requestBody = {
            pageNum: page,
            pageSize,
            username,
            diagnosisType: 'db_check'
        };

        if (status !== '') {
            requestBody.status = parseInt(status, 10);
        }

        if (startTime) {
            const startDateTime = this.parseISODateTime(startTime);
            if (startDateTime) {
                requestBody.startTime = formatDateTime(startDateTime);
            }
        }

        if (endTime) {
            const endDateTime = this.parseISODateTime(endTime);
            if (endDateTime) {
                endDateTime.setHours(23, 59, 59, 999);
                requestBody.endTime = formatDateTime(endDateTime);
            }
        }

        const url = '/api/diagnosis/list';
        
        this.showLoadingOverlay(this.t('popup.inspection.history.loadingHistory'));

        // 使用请求工具
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        const result = await this.requestUtil.post(url, requestBody, {
            provider: tempProvider
        });

        if (result.status === 'success' || result.status === '200' || result.data) {
            const data = result.data || {};
            const list = data.list || [];

            // 调试：打印第一个item的所有字段，帮助确定文件名字段
            if (list.length > 0) {
                console.log('巡检历史列表接口返回的数据示例（第一个item的所有字段）:', list[0]);
                console.log('可用字段列表:', Object.keys(list[0]));
            }

            try {
                await this.i18n.ensureLanguage(this.currentLanguage);
            } catch (ensureError) {
                console.warn('加载巡检历史记录时语言包未准备就绪:', ensureError);
            }

            this.inspectionHistoryList = list.map(item => {
                const parsedCreateTime = typeof this.parseDateTime === 'function'
                    ? this.parseDateTime(item.createdAt)
                    : item.createdAt;
                
                // 尝试多个可能的文件名字段（按优先级顺序）
                // 优先尝试诊断相关的字段名
                let fileName = item.inspectionFilename 
                    || item.inspectionFileName
                    || item.inspection_file_name
                    || item.inspection_filename
                    // 然后是通用的字段名（最常见）
                    || item.filename 
                    || item.fileName 
                    || item.file_name 
                    // 然后是原始文件名
                    || item.originalFilename 
                    || item.originalFileName 
                    || item.original_filename
                    // 最后尝试 AWR 相关的字段名（可能共用接口）
                    || item.awrFilename
                    || item.awrFileName
                    || item.awr_file_name
                    || item.awr_filename
                    || '';
                
                // 如果还是没有找到文件名，尝试从 fileUrl 中提取文件名
                if (!fileName) {
                    const fileUrl = item.inspectionFileurl || item.awrFileurl || item.fileUrl || item.file_url || '';
                    if (fileUrl) {
                        // 从 URL 中提取文件名
                        try {
                            const urlParts = fileUrl.split('/');
                            fileName = urlParts[urlParts.length - 1] || '';
                            // 如果文件名包含查询参数，移除它
                            if (fileName.includes('?')) {
                                fileName = fileName.split('?')[0];
                            }
                        } catch (e) {
                            console.warn('从文件URL提取文件名失败:', e);
                        }
                    }
                }
                
                // 调试：如果第一个item没有文件名，打印详细信息
                if (list.indexOf(item) === 0 && !fileName) {
                    console.warn('⚠️ 巡检历史记录中未找到文件名字段！');
                    console.warn('Item 的所有字段:', Object.keys(item));
                    console.warn('Item 的完整数据:', item);
                }
                
                // 尝试多个可能的数据库类型字段（按优先级顺序）
                // 与AWR保持一致，优先尝试 code 字段（接口返回的数据库类型标识）
                let databaseType = item.code
                    || item.databaseType 
                    || item.dbType 
                    || item.database_type 
                    || item.db_type 
                    || item.inspectionType 
                    || item.inspection_type 
                    || item.type 
                    || '';
                
                // 调试：打印第一个item的数据库类型字段，帮助确定字段名
                if (list.indexOf(item) === 0) {
                    console.log('巡检历史记录 - 数据库类型字段调试:', {
                        'item.code': item.code,
                        'item.databaseType': item.databaseType,
                        'item.dbType': item.dbType,
                        'item.database_type': item.database_type,
                        'item.db_type': item.db_type,
                        'item.inspectionType': item.inspectionType,
                        'item.inspection_type': item.inspection_type,
                        'item.type': item.type,
                        '最终databaseType': databaseType,
                        '所有字段': Object.keys(item)
                    });
                }
                
                return {
                    id: item.id,
                    email: item.email || '',
                    language: item.language || 'zh',
                    problemDescription: item.backgroundHint || '',
                    fileName: fileName,
                    databaseType: databaseType,
                    status: convertStatusNumberToString(item.status),
                    notifyStatus: item.notifyStatus || 'unknown',
                    createTime: parsedCreateTime,
                    reportUrl: item.reportFileurl || null,
                    username: item.username || '',
                    fileUrl: item.inspectionFileurl || item.awrFileurl || null
                };
            });

            this.inspectionHistoryTotal = data.total || 0;
            this.inspectionHistoryCurrentPage = data.pageNum || page;
            this.inspectionHistoryPageSize = data.pageSize || pageSize;

            await this.renderInspectionHistoryList();
            this.updateInspectionPagination();
        } else {
            throw new Error(result.message || this.t('popup.inspection.history.loadFailedFallback'));
        }

        this.hideLoadingOverlay();
    } catch (error) {
        console.error('加载巡检历史记录失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.inspectionLoadHistoryFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error');
        this.inspectionHistoryList = [];
        this.inspectionHistoryTotal = 0;
        this.inspectionHistoryCurrentPage = 1;
        await this.renderInspectionHistoryList();
        this.updateInspectionPagination();
    }
}

async function renderInspectionHistoryList() {
    const tbody = document.getElementById('inspectionHistoryList');
    const table = document.getElementById('inspectionHistoryTable');
    if (!tbody || !table) return;

    if (!this.inspectionHistoryList || this.inspectionHistoryList.length === 0) {
        tbody.innerHTML = '';
        const tableContainer = table.closest('.awr-history-table-container');
        if (tableContainer) {
            table.style.display = 'none';
            let emptyDiv = tableContainer.querySelector('.empty-history');
            if (!emptyDiv) {
                emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-history';
                tableContainer.appendChild(emptyDiv);
            }
            const emptyTitle = this.t('popup.inspection.history.emptyTitle');
            const emptySubtitle = this.t('popup.inspection.history.emptySubtitle');
            emptyDiv.innerHTML = `
                <div class="empty-history-icon">📝</div>
                <div class="empty-history-text">${escapeHtml(emptyTitle)}</div>
                <div class="empty-history-subtext">${escapeHtml(emptySubtitle)}</div>
            `;
            emptyDiv.style.display = 'block';
        }
        return;
    }

    table.style.display = 'table';
    const tableContainer = table.closest('.awr-history-table-container');
    if (tableContainer) {
        const emptyDiv = tableContainer.querySelector('.empty-history');
        if (emptyDiv) {
            emptyDiv.style.display = 'none';
        }
    }

    tbody.innerHTML = '';
    // 使用 Promise.all 处理异步创建行
    const rows = await Promise.all(this.inspectionHistoryList.map(item => this.createInspectionHistoryTableRow(item)));
    rows.forEach(row => tbody.appendChild(row));
    
    // 根据环境类型控制表头邮箱列的显示
    const envType = await this.getEnvType();
    const isInEnv = envType === 'in_env';
    const emailHeader = table.querySelector('thead th[data-i18n="popup.inspection.table.email"]');
    if (emailHeader) {
        emailHeader.style.display = isInEnv ? 'none' : '';
    }
    
    // 检查是否有 running 状态的任务，如果有则显示通知覆盖层
    const hasRunningTask = this.inspectionHistoryList.some(item => item.status === 'running');
    if (hasRunningTask) {
        this.showLoadingOverlay(this.t('popup.inspection.history.overlayAnalyzing', '正在执行诊断，请稍候...'));
    }
}

async function createInspectionHistoryTableRow(item) {
    const tr = document.createElement('tr');
    tr.className = 'awr-history-row';

    const locale = this.i18n?.getIntlLocale(this.currentLanguage);
    let createTime = this.t('popup.inspection.history.unknown');
    if (item.createTime) {
        try {
            const date = new Date(item.createTime);
            if (!Number.isNaN(date.getTime())) {
                createTime = date.toLocaleString(locale);
            }
        } catch (error) {
            console.error('巡检历史记录日期解析失败:', error);
        }
    }

    const statusText = this.getInspectionStatusText(item.status);
    const statusClass = this.getInspectionStatusClass(item.status);
    const notifyStatusText = this.getInspectionNotifyStatusText(item.notifyStatus);
    const notifyStatusClass = this.getInspectionNotifyStatusClass(item.notifyStatus);

    // 检查环境类型，内网环境下隐藏重发邮件按钮
    const envType = await this.getEnvType();
    const isInEnv = envType === 'in_env';

    const isResendDisabled = item.status !== 'success';
    const resendDisabledAttr = isResendDisabled ? 'disabled' : '';
    const resendDisabledClass = isResendDisabled ? 'disabled' : '';
    const resendTitle = isResendDisabled
        ? this.t('popup.inspection.history.resendDisabledTooltip')
        : this.t('popup.inspection.history.resendTooltip');

    const problemDesc = item.problemDescription || '';
    const problemPreview = problemDesc.length > 30 ? `${problemDesc.substring(0, 30)}...` : problemDesc;

    const fileName = item.fileName || '';
    const fileNamePreview = fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName;

    const noFileText = this.t('popup.inspection.history.notSpecified');
    const unknownText = this.t('popup.inspection.history.unknown');
    const languageKeyMap = {
        zh: 'popup.inspection.history.language.zh',
        en: 'popup.inspection.history.language.en'
    };
    const languageCode = typeof item.language === 'string' ? item.language.toLowerCase() : '';
    const languageKey = languageKeyMap[languageCode] || 'popup.inspection.history.language.unknown';
    const languageText = this.t(languageKey);
    const resendButtonLabel = this.t('popup.inspection.history.resendButton');
    const downloadButtonLabel = this.t('popup.inspection.history.downloadButton') || '下载';
    const downloadTitle = this.t('popup.inspection.history.downloadTooltip') || '下载报告';
    
    // 只有状态为成功时才显示下载按钮
    const canDownload = item.status === 'success';
    const downloadButtonHtml = canDownload 
        ? `<button class="awr-action-btn inspection-download-btn" data-id="${escapeHtml(String(item.id ?? ''))}" title="${escapeHtml(downloadTitle)}">
            ${escapeHtml(downloadButtonLabel)}
        </button>`
        : '';
    
    // 内网环境下隐藏重发邮件按钮
    const resendButtonHtml = isInEnv ? '' : `<button class="awr-action-btn inspection-resend-btn ${resendDisabledClass}" data-id="${escapeHtml(String(item.id ?? ''))}" title="${escapeHtml(resendTitle)}" ${resendDisabledAttr}>
        ${escapeHtml(resendButtonLabel)}
    </button>`;
    
    // 内网环境下隐藏邮箱列
    const emailCellHtml = isInEnv ? '' : `<td class="awr-table-cell-email copyable-cell" data-full-text="${escapeHtml(item.email || unknownText)}" title="${escapeHtml(item.email || unknownText)}">${escapeHtml(item.email || unknownText)}</td>`;

    // 根据数据库类型code获取对应的名称
    // 优先使用code字段，其次使用databaseType字段
    let typeText = item.code || item.databaseType;
    if (typeText && Array.isArray(this.knowledgeBases)) {
        const kb = this.knowledgeBases.find(kb => {
            // 同时匹配 code 和 id，支持字符串和数字类型
            const kbCode = String(kb.code || '');
            const kbId = String(kb.id || '');
            const itemType = String(typeText || '');
            return kbCode === itemType || kbId === itemType;
        });
        if (kb && kb.name) {
            // 使用本地化名称格式化，与AWR保持一致
            typeText = this.formatKnowledgeBaseName(kb.name) || kb.name;
        } else {
            // 如果找不到匹配的知识库，显示"无"
            const originalType = typeText; // 保存原始值用于调试
            typeText = this.t('popup.inspection.history.none');
            // 调试：如果找不到匹配的知识库，打印调试信息
            console.warn('巡检历史记录 - 未找到匹配的知识库:', {
                'code': item.code,
                'databaseType': item.databaseType,
                'usedType': originalType,
                'knowledgeBases数量': this.knowledgeBases.length,
                'knowledgeBases示例': this.knowledgeBases.slice(0, 3).map(kb => ({ code: kb.code, id: kb.id, name: kb.name }))
            });
        }
    } else {
        // 如果没有 code 或 databaseType 或知识库列表为空，显示"无"
        typeText = this.t('popup.inspection.history.none');
    }
    
    tr.innerHTML = `
        <td class="awr-table-cell-filename copyable-cell" data-full-text="${escapeHtml(fileName || noFileText)}" title="${escapeHtml(fileName || noFileText)}">${escapeHtml(fileNamePreview || noFileText)}</td>
        <td class="awr-table-cell-type">${escapeHtml(typeText)}</td>
        <td class="awr-table-cell-time">${escapeHtml(createTime)}</td>
        <td class="awr-table-cell-problem copyable-cell" data-full-text="${escapeHtml(problemDesc || '-')}" title="${escapeHtml(problemDesc || '-')}">${escapeHtml(problemPreview || '-')}</td>
        ${emailCellHtml}
        <td class="awr-table-cell-status">
            <span class="awr-history-status ${statusClass}">${escapeHtml(statusText)}</span>
        </td>
        <td class="awr-table-cell-notify-status">
            <span class="awr-history-status ${notifyStatusClass}">${escapeHtml(notifyStatusText)}</span>
        </td>
        <td class="awr-table-cell-actions">
            ${resendButtonHtml}
            ${downloadButtonHtml}
        </td>
    `;

    const resendBtn = tr.querySelector('.inspection-resend-btn');
    if (resendBtn && !isResendDisabled && !isInEnv) {
        resendBtn.addEventListener('click', () => {
            this.handleInspectionResend(item);
        });
    }

    const downloadBtn = tr.querySelector('.inspection-download-btn');
    if (downloadBtn && canDownload) {
        downloadBtn.addEventListener('click', () => {
            this.handleInspectionDownload(item);
        });
    }

    // 添加点击复制功能
    const copyableCells = tr.querySelectorAll('.copyable-cell');
    copyableCells.forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.addEventListener('click', async (event) => {
            event.stopPropagation();
            const fullText = cell.getAttribute('data-full-text') || cell.textContent.trim();
            if (fullText && fullText !== '-') {
                try {
                    await navigator.clipboard.writeText(fullText);
                    // 显示复制成功提示
                    this.showMessage(this.t('popup.common.copySuccess'), 'success', {
                        centered: true,
                        durationMs: 2000,
                        maxWidth: '200px'
                    });
                } catch (err) {
                    console.error('复制失败:', err);
                    this.showMessage('复制失败，请重试', 'error', { 
                        centered: true, 
                        durationMs: 2000, 
                        maxWidth: '200px' 
                    });
                }
            }
        });
    });

    return tr;
}

function getInspectionStatusText(status) {
    const key = {
        'pending': 'popup.inspection.history.status.pending',
        'success': 'popup.inspection.history.status.success',
        'failed': 'popup.inspection.history.status.failed',
        'running': 'popup.inspection.history.status.running',
        'unknown': 'popup.inspection.history.status.unknown'
    }[status] || 'popup.inspection.history.status.unknown';
    return this.t(key);
}

function getInspectionStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'success': 'status-success',
        'failed': 'status-failed',
        'running': 'status-running',
        'unknown': 'status-unknown'
    };
    return classMap[status] || '';
}

function getInspectionNotifyStatusText(status) {
    const key = {
        'pending': 'popup.inspection.history.notifyStatus.pending',
        'success': 'popup.inspection.history.notifyStatus.success',
        'failed': 'popup.inspection.history.notifyStatus.failed',
        'unknown': 'popup.inspection.history.notifyStatus.unknown'
    }[status] || 'popup.inspection.history.notifyStatus.unknown';
    return this.t(key);
}

function getInspectionNotifyStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'success': 'status-success',
        'failed': 'status-failed',
        'unknown': 'status-unknown'
    };
    return classMap[status] || '';
}

function updateInspectionPagination() {
    const totalPages = Math.ceil(this.inspectionHistoryTotal / this.inspectionHistoryPageSize);
    const pageInfo = document.getElementById('inspectionPageInfo');
    const prevBtn = document.getElementById('inspectionPrevPageBtn');
    const nextBtn = document.getElementById('inspectionNextPageBtn');

    if (pageInfo) {
        const safeTotalPages = totalPages > 0 ? totalPages : 1;
        pageInfo.textContent = this.t('popup.inspection.pagination.info', {
            current: this.inspectionHistoryCurrentPage,
            total: safeTotalPages,
            records: this.inspectionHistoryTotal
        });
    }

    if (prevBtn) {
        prevBtn.disabled = this.inspectionHistoryCurrentPage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = this.inspectionHistoryCurrentPage >= totalPages || totalPages === 0;
    }
}

async function handleInspectionResend(item) {
    if (item.status !== 'success') {
        this.showMessage(this.t('popup.message.resendEmailOnlySuccess'), 'error', { centered: true });
        return;
    }

    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            this.showMessage(this.t('popup.message.apiKeyNotConfiguredShort'), 'error', { centered: true });
            return;
        }

        const url = `/api/diagnosis/resendEmail?id=${encodeURIComponent(item.id)}`;
        this.showLoadingOverlay(this.t('popup.inspection.history.resendingEmail'));

        // 使用请求工具
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        const result = await this.requestUtil.post(url, null, {
            provider: tempProvider,
            redirect: 'follow'
        });
        
        const successStatuses = ['success', 'ok', '200'];
        const statusStr = String(result.status || '').toLowerCase().trim();
        const isSuccess = statusStr && successStatuses.includes(statusStr);
        const isEmptyStatus = !result.status || result.status === '';

        if (isSuccess || isEmptyStatus) {
            this.hideLoadingOverlay();
            this.showMessage(this.t('popup.message.inspectionResendSuccess'), 'success', { centered: true });
            const startTime = this.getDateTimeInputValue('inspectionStartTime');
            const endTime = this.getDateTimeInputValue('inspectionEndTime');
            const status = document.getElementById('inspectionStatusFilter')?.value || '';
            this.loadInspectionHistoryList(this.inspectionHistoryCurrentPage, this.inspectionHistoryPageSize, '', startTime, endTime, status);
        } else {
            const errorMessage = result.message || (result.status ? `Resend failed: ${result.status}` : this.t('popup.common.unknownError'));
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('巡检诊断重发邮件失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.inspectionResendFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true });
    }
}

async function handleInspectionDownload(item) {
    const diagnosisId = item.id || item.diagnosis_id;
    if (!diagnosisId) {
        this.showMessage(this.t('popup.message.downloadFailed') || '下载失败：缺少记录ID', 'error', { centered: true });
        return;
    }

    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            this.showMessage(this.t('popup.message.apiKeyNotConfiguredShort'), 'error', { centered: true });
            return;
        }

        // 使用基础URL构建完整URL（下载功能使用原生fetch，需要手动处理）
        const baseURL = this.requestUtil?.baseURL || 'http://api.bic-qa.com';
        const url = new URL('/api/diagnosis/download', baseURL);
        this.showLoadingOverlay(this.t('popup.inspection.history.downloading') || '正在下载...');

        // POST 请求，参数 diagnosis_id 作为 URL 参数
        url.searchParams.append('diagnosis_id', diagnosisId);

        // 直接使用 fetch 处理 blob 响应
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept-Language': this.getAcceptLanguage ? this.getAcceptLanguage() : 'zh'
            }
        });

        this.hideLoadingOverlay();

        if (!response.ok) {
            throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`);
        }

        // 获取 blob 数据
        const blob = await response.blob();

        // 使用邮件附件名称（如果存在），否则使用默认命名
        // 确保文件扩展名始终为 .html
        let fileName;
        if (item.fileName) {
            // 如果存在文件名，去掉原有扩展名，添加 .html 后缀
            const nameWithoutExt = item.fileName.replace(/\.[^/.]+$/, '');
            fileName = `${nameWithoutExt}.html`;
        } else {
            fileName = `diagnosis_report_${diagnosisId}.html`;
        }

        // 创建下载链接
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        this.showMessage(this.t('popup.message.downloadSuccess') || '下载成功', 'success', { centered: true });
    } catch (error) {
        console.error('巡检诊断下载失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.downloadFailed') || '下载失败: ' + (error.message || this.t('popup.common.unknownError')), 'error', { centered: true });
    }
}

function convertStatusNumberToString(statusNum) {
    const map = {
        0: 'pending',
        1: 'success',
        2: 'failed',
        3: 'running'
    };
    return map[statusNum] || 'unknown';
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 切换巡检诊断步骤
 * @param {number} step - 步骤编号（1或2）
 */
function switchInspectionStep(step, animate = true) {
    const step1 = document.getElementById('inspectionStep1');
    const step2 = document.getElementById('inspectionStep2');
    
    if (step === 1) {
        if (step2) {
            // 淡出第二步
            if (animate) {
                step2.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                step2.style.opacity = '0';
                step2.style.transform = 'translateX(20px)';
            }
            setTimeout(() => {
                step2.classList.remove('active');
                step2.style.display = 'none';
                step2.style.opacity = '';
                step2.style.transform = '';
            }, animate ? 400 : 0);
        }
        
        // 显示第一步
        if (step1) {
            step1.classList.add('active');
            step1.style.display = 'block';
            if (animate) {
                step1.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                step1.style.opacity = '0';
                step1.style.transform = 'translateX(-20px)';
                // 强制重排，触发动画
                void step1.offsetWidth;
                setTimeout(() => {
                    step1.style.opacity = '1';
                    step1.style.transform = 'translateX(0)';
                }, 10);
            }
        }
    } else if (step === 2) {
        if (step1) {
            // 淡出第一步
            if (animate) {
                step1.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                step1.style.opacity = '0';
                step1.style.transform = 'translateX(-20px)';
            }
            setTimeout(() => {
                step1.classList.remove('active');
                step1.style.display = 'none';
                step1.style.opacity = '';
                step1.style.transform = '';
            }, animate ? 400 : 0);
        }
        
        // 显示第二步
        if (step2) {
            step2.classList.add('active');
            step2.style.display = 'block';
            if (animate) {
                step2.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                step2.style.opacity = '0';
                step2.style.transform = 'translateX(20px)';
                // 强制重排，触发动画
                void step2.offsetWidth;
                setTimeout(() => {
                    step2.style.opacity = '1';
                    step2.style.transform = 'translateX(0)';
                }, 10);
            }
        }
    }
    
    this.updateInspectionProgress(step);
}

/**
 * 更新进度条显示
 * @param {number} currentStep - 当前步骤（1或2）
 */
function updateInspectionProgress(currentStep) {
    const step1Circle = document.querySelector('.inspection-progress-step[data-step="1"] .progress-step-circle');
    const step2Circle = document.querySelector('.inspection-progress-step[data-step="2"] .progress-step-circle');
    const progressLine = document.querySelector('.inspection-progress-line');
    
    if (currentStep === 1) {
        if (step1Circle) {
            step1Circle.classList.add('active');
            step1Circle.classList.remove('completed');
        }
        if (step2Circle) {
            step2Circle.classList.remove('active', 'completed');
        }
        if (progressLine) {
            progressLine.classList.remove('active', 'completed');
        }
    } else if (currentStep === 2) {
        if (step1Circle) {
            step1Circle.classList.remove('active');
            step1Circle.classList.add('completed');
        }
        if (step2Circle) {
            step2Circle.classList.add('active');
        }
        if (progressLine) {
            progressLine.classList.add('active');
        }
    }
}

/**
 * 检查是否已下载过采集客户端
 * @returns {Promise<boolean>}
 */
async function checkInspectionClientDownloaded() {
    try {
        const result = await chrome.storage.local.get(['inspectionClientDownloaded']);
        return result.inspectionClientDownloaded === true;
    } catch (error) {
        console.error('检查客户端下载状态失败:', error);
        return false;
    }
}

/**
 * 下载采集客户端
 */
async function downloadInspectionClient() {
    const databaseType = this.inspectionDatabaseType?.value;
    if (!databaseType || databaseType.trim() === '') {
        this.showMessage(this.t('popup.inspection.step1.selectDatabaseFirst'), 'error', { centered: true });
        return;
    }

    const downloadBtn = document.getElementById('inspectionDownloadClientBtn');
    const statusDiv = document.getElementById('inspectionDownloadStatus');
    const nextBtn = document.getElementById('inspectionStep1NextBtn');

    try {
        // 显示下载中状态
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="download-icon">⏳</span><span data-i18n="popup.inspection.step1.downloading">下载中...</span>';
        }
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'download-status loading';
            statusDiv.textContent = this.t('popup.inspection.step1.downloading', '正在下载采集客户端...');
        }

        // 获取数据库类型名称（用于确定下载哪个文件）
        const databaseTypeOption = this.inspectionDatabaseType?.options[this.inspectionDatabaseType?.selectedIndex];
        const databaseTypeName = databaseTypeOption?.textContent || databaseType;

        // 根据数据库类型名称映射到对应的压缩包文件名
        // 支持 Oracle 和 KingBase/Kingbase
        let clientFileName = null;
        const dbNameLower = databaseTypeName.toLowerCase();
        if (dbNameLower.includes('oracle')) {
            clientFileName = 'oracle_client.zip';
        } else if (dbNameLower.includes('kingbase') || dbNameLower.includes('king base')) {
            clientFileName = 'kingbase_client.zip';
        } else {
            throw new Error(this.t('popup.inspection.step1.unsupportedDatabaseType', '不支持的数据库类型：{{type}}', { type: databaseTypeName }));
        }

        // 获取本地文件的 URL（通过 Chrome 扩展资源路径）
        const fileUrl = chrome.runtime.getURL(`clients/${clientFileName}`);

        // 使用fetch下载文件
        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`下载失败: HTTP ${response.status} ${response.statusText}`);
        }

        // 获取blob数据
        const blob = await response.blob();

        // 创建下载链接
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // 设置下载文件名
        link.download = clientFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        // 保存下载状态到缓存
        await chrome.storage.local.set({ inspectionClientDownloaded: true });
        console.log('客户端下载完成，已保存到缓存');

        // 显示成功状态
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<span class="download-icon">✓</span><span data-i18n="popup.inspection.step1.downloaded">已下载</span>';
            downloadBtn.style.background = '#28a745';
        }
        if (statusDiv) {
            statusDiv.className = 'download-status success';
            statusDiv.textContent = this.t('popup.inspection.step1.downloadSuccess', '下载成功！');
        }
        if (nextBtn) {
            nextBtn.disabled = false;
        }

        this.showMessage(this.t('popup.inspection.step1.downloadSuccess', '客户端下载成功'), 'success', { centered: true });

    } catch (error) {
        console.error('下载采集客户端失败:', error);
        
        // 显示错误状态
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<span class="download-icon">📦</span><span data-i18n="popup.inspection.step1.downloadButton">下载采集客户端</span>';
        }
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'download-status error';
            statusDiv.textContent = this.t('popup.inspection.step1.downloadFailed', '下载失败，请重试');
        }

        this.showMessage(
            this.t('popup.inspection.step1.downloadFailed', '下载失败') + ': ' + (error.message || this.t('popup.common.unknownError')),
            'error',
            { centered: true }
        );
    }
}

/**
 * 获取脚本采集器列表
 * @returns {Promise<Array<{plugin_id: number, plugin_name: string, version: string, md5: string, path: string, support_os: string, created_at: string, updated_at: string}>>}
 */
async function getPluginList() {
    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }

        const url = '/api/plugin/queryList';
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        
        const result = await this.requestUtil.post(url, null, {
            provider: tempProvider
        });

        // 处理返回格式 { status: "success", data: [...] }
        if (result.status === 'success' && result.data && Array.isArray(result.data)) {
            return result.data.map(item => ({
                plugin_id: item.plugin_id || item.pluginId || 0,
                plugin_name: item.plugin_name || item.pluginName || '',
                plugin_type: item.plugin_type || item.pluginType || '',
                version: item.version || '',
                md5: item.md5 || '',
                path: item.path || '',
                support_os: item.support_os || item.supportOs || '',
                created_at: item.created_at || item.createdAt || '',
                updated_at: item.updated_at || item.updatedAt || ''
            }));
        }
        
        return [];
    } catch (error) {
        console.error('获取脚本采集器列表失败:', error);
        throw error;
    }
}

/**
 * 获取用户信息
 * @returns {Promise<{pluginVersion: string, userName: string, email: string}>}
 */
async function getUserProfile() {
    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }

        const url = '/api/user/profile';
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        
        // 使用POST请求，与populateUserProfileFromApi保持一致
        const result = await this.requestUtil.post(url, null, {
            provider: tempProvider
        });

        // 解析返回数据，支持多种返回格式
        let pluginversion = {};
        let userName = '';
        let email = '';

        // 解析固定返回结构 { code, success, user: { userName, email, pluginversion, ... } }
        if (result.user) {
            userName = result.user.userName || '';
            email = result.user.email || '';
            pluginversion = result.user.pluginversion || result.user.pluginVersion || {};
        } else if (result.pluginversion || result.pluginVersion || result.userName || result.email) {
            // 支持直接返回格式
            pluginversion = result.pluginversion || result.pluginVersion || {};
            userName = result.userName || '';
            email = result.email || '';
        } else if (result.data) {
            // 支持嵌套data格式
            pluginversion = result.data.pluginversion || result.data.pluginVersion || {};
            userName = result.data.userName || '';
            email = result.data.email || '';
        }

        return {
            pluginversion: pluginversion,
            userName: userName,
            email: email
        };
    } catch (error) {
        console.error('获取用户信息失败:', error);
        throw error;
    }
}

/**
 * 获取远程脚本采集器信息（按操作系统）
 * @param {string} supportOs - 操作系统类型 'linux' 或 'windows'
 * @returns {Promise<{version: string, md5: string, path: string, supportOs: string, createdAt: string, updatedAt: string}>}
 */
async function getRemoteScriptPackageInfo(supportOs) {
    try {
        const code = this.getSelectedScriptCollectorCode();
        const latestList = await this.fetchLatestPluginsList(code);
        const targetOs = (supportOs || '').toLowerCase();
        const matched = latestList.find(item => item.support_os === targetOs);
        
        if (matched) {
            return {
                plugin_id: matched.plugin_id || '',
                version: matched.version || '',
                md5: matched.md5 || '',
                path: matched.path || '',
                supportOs: matched.support_os || targetOs,
                createdAt: matched.created_at || '',
                updatedAt: matched.updated_at || ''
            };
        }
        
        console.warn(`未找到${supportOs}版本的脚本采集器（code=${code}）`);
        return {
            plugin_id: '',
            version: '',
            md5: '',
            path: '',
            supportOs: supportOs,
            createdAt: '',
            updatedAt: ''
        };
    } catch (error) {
        console.error(`获取${supportOs}远程脚本采集器信息失败:`, error);
        throw error;
    }
}

/**
 * 计算Blob的MD5值
 * @param {Blob} blob - 要计算MD5的Blob对象
 * @returns {Promise<string>} MD5值
 */
async function calculateBlobMD5(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const arrayBuffer = reader.result;
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                resolve(hashHex);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

/**
 * 下载插件文件
 * @param {string} pluginId - 插件ID
 * @param {string} supportOs - 操作系统类型
 * @returns {Promise<Blob>}
 */
async function downloadPlugin(pluginId, supportOs, version) {
    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }

        // 获取用户当前已下载的所有操作系统版本信息
        const userProfile = await this.getUserProfile();
        const userPluginVersion = userProfile?.pluginversion || {};
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'dbCheck');
        
        // 构建请求参数数组
        const requestBody = [];
        
        // 添加当前下载的操作系统版本
        requestBody.push({
            osType: supportOs,
            version: version || ''
        });
        
        // 添加另一个操作系统的版本（如果存在）
        const otherOs = supportOs === 'linux' ? 'windows' : 'linux';
        const otherVersion = userPluginVersions[otherOs] || '';
        if (otherVersion) {
            requestBody.push({
                osType: otherOs,
                version: otherVersion
            });
        }

        const url = '/api/plugin/download';
        const queryParams = new URLSearchParams({
            pluginId: pluginId,
            apiKey: apiKey
        });
        
        const baseURL = this.requestUtil?.baseURL || 'http://api.bic-qa.com';
        const resolvedUrl = new URL(url, baseURL);
        resolvedUrl.search = queryParams.toString();
        
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };
        
        const headers = this.requestUtil.buildHeaders({}, tempProvider, false);
        // 设置Content-Type为application/json
        headers['Content-Type'] = 'application/json';
        
        const response = await fetch(resolvedUrl.toString(), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`下载失败: HTTP ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('下载插件失败:', error);
        throw error;
    }
}

/**
 * 更新用户插件版本信息
 * @param {string} supportOs - 操作系统类型 (linux/windows)
 * @param {string} version - 版本号
 * @param {string} type - 插件类型 (dbCheck/sqlOptimization)
 */
async function updatePluginVersion(supportOs, version, type = 'dbCheck') {
    try {
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            console.warn('无法更新插件版本：未找到API key');
            return;
        }

        // 获取用户当前的pluginversion
        const userProfile = await this.getUserProfile();
        let pluginversion = userProfile?.pluginversion || {};

        // 如果是字符串，解析为对象
        if (typeof pluginversion === 'string') {
            try {
                pluginversion = JSON.parse(pluginversion);
            } catch (error) {
                console.error('解析pluginversion失败:', error);
                pluginversion = {};
            }
        }

        // 确保对应类型的数组存在
        if (!pluginversion[type]) {
            pluginversion[type] = [];
        }

        // 查找或创建对应数据库类型的条目
        let code = '2101'; // 默认Oracle
        if (type === 'dbCheck') {
            code = this.getSelectedScriptCollectorCode() || '2101';
        } else if (type === 'sqlOptimization') {
            code = this.getSelectedSqlOptimizationScriptCollectorCode ? this.getSelectedSqlOptimizationScriptCollectorCode() : '2101';
            if (!code) code = '2101';
        }
        let typeItem = pluginversion[type].find(item => item.code === code);

        if (!typeItem) {
            // 根据code获取数据库类型名称
            let dbName = 'unknown';

            if (code === '2101') {
                dbName = 'orcl'; // Oracle的特殊处理
            } else if (type === 'sqlOptimization' && this.knowledgeBases) {
                // 对于SQL优化，从知识库数据中查找名称
                const knowledgeBase = this.knowledgeBases.find(kb => kb.code === code);
                if (knowledgeBase) {
                    dbName = knowledgeBase.name || knowledgeBase.dataset_name || 'unknown';
                }
            } else if (type === 'dbCheck' && this.knowledgeBases) {
                // 对于巡检诊断，从知识库数据中查找名称
                const knowledgeBase = this.knowledgeBases.find(kb => kb.code === code);
                if (knowledgeBase) {
                    dbName = knowledgeBase.name || knowledgeBase.dataset_name || 'unknown';
                }
            }

            typeItem = {
                code: code,
                name: dbName,
                plugins: []
            };
            pluginversion[type].push(typeItem);
        }

        // 更新或添加对应操作系统的版本
        let pluginItem = typeItem.plugins.find(p => p.osType === supportOs);
        if (pluginItem) {
            pluginItem.version = version;
        } else {
            typeItem.plugins.push({
                osType: supportOs,
                version: version
            });
        }

        // 将pluginversion对象转换为JSON字符串
        const pluginVersionStr = JSON.stringify(pluginversion);

        // 调用更新接口
        const url = '/api/user/updatePluginVersion';
        const tempProvider = {
            authType: 'Bearer',
            apiKey: apiKey
        };

        const response = await this.requestUtil.post(url, {
            apiKey: apiKey,
            pluginVersion: pluginVersionStr
        }, {
            provider: tempProvider
        });

        if (response && response.code === 200) {
            console.log('插件版本更新成功:', { supportOs, version, type });
        } else {
            console.warn('插件版本更新失败:', response);
        }
    } catch (error) {
        console.error('更新插件版本失败:', error);
        // 不抛出错误，避免影响下载流程
    }
}

/**
 * 触发文件下载
 * @param {Blob} blob - 要下载的Blob对象
 * @param {string} filename - 文件名
 */
function triggerDownload(blob, filename) {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
}

/**
 * 刷新脚本采集器
 */
async function refreshScriptPackage(keepCardsVisible = false) {
    const refreshBtn = document.getElementById('refreshScriptPackageBtn');
    const statusDiv = document.getElementById('refreshScriptPackageStatus');
    const downloadOptions = document.getElementById('pluginDownloadOptions');
    
    console.log('开始刷新脚本采集器');
    console.log('refreshBtn:', refreshBtn);
    console.log('statusDiv:', statusDiv);
    console.log('downloadOptions:', downloadOptions);
    
    try {
        // 禁用按钮并显示加载状态
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="refresh-icon">⏳</span><span>刷新中...</span>';
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.className = 'refresh-status loading';
            statusDiv.textContent = this.t('popup.inspection.form.checkingScriptCollectorUpdate', '正在检查脚本采集器更新...');
        }
        
        // 只有在不保持显示时才隐藏下载选项
        if (downloadOptions && !keepCardsVisible) {
            downloadOptions.style.display = 'none';
        }
        
        // 获取API密钥
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            throw new Error(this.t('popup.message.apiKeyNotConfigured'));
        }
        
        // 获取用户信息（包含用户绑定的pluginversion）
        const userProfile = await this.getUserProfile();
        const userPluginVersion = userProfile.pluginversion || {};
        // 解析 pluginversion 对象
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'dbCheck');
        console.log('用户绑定的插件版本:', userPluginVersions);
        
        const code = this.getSelectedScriptCollectorCode();
        const latestList = await this.fetchLatestPluginsList(code, { force: true });
        const windowsLatestInfo = latestList.find(item => item.support_os === 'windows') || { version: '', md5: '', path: '', updatedAt: '', plugin_id: '' };
        const linuxLatestInfo = latestList.find(item => item.support_os === 'linux') || { version: '', md5: '', path: '', updatedAt: '', plugin_id: '' };
        
        const linuxLatestVersion = linuxLatestInfo?.version || '';
        const windowsLatestVersion = windowsLatestInfo?.version || '';
        
        console.log('Linux最新版本信息:', linuxLatestInfo);
        console.log('Windows最新版本信息:', windowsLatestInfo);
        
        // 从 profile 数据判断用户是否下载过（有版本号就表示下载过）
        const linuxUserVersion = userPluginVersions.linux || '';
        const windowsUserVersion = userPluginVersions.windows || '';
        const linuxIsDownloaded = !!linuxUserVersion;
        const windowsIsDownloaded = !!windowsUserVersion;
        const linuxNeedsUpdate = linuxIsDownloaded && linuxUserVersion && linuxLatestVersion && linuxUserVersion !== linuxLatestVersion;
        const windowsNeedsUpdate = windowsIsDownloaded && windowsUserVersion && windowsLatestVersion && windowsUserVersion !== windowsLatestVersion;
        
        // 无论是否需要更新，都显示下载选项（Windows版本和Linux版本）
        if (downloadOptions) {
            console.log('准备显示下载选项，Linux信息:', linuxLatestInfo);
            console.log('准备显示下载选项，Windows信息:', windowsLatestInfo);
            
            // 更新Linux信息
            const linuxVersionEl = document.getElementById('linuxPluginVersion');
            const linuxLatestVersionEl = document.getElementById('linuxLatestVersion');
            const linuxCurrentVersionEl = document.getElementById('linuxCurrentVersion');
            const linuxUpdateDateEl = document.getElementById('linuxPluginUpdateDate');
            const linuxPathEl = document.getElementById('linuxPluginPath');
            
            // 计算当前版本（用于右上角显示）
            let linuxCurrentVersionDisplay = '';
            if (linuxIsDownloaded) {
                // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                linuxCurrentVersionDisplay = linuxUserVersion || linuxLatestVersion || '';
            }
            
            // 设置右上角版本号（与当前版本一致）
            if (linuxVersionEl) {
                if (linuxCurrentVersionDisplay) {
                    linuxVersionEl.textContent = linuxCurrentVersionDisplay;
                } else {
                    linuxVersionEl.textContent = '未下载';
                }
            }
            
            if (linuxLatestVersionEl) linuxLatestVersionEl.textContent = linuxLatestVersion || this.t('popup.inspection.form.unknown', '未知');
            
            // 显示当前版本（只有用户下载过该操作系统才比对）
            if (linuxCurrentVersionEl) {
                const currentVersionItem = linuxCurrentVersionEl.closest('.plugin-info-item');
                if (currentVersionItem) {
                    currentVersionItem.style.display = 'flex';
                    if (linuxIsDownloaded) {
                        // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                        const currentVersion = linuxUserVersion || linuxLatestVersion;
                        if (currentVersion) {
                            if (linuxUserVersion && linuxUserVersion === linuxLatestVersion) {
                                linuxCurrentVersionEl.textContent = linuxUserVersion;
                                linuxCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                            } else if (linuxUserVersion && linuxUserVersion !== linuxLatestVersion) {
                                linuxCurrentVersionEl.textContent = `${linuxUserVersion}（需更新）`;
                                linuxCurrentVersionEl.className = 'plugin-info-value version-current version-outdated';
                            } else {
                                // 用户版本为空，但已下载，使用最新版本
                                linuxCurrentVersionEl.textContent = linuxLatestVersion || this.t('popup.inspection.form.unknown', '未知');
                                linuxCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                            }
                        } else {
                            linuxCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                            linuxCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                        }
                    } else {
                        linuxCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                        linuxCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                    }
                }
            }
            // 标记最新版本是否需要更新
            if (linuxLatestVersionEl) {
                linuxLatestVersionEl.className = linuxNeedsUpdate 
                    ? 'plugin-info-value version-latest version-new' 
                    : 'plugin-info-value version-latest';
            }
            if (linuxUpdateDateEl) linuxUpdateDateEl.textContent = formatDateToYMD(linuxLatestInfo?.updatedAt || '');
            if (linuxPathEl) linuxPathEl.textContent = linuxLatestInfo?.path || this.t('popup.inspection.form.unknown', '未知');
            
            // 更新Windows信息
            const windowsVersionEl = document.getElementById('windowsPluginVersion');
            const windowsLatestVersionEl = document.getElementById('windowsLatestVersion');
            const windowsCurrentVersionEl = document.getElementById('windowsCurrentVersion');
            const windowsUpdateDateEl = document.getElementById('windowsPluginUpdateDate');
            const windowsPathEl = document.getElementById('windowsPluginPath');
            
            // 计算当前版本（用于右上角显示）
            let windowsCurrentVersionDisplay = '';
            if (windowsIsDownloaded) {
                // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                windowsCurrentVersionDisplay = windowsUserVersion || windowsLatestVersion || '';
            }
            
            // 设置右上角版本号（与当前版本一致）
            if (windowsVersionEl) {
                if (windowsCurrentVersionDisplay) {
                    windowsVersionEl.textContent = windowsCurrentVersionDisplay;
                } else {
                    windowsVersionEl.textContent = '未下载';
                }
            }
            
            if (windowsLatestVersionEl) windowsLatestVersionEl.textContent = windowsLatestVersion || this.t('popup.inspection.form.unknown', '未知');
            
            // 显示当前版本（只有用户下载过该操作系统才比对）
            if (windowsCurrentVersionEl) {
                const currentVersionItem = windowsCurrentVersionEl.closest('.plugin-info-item');
                if (currentVersionItem) {
                    currentVersionItem.style.display = 'flex';
                    if (windowsIsDownloaded) {
                        // 如果已下载，优先使用用户版本，如果没有则使用最新版本
                        const currentVersion = windowsUserVersion || windowsLatestVersion;
                        if (currentVersion) {
                            if (windowsUserVersion && windowsUserVersion === windowsLatestVersion) {
                                windowsCurrentVersionEl.textContent = windowsUserVersion;
                                windowsCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                            } else if (windowsUserVersion && windowsUserVersion !== windowsLatestVersion) {
                                windowsCurrentVersionEl.textContent = `${windowsUserVersion}（需更新）`;
                                windowsCurrentVersionEl.className = 'plugin-info-value version-current version-outdated';
                            } else {
                                // 用户版本为空，但已下载，使用最新版本
                                windowsCurrentVersionEl.textContent = windowsLatestVersion || this.t('popup.inspection.form.unknown', '未知');
                                windowsCurrentVersionEl.className = 'plugin-info-value version-current version-latest';
                            }
                        } else {
                            windowsCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                            windowsCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                        }
                    } else {
                        windowsCurrentVersionEl.textContent = this.t('popup.inspection.form.notDownloadedShort', '未下载过');
                        windowsCurrentVersionEl.className = 'plugin-info-value version-current version-not-installed';
                    }
                }
            }
            // 标记最新版本是否需要更新
            if (windowsLatestVersionEl) {
                windowsLatestVersionEl.className = windowsNeedsUpdate 
                    ? 'plugin-info-value version-latest version-new' 
                    : 'plugin-info-value version-latest';
            }
            if (windowsUpdateDateEl) windowsUpdateDateEl.textContent = formatDateToYMD(windowsLatestInfo?.updatedAt || '');
            if (windowsPathEl) windowsPathEl.textContent = windowsLatestInfo?.path || this.t('popup.inspection.form.unknown', '未知');
            
            // 存储插件信息供下载使用（使用data-*属性）
            downloadOptions.setAttribute('data-linux-plugin-id', linuxLatestInfo?.plugin_id || '');
            downloadOptions.setAttribute('data-windows-plugin-id', windowsLatestInfo?.plugin_id || '');
            downloadOptions.setAttribute('data-linux-info', JSON.stringify(linuxLatestInfo));
            downloadOptions.setAttribute('data-windows-info', JSON.stringify(windowsLatestInfo));
            
            // 如果保持显示状态，确保cards显示；否则正常显示
            if (keepCardsVisible) {
                // 如果cards已经显示，直接刷新内容，不需要重新显示
                if (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block') {
                    // cards已经显示，不需要重新显示
                    console.log('保持cards显示状态，已刷新内容');
                } else {
                    // 如果cards没有显示，显示它们
                    showDownloadOptionsWithAnimation(downloadOptions);
                }
            } else {
                // 显示下载选项（带动画效果）
                showDownloadOptionsWithAnimation(downloadOptions);
            console.log('下载选项已显示，display:', downloadOptions.style.display);
            }
        } else {
            console.error('未找到下载选项元素 pluginDownloadOptions');
        }
        
        // 根据是否需要更新显示不同的状态
        if (!linuxNeedsUpdate && !windowsNeedsUpdate) {
            // 都是最新版本
            if (statusDiv) {
                statusDiv.className = 'refresh-status success';
                statusDiv.textContent = this.t('popup.inspection.form.isLatestVersion', '已是最新版本');
            }
            // 如果所有版本都是最新，显示统一文案
            this.showMessage(this.t('popup.inspection.form.allVersionsLatest', '各版本插件采集器均是最新版本'), 'success', { centered: true });
        } else {
            // 检测到新版本
            if (statusDiv) {
                statusDiv.className = 'refresh-status info';
                statusDiv.textContent = this.t('popup.inspection.form.newVersionDetected', '检测到新版本，请选择操作系统下载');
            }
        }
        
    } catch (error) {
        console.error('刷新脚本采集器失败:', error);
        console.error('错误详情:', error.stack);
        
        if (statusDiv) {
            statusDiv.className = 'refresh-status error';
            statusDiv.textContent = `检查失败: ${error.message || this.t('popup.common.unknownError')}`;
        }
        
        // 即使出错，也尝试显示下载选项（如果有缓存的数据）
        const downloadOptions = document.getElementById('pluginDownloadOptions');
        if (downloadOptions) {
            const linuxInfoStr = downloadOptions.getAttribute('data-linux-info');
            const windowsInfoStr = downloadOptions.getAttribute('data-windows-info');
            if (linuxInfoStr || windowsInfoStr) {
                showDownloadOptionsWithAnimation(downloadOptions);
                console.log('错误时显示缓存的下载选项');
            }
        }
        
        this.showMessage(
            `${this.t('popup.inspection.form.refreshScriptCollectorFailed', '刷新脚本采集器失败')}: ${error.message || this.t('popup.common.unknownError')}`,
            'error',
            { centered: true }
        );
    } finally {
        // 恢复按钮状态
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span class="refresh-icon">🔄</span><span data-i18n="popup.inspection.form.refreshScriptCollector">刷新脚本采集器</span>';
        }
    }
}

/**
 * 下载插件文件
 * @param {string} supportOs - 操作系统类型 'linux' 或 'windows'
 */
async function downloadPluginFile(supportOs) {
    const downloadBtn = document.querySelector(`.btn-download-plugin[data-os="${supportOs}"]`);
    const downloadOptions = document.getElementById('pluginDownloadOptions');
    
    if (!downloadOptions) {
        this.showMessage(this.t('popup.inspection.form.loadFailed', '加载失败，请刷新页面重试'), 'error', { centered: true });
        return;
    }
    
    let originalText = '';
    try {
        // 禁用按钮
        if (downloadBtn) {
            downloadBtn.disabled = true;
            originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span>下载中...</span>';
        }
        
        // 获取插件信息（优先使用缓存）
        let pluginInfo = this.latestPluginInfoCache?.[supportOs];
        if (!pluginInfo || !pluginInfo.plugin_id) {
            pluginInfo = await this.getRemoteScriptPackageInfo(supportOs);
        }
        
        const pluginId = pluginInfo.plugin_id;
        
        if (!pluginId) {
            throw new Error('未找到插件ID');
        }
        
        // 下载插件
        const osName = supportOs ? supportOs.toUpperCase() : 'UNKNOWN';
        // 手动替换变量，因为t函数可能不支持{{os}}格式
        const downloadingTextTemplate = this.t('popup.inspection.form.downloadingVersion', '正在下载{{os}}版本...');
        const downloadingText = downloadingTextTemplate.replace('{{os}}', osName);
        this.showMessage(downloadingText, 'info', { centered: true, replaceExisting: true, durationMs: 1800 });
        
        const blob = await this.downloadPlugin(pluginId, supportOs, pluginInfo.version);
        
        // 触发下载
        const filename = `collector_tools_${supportOs}_${pluginInfo.version || 'latest'}.zip`;
        this.triggerDownload(blob, filename);
        
        // 更新用户插件版本信息
        if (pluginInfo.version) {
            await this.updatePluginVersion(supportOs, pluginInfo.version, 'dbCheck');
        }
        
        // 延迟显示成功消息，避免与下载中消息重叠
        setTimeout(() => {
            this.showMessage(this.t('popup.inspection.form.downloadSuccess', '下载成功'), 'success', { centered: true, replaceExisting: true, durationMs: 2200 });
        }, 300);
        
        // 刷新版本检查和显示（不自动收起cards）
        setTimeout(async () => {
            await this.checkScriptCollectorVersion(null, { preserveVisibility: true });
            // 如果下载选项已显示，刷新显示内容（保持显示状态，不重新调用showScriptCollectorOptions避免收起）
            const downloadOptions = document.getElementById('pluginDownloadOptions');
            if (downloadOptions && (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block')) {
                // 直接刷新内容，不调用showScriptCollectorOptions（避免收起cards）
                await this.refreshScriptPackage(true);
            }
        }, 1500);
        
    } catch (error) {
        console.error(`下载${supportOs}插件失败:`, error);
        this.showMessage(
            `${this.t('popup.inspection.form.downloadFailed', '下载失败')}: ${error.message || this.t('popup.common.unknownError')}`,
            'error',
            { centered: true }
        );
    } finally {
        // 恢复按钮状态
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<span data-i18n="popup.inspection.form.download">下载</span>';
        }
    }
}

/**
 * 绑定巡检数据库类型选择变化事件
 */
function bindInspectionDatabaseTypeChange() {
    if (!this.inspectionDatabaseType) return;

    // 移除之前的事件监听器（如果存在）
    if (this._inspectionDatabaseTypeChangeHandler) {
        this.inspectionDatabaseType.removeEventListener('change', this._inspectionDatabaseTypeChangeHandler);
    }

    // 创建新的事件处理器
    this._inspectionDatabaseTypeChangeHandler = (event) => {
        this.updateInspectionDatabaseDescription();
        this.updateInspectionScriptCollectorDownloadLinks();
    };

    // 添加事件监听器
    this.inspectionDatabaseType.addEventListener('change', this._inspectionDatabaseTypeChangeHandler);
}

/**
 * 更新巡检数据库类型描述显示
 */
function updateInspectionDatabaseDescription() {
    const descriptionElement = document.getElementById('inspectionDatabaseDescription');
    if (!descriptionElement) return;

    const select = this.inspectionDatabaseType;
    if (!select || !this.inspectionKnowledgeBases) {
        descriptionElement.style.display = 'none';
        return;
    }

    const selectedValue = select.value;
    if (!selectedValue) {
        descriptionElement.style.display = 'none';
        return;
    }

    // 查找对应的知识库项
    const selectedKb = this.inspectionKnowledgeBases.find(kb => (kb.id || kb.code) === selectedValue);

    if (selectedKb && selectedKb.tips) {
        try {
            // 从tips JSON字符串中解析描述信息
            const tipsData = JSON.parse(selectedKb.tips);
            const diagnosisTips = tipsData.diagnosis;

            if (diagnosisTips && diagnosisTips.tips && diagnosisTips.tips.trim()) {
                // 显示描述信息
                descriptionElement.textContent = diagnosisTips.tips;
                descriptionElement.style.display = 'block';
            } else {
                // 隐藏描述信息
                descriptionElement.style.display = 'none';
            }
        } catch (error) {
            console.warn('解析tips失败:', error);
            descriptionElement.style.display = 'none';
        }
    } else {
        // 隐藏描述信息
        descriptionElement.style.display = 'none';
    }
}

/**
 * 更新巡检脚本采集器下载地址显示
 */
function updateInspectionScriptCollectorDownloadLinks() {
    const downloadLinksContainer = document.getElementById('inspectionScriptCollectorDownloadLinks');
    const downloadLabel = document.getElementById('inspectionScriptCollectorDownloadLabel');
    const giteeLink = document.getElementById('inspectionScriptCollectorGiteeLink');
    const githubLink = document.getElementById('inspectionScriptCollectorGithubLink');

    if (!downloadLinksContainer || !downloadLabel || !giteeLink || !githubLink) return;

    const select = this.inspectionDatabaseType;
    if (!select || !this.inspectionKnowledgeBases) {
        downloadLinksContainer.style.display = 'none';
        return;
    }

    const selectedValue = select.value;
    if (!selectedValue) {
        downloadLinksContainer.style.display = 'none';
        return;
    }

    // 查找对应的知识库项
    const selectedKb = this.inspectionKnowledgeBases.find(kb => (kb.id || kb.code) === selectedValue);
    if (!selectedKb) {
        downloadLinksContainer.style.display = 'none';
        return;
    }

    // 获取数据库名称
    const dbName = this.formatKnowledgeBaseName(selectedKb.name) || selectedKb.name || '数据库';
    
    // 更新标签文本
    downloadLabel.textContent = `${dbName}脚本采集器下载地址`;

    // 设置下载地址
    const giteeUrl = 'https://gitee.com/BIC-QA/bic-qa/releases';
    const githubUrl = 'https://github.com/BIC-QA/BIC-QA/releases';
    
    // Gitee地址
    giteeLink.href = giteeUrl;
    const giteeUrlSpan = giteeLink.querySelector('.script-collector-download-url');
    if (giteeUrlSpan) {
        giteeUrlSpan.textContent = giteeUrl;
    }
    
    // GitHub地址
    githubLink.href = githubUrl;
    const githubUrlSpan = githubLink.querySelector('.script-collector-download-url');
    if (githubUrlSpan) {
        githubUrlSpan.textContent = githubUrl;
    }

    // 显示下载地址区域
    downloadLinksContainer.style.display = 'block';
}