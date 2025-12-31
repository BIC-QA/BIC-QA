/**
 * SQL优化功能模块，将相关方法绑定到 BicQAPopup 实例。
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
function parsePluginVersion(pluginversion, type = 'sqlOptimization') {
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

export function attachSqlOptimizationModule(app) {
    app.showSqlOptimizationDialog = showSqlOptimizationDialog.bind(app);
    app.hideSqlOptimizationDialog = hideSqlOptimizationDialog.bind(app);
    app.resetSqlOptimizationForm = resetSqlOptimizationForm.bind(app);
    app.loadSqlOptimizationDatabaseTypes = loadSqlOptimizationDatabaseTypes.bind(app);
    app.handleSqlOptimizationFileSelect = handleSqlOptimizationFileSelect.bind(app);
    app.handleSqlOptimizationSubmit = handleSqlOptimizationSubmit.bind(app);
    app.submitSqlOptimizationAnalysis = submitSqlOptimizationAnalysis.bind(app);

    app.switchSqlOptimizationTab = switchSqlOptimizationTab.bind(app);
    app.handleSqlOptimizationSearch = handleSqlOptimizationSearch.bind(app);
    app.handleSqlOptimizationReset = handleSqlOptimizationReset.bind(app);
    app.loadSqlOptimizationHistoryList = loadSqlOptimizationHistoryList.bind(app);
    app.renderSqlOptimizationHistoryList = renderSqlOptimizationHistoryList.bind(app);
    app.createSqlOptimizationHistoryTableRow = createSqlOptimizationHistoryTableRow.bind(app);
    app.getSqlOptimizationStatusText = getSqlOptimizationStatusText.bind(app);
    app.getSqlOptimizationStatusClass = getSqlOptimizationStatusClass.bind(app);
    app.getSqlOptimizationNotifyStatusText = getSqlOptimizationNotifyStatusText.bind(app);
    app.getSqlOptimizationNotifyStatusClass = getSqlOptimizationNotifyStatusClass.bind(app);
    app.updateSqlOptimizationPagination = updateSqlOptimizationPagination.bind(app);
    app.handleSqlOptimizationResend = handleSqlOptimizationResend.bind(app);

    // 新增方法绑定
    app.bindSqlOptimizationDatabaseTypeChange = bindSqlOptimizationDatabaseTypeChange.bind(app);
    app.updateSqlOptimizationDatabaseDescription = updateSqlOptimizationDatabaseDescription.bind(app);
    app.updateSqlOptimizationScriptCollectorDownloadLinks = updateSqlOptimizationScriptCollectorDownloadLinks.bind(app);
    app.handleSqlOptimizationDownload = handleSqlOptimizationDownload.bind(app);

    // 脚本采集器相关方法
    app.showSqlOptimizationScriptCollectorOptions = showSqlOptimizationScriptCollectorOptions.bind(app);
    app.getSelectedSqlOptimizationScriptCollectorCode = getSelectedSqlOptimizationScriptCollectorCode.bind(app);
    app.getSqlOptimizationRemoteScriptPackageInfo = getSqlOptimizationRemoteScriptPackageInfo.bind(app);
    app.downloadSqlOptimizationPluginFile = downloadSqlOptimizationPluginFile.bind(app);
    app.checkSqlOptimizationScriptCollectorVersion = checkSqlOptimizationScriptCollectorVersion.bind(app);
    app.refreshSqlOptimizationScriptPackage = refreshSqlOptimizationScriptPackage.bind(app);

    // SQL优化的专用插件列表获取方法（覆盖巡检诊断的同名方法）
    app.fetchLatestPluginsListSqlOptimization = fetchLatestPluginsList.bind(app);
}

async function showSqlOptimizationDialog() {
    if (!this.sqlOptimizationDialog) {
        return;
    }

    // 重置表单
    this.resetSqlOptimizationForm();

    // 显示对话框
    this.sqlOptimizationDialog.style.display = 'flex';

    // 确保更新图标仍然可见（如果应该显示）
    if (this.ensureUpdateIconVisible) {
        setTimeout(() => {
            this.ensureUpdateIconVisible();
        }, 100);
    }

    // 更新弹窗内的国际化文本
    this.translateStaticElements(this.currentLanguage);

    // 加载数据库类型选项（仅KingBase）
    await this.loadSqlOptimizationDatabaseTypes();

    // 根据环境类型控制邮箱输入框显示
    const envType = await this.getEnvType();
    const emailGroup = document.querySelector('#sqlOptimizationEmail')?.closest('.form-group');
    if (emailGroup) {
        emailGroup.style.display = envType === 'in_env' ? 'none' : 'block';
    }

    await this.loadRegistrationEmail(this.sqlOptimizationEmail);

    // 只调用一次接口获取用户信息，然后复用结果
    let userProfileData = null;
    try {
        // 直接调用getUserProfile获取完整用户信息
        userProfileData = await this.getUserProfile();

        // 手动填充用户名和邮箱到输入框
        if (this.sqlOptimizationUserName && userProfileData.userName) {
            this.sqlOptimizationUserName.value = userProfileData.userName;
        }
        // 仅当邮箱为空时才用接口返回覆盖，避免覆盖注册邮箱
        if (this.sqlOptimizationEmail && !this.sqlOptimizationEmail.value && userProfileData.email) {
            this.sqlOptimizationEmail.value = userProfileData.email;
        }
    } catch (error) {
        console.error('加载SQL优化用户信息失败:', error);
        // 如果获取失败，尝试使用原来的方法作为降级方案
        try {
            await this.populateUserProfileFromApi({
                userNameInput: this.sqlOptimizationUserName,
                emailInput: this.sqlOptimizationEmail
            });
        } catch (fallbackError) {
            console.error('降级方案也失败:', fallbackError);
        }
    }

    // 默认切换到新建优化选项卡
    if (typeof this.switchSqlOptimizationTab === 'function') {
        this.switchSqlOptimizationTab('new');
    }

    // 绑定下载/更新按钮事件
    const downloadOrUpdateBtn = document.getElementById('sqlOptimizationDownloadOrUpdateScriptCollectorBtn');
    if (downloadOrUpdateBtn) {
        downloadOrUpdateBtn.replaceWith(downloadOrUpdateBtn.cloneNode(true));
        const newDownloadOrUpdateBtn = document.getElementById('sqlOptimizationDownloadOrUpdateScriptCollectorBtn');
        newDownloadOrUpdateBtn.addEventListener('click', () => {
            console.log('SQL优化：下载按钮被点击');
            this.showSqlOptimizationScriptCollectorOptions();
        });
    }

    // 绑定下载按钮事件（动态卡片，事件委托）
    const downloadOptions = document.getElementById('sqlOptimizationPluginDownloadOptions');
    if (downloadOptions) {
        downloadOptions.onclick = (e) => {
            const btn = e.target.closest('.btn-download-plugin');
            if (btn && btn.dataset.os) {
                this.downloadSqlOptimizationPluginFile(btn.dataset.os);
            }
        };
    }

    // 打开弹框时检查用户版本并更新按钮状态
    this.checkSqlOptimizationScriptCollectorVersion(userProfileData);

}

function hideSqlOptimizationDialog() {
    // 清理日期时间过滤器的事件监听器
    this.cleanupDateTimeFilters();

    // 关闭日期选择器
    this.closeDateTimePicker();

    if (!this.sqlOptimizationDialog) return;
    this.sqlOptimizationDialog.style.display = 'none';
    if (this.sqlOptimizationSaveBtn) {
        this.sqlOptimizationSaveBtn.disabled = false;
        this.sqlOptimizationSaveBtn.textContent = this.t('popup.sqlOptimization.form.submit');
    }
    // 移除数据库类型选择事件监听器
    if (this.sqlOptimizationDatabaseType && this._sqlOptimizationDatabaseTypeChangeHandler) {
        this.sqlOptimizationDatabaseType.removeEventListener('change', this._sqlOptimizationDatabaseTypeChangeHandler);
        this._sqlOptimizationDatabaseTypeChangeHandler = null;
    }
    // 隐藏描述信息
    const descriptionElement = document.getElementById('sqlOptimizationDatabaseDescription');
    if (descriptionElement) {
        descriptionElement.style.display = 'none';
    }
    this.resetSqlOptimizationForm();
}

/**
 * 从API加载SQL优化数据库类型选项（仅支持KingBase）
 */
/**
 * 从API加载SQL优化数据库类型选项
 */
async function loadSqlOptimizationDatabaseTypes() {
    const select = this.sqlOptimizationDatabaseType;
    if (!select) return;

    try {
        // 使用知识库管理器的方法，传递 'supportSQL' 类型参数
        const apiResult = await this.loadKnowledgeBasesFromAPI('supportSQL');

        if (apiResult.success && apiResult.data && apiResult.data.length > 0) {
            // 存储知识库数据以便后续使用
            this.sqlOptimizationKnowledgeBases = apiResult.data;

            // 清空现有选项（保留占位符选项）
            const placeholderOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (placeholderOption) {
                select.appendChild(placeholderOption);
            } else {
                // 如果没有占位符，创建一个
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = this.t('popup.sqlOptimization.form.databasePlaceholder');
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
                }
            }

            // 绑定数据库类型选择变化事件
            this.bindSqlOptimizationDatabaseTypeChange();

            // 初始化显示当前选中数据库类型的描述
            this.updateSqlOptimizationDatabaseDescription();
            
            // 初始化显示脚本采集器下载地址
            this.updateSqlOptimizationScriptCollectorDownloadLinks();

            console.log(`成功加载 ${apiResult.data.length} 个SQL优化数据库类型选项`);
        } else {
            console.warn('从API加载SQL优化数据库类型失败');
        }
    } catch (error) {
        console.error('加载SQL优化数据库类型失败:', error);
    }
}

function resetSqlOptimizationForm() {
    if (this.sqlOptimizationEmail) {
        this.sqlOptimizationEmail.value = this.sqlOptimizationEmail.value || '';
    }
    if (this.sqlOptimizationFileDisplay) {
        this.sqlOptimizationFileDisplay.value = '';
        this.sqlOptimizationFileDisplay.placeholder = this.t('popup.sqlOptimization.form.uploadPlaceholder');
    }
    if (this.sqlOptimizationFileInput) {
        this.sqlOptimizationFileInput.value = '';
    }
    if (this.sqlOptimizationLanguage) {
        this.sqlOptimizationLanguage.value = 'zh';
    }
    if (this.sqlOptimizationDatabaseType) {
        this.sqlOptimizationDatabaseType.value = '2114'; // 默认KingBase
    }
    if (this.sqlOptimizationAgreeTerms) {
        this.sqlOptimizationAgreeTerms.checked = false;
    }
    this.sqlOptimizationSelectedFile = null;
}

function handleSqlOptimizationFileSelect(e) {
    console.log('SQL优化文件选择事件触发', e);
    const file = e?.target?.files?.[0];
    if (file) {
        console.log('选择的文件:', file.name);
        this.sqlOptimizationSelectedFile = file;
        if (this.sqlOptimizationFileDisplay) {
            this.sqlOptimizationFileDisplay.value = file.name;
            this.sqlOptimizationFileDisplay.placeholder = file.name;
        }
    } else {
        console.log('没有选择文件');
        this.sqlOptimizationSelectedFile = null;
        if (this.sqlOptimizationFileDisplay) {
            this.sqlOptimizationFileDisplay.value = '';
            this.sqlOptimizationFileDisplay.placeholder = this.t('popup.sqlOptimization.form.uploadPlaceholder');
        }
    }
}

async function handleSqlOptimizationSubmit() {
    console.log('SQL优化表单提交开始');
    if (!this.sqlOptimizationSaveBtn || this.sqlOptimizationSaveBtn.disabled) {
        console.log('SQL优化按钮被禁用或不存在');
        return;
    }

    const email = this.sqlOptimizationEmail?.value.trim() || '';
    if (!email) {
        this.showMessage(this.t('popup.message.enterEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.sqlOptimizationEmail?.focus();
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        this.showMessage(this.t('popup.message.invalidEmail'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.sqlOptimizationEmail?.focus();
        return;
    }

    if (!this.sqlOptimizationSelectedFile) {
        this.showMessage(this.t('popup.message.selectFile'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.sqlOptimizationFileUploadBtn?.focus();
        return;
    }

    // 获取选中的数据库类型
    const databaseCode = this.sqlOptimizationDatabaseType?.value || '';
    if (!databaseCode) {
        this.showMessage(this.t('popup.message.selectDatabaseType'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.sqlOptimizationDatabaseType?.focus();
        return;
    }

    if (!this.sqlOptimizationAgreeTerms || !this.sqlOptimizationAgreeTerms.checked) {
        this.showMessage(this.t('popup.message.agreeTerms'), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        this.sqlOptimizationAgreeTerms?.focus();
        return;
    }

    const originalButtonText = this.sqlOptimizationSaveBtn.textContent || '';
    this.sqlOptimizationSaveBtn.disabled = true;

    const formData = {
        username: this.sqlOptimizationUserName?.value.trim() || '',
        email,
        file: this.sqlOptimizationSelectedFile,
        language: this.sqlOptimizationLanguage?.value || 'zh',
        databaseCode
    };

    this.showLoadingOverlay(this.t('popup.sqlOptimization.loading'));
    try {
        const response = await this.submitSqlOptimizationAnalysis(formData);
        this.hideLoadingOverlay();

        if (response && response.status === 'success') {
            if (this.sqlOptimizationHistoryView?.classList.contains('active')) {
                const startTime = this.getDateTimeInputValue('sqlOptimizationStartTime');
                const endTime = this.getDateTimeInputValue('sqlOptimizationEndTime');
                const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
                this.loadSqlOptimizationHistoryList(this.sqlOptimizationHistoryCurrentPage, this.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
            }

            // 根据环境类型显示不同的成功消息
            const envType = await this.getEnvType();
            const successMessage = envType === 'in_env'
                ? this.t('popup.message.sqlOptimizationSubmitSuccessInEnv')
                : this.t('popup.message.sqlOptimizationSubmitSuccess');

            this.showMessage(successMessage, 'success', { centered: true, durationMs: 6000, maxWidth: '380px', background: '#1e7e34' });
            this.hideSqlOptimizationDialog();
        } else {
            const errorMsg = response?.message || this.t('popup.message.sqlOptimizationSubmitFailed', { error: this.t('popup.common.unknownError') });
            this.showMessage(errorMsg, 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
        }
    } catch (error) {
        console.error('提交SQL优化失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.sqlOptimizationSubmitFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true, durationMs: 5000, maxWidth: '360px' });
    } finally {
        this.sqlOptimizationSaveBtn.disabled = false;
        this.sqlOptimizationSaveBtn.textContent = originalButtonText || this.t('popup.sqlOptimization.form.submit');
    }
}

async function submitSqlOptimizationAnalysis(formData) {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
        throw new Error(this.t('popup.message.apiKeyNotConfigured'));
    }

    // 获取当前选择的模型信息（仅在内网环境下）
    let modelParams = null;
    try {
        // 检查环境类型，只有内网环境才传递 modelParams
        const envType = await this.getEnvType();
        console.log('SQL优化 - 当前环境类型:', envType);

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
                    console.log('SQL优化 - 模型参数:', modelParams);
                } else {
                    console.warn('SQL优化 - 未找到选中的模型或服务商:', { selectedModelValue, selectedKey, selectedModel: !!selectedModel, provider: !!provider });
                }
            } else {
                console.warn('SQL优化 - 未选择模型，modelSelect.value 为空');
            }
        } else {
            console.log('SQL优化 - 外网环境，不传递 modelParams');
        }
    } catch (error) {
        console.warn('获取模型参数失败，继续执行SQL优化:', error);
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', formData.file);

    const queryParams = new URLSearchParams();
    queryParams.append('username', formData.username);
    queryParams.append('email', formData.email);
    queryParams.append('language', formData.language || 'zh');
    queryParams.append('diagnosisType', 'sql_optimization');
    if (formData.databaseCode) {
        queryParams.append('code', formData.databaseCode);
    }
    // 添加 modelParams 参数（JSON格式）- 仅在内网环境下
    if (modelParams) {
        queryParams.append('modelParams', JSON.stringify(modelParams));
        console.log('SQL优化 - 已添加 modelParams 到查询参数');
    } else {
        console.log('SQL优化 - modelParams 为空，未添加到查询参数');
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
        console.error('SQL优化接口调用失败:', error);
        throw error;
    }
}

function switchSqlOptimizationTab(tabName) {
    if (this.sqlOptimizationTabs && this.sqlOptimizationTabs.length > 0) {
        this.sqlOptimizationTabs.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
    }

    if (this.sqlOptimizationNewView) {
        this.sqlOptimizationNewView.classList.toggle('active', tabName === 'new');
    }
    if (this.sqlOptimizationHistoryView) {
        this.sqlOptimizationHistoryView.classList.toggle('active', tabName === 'history');
    }

    if (tabName === 'history') {
        // 延迟执行以确保DOM完全渲染
        setTimeout(() => {
            const historyView = document.getElementById('sqlOptimizationHistoryView');
            if (historyView) {
                // 强制清理之前的设置，确保干净的状态
                this.cleanupDateTimeFilters();
                // 重新初始化
                this.setupDateTimeFilters(true, historyView);
                console.log('SQL优化日期时间过滤器初始化完成');
            } else {
                console.error('找不到sqlOptimizationHistoryView元素');
            }
        }, 100);

        // 重置时间过滤器
        this.clearDateTimeInputValue('sqlOptimizationStartTime');
        this.clearDateTimeInputValue('sqlOptimizationEndTime');

        const startTime = '';
        const endTime = '';
        const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
        this.loadSqlOptimizationHistoryList(1, this.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
    }
}

function handleSqlOptimizationSearch() {
    const startTime = this.getDateTimeInputValue('sqlOptimizationStartTime');
    const endTime = this.getDateTimeInputValue('sqlOptimizationEndTime');
    const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
    this.loadSqlOptimizationHistoryList(1, this.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
}

function handleSqlOptimizationReset() {
    const statusSelect = document.getElementById('sqlOptimizationStatusFilter');
    this.clearDateTimeInputValue('sqlOptimizationStartTime');
    this.clearDateTimeInputValue('sqlOptimizationEndTime');
    if (statusSelect) statusSelect.value = '';
    this.loadSqlOptimizationHistoryList(1, this.sqlOptimizationHistoryPageSize, '', '', '', '');
}

async function loadSqlOptimizationHistoryList(page = 1, pageSize = 10, keyword = '', startTime = '', endTime = '', status = '') {
    try {
        // 确保知识库列表已经加载完成
        if (!this.knowledgeBases) {
            const apiResult = await this.loadKnowledgeBasesFromAPI('supportSQL');
            if (apiResult.success && apiResult.data) {
                this.knowledgeBases = apiResult.data;
            }
        }

        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            this.showMessage(this.t('popup.message.apiKeyNotConfigured'), 'error');
            return;
        }

        let username = this.sqlOptimizationUserName?.value.trim() || '';

        if (!username) {
            try {
                const result = await chrome.storage.sync.get(['registration']);
                const registration = result.registration;
                if (registration && registration.status === 'registered' && registration.username) {
                    username = registration.username;
                    if (this.sqlOptimizationUserName) {
                        this.sqlOptimizationUserName.value = username;
                    }
                }
            } catch (error) {
                console.error('获取注册信息失败:', error);
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
            diagnosisType: 'sql_optimization'
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

        this.showLoadingOverlay(this.t('popup.sqlOptimization.history.loadingHistory'));

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
                console.log('SQL优化历史列表接口返回的数据示例（第一个item的所有字段）:', list[0]);
                console.log('可用字段列表:', Object.keys(list[0]));
            }

            try {
                await this.i18n.ensureLanguage(this.currentLanguage);
            } catch (ensureError) {
                console.warn('加载SQL优化历史记录时语言包未准备就绪:', ensureError);
            }

            this.sqlOptimizationHistoryList = list.map(item => {
                const parsedCreateTime = typeof this.parseDateTime === 'function'
                    ? this.parseDateTime(item.createdAt)
                    : item.createdAt;

                // 尝试多个可能的文件名字段（按优先级顺序）
                let fileName = item.sqlOptimizationFilename
                    || item.sqlOptimizationFileName
                    || item.sqlOptimization_file_name
                    || item.sqlOptimization_filename
                    || item.filename
                    || item.fileName
                    || item.file_name
                    || item.originalFilename
                    || item.originalFileName
                    || item.original_filename
                    || '';

                // 如果还是没有找到文件名，尝试从 fileUrl 中提取文件名
                if (!fileName) {
                    const fileUrl = item.sqlOptimizationFileurl || item.fileUrl || item.file_url || '';
                    if (fileUrl) {
                        try {
                            const urlParts = fileUrl.split('/');
                            fileName = urlParts[urlParts.length - 1] || '';
                            if (fileName.includes('?')) {
                                fileName = fileName.split('?')[0];
                            }
                        } catch (e) {
                            console.warn('从文件URL提取文件名失败:', e);
                        }
                    }
                }

                // 尝试多个可能的数据库类型字段
                let databaseType = item.code
                    || item.databaseType
                    || item.dbType
                    || item.database_type
                    || item.db_type
                    || item.sqlOptimizationType
                    || item.sqlOptimization_type
                    || item.type
                    || '';

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
                    fileUrl: item.sqlOptimizationFileurl || item.fileUrl || null
                };
            });

            this.sqlOptimizationHistoryTotal = data.total || 0;
            this.sqlOptimizationHistoryCurrentPage = data.pageNum || page;
            this.sqlOptimizationHistoryPageSize = data.pageSize || pageSize;

            await this.renderSqlOptimizationHistoryList();
            this.updateSqlOptimizationPagination();
        } else {
            throw new Error(result.message || this.t('popup.sqlOptimization.history.loadFailedFallback'));
        }

        this.hideLoadingOverlay();
    } catch (error) {
        console.error('加载SQL优化历史记录失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.sqlOptimizationLoadHistoryFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error');
        this.sqlOptimizationHistoryList = [];
        this.sqlOptimizationHistoryTotal = 0;
        this.sqlOptimizationHistoryCurrentPage = 1;
        await this.renderSqlOptimizationHistoryList();
        this.updateSqlOptimizationPagination();
    }
}

async function renderSqlOptimizationHistoryList() {
    const tbody = document.getElementById('sqlOptimizationHistoryList');
    const table = document.getElementById('sqlOptimizationHistoryTable');
    if (!tbody || !table) return;

    if (!this.sqlOptimizationHistoryList || this.sqlOptimizationHistoryList.length === 0) {
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
            const emptyTitle = this.t('popup.sqlOptimization.history.emptyTitle');
            const emptySubtitle = this.t('popup.sqlOptimization.history.emptySubtitle');
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
    const rows = await Promise.all(this.sqlOptimizationHistoryList.map(item => this.createSqlOptimizationHistoryTableRow(item)));
    rows.forEach(row => tbody.appendChild(row));

    // 根据环境类型控制表头邮箱列的显示
    const envType = await this.getEnvType();
    const isInEnv = envType === 'in_env';
    const emailHeader = table.querySelector('thead th[data-i18n="popup.sqlOptimization.table.email"]');
    if (emailHeader) {
        emailHeader.style.display = isInEnv ? 'none' : '';
    }

    // 检查是否有 running 状态的任务，如果有则显示通知覆盖层
    const hasRunningTask = this.sqlOptimizationHistoryList.some(item => item.status === 'running');
    if (hasRunningTask) {
        this.showLoadingOverlay(this.t('popup.sqlOptimization.history.overlayAnalyzing', '正在执行优化，请稍候...'));
    }
}

async function createSqlOptimizationHistoryTableRow(item) {
    const tr = document.createElement('tr');
    tr.className = 'awr-history-row';

    const locale = this.i18n?.getIntlLocale(this.currentLanguage);
    let createTime = this.t('popup.sqlOptimization.history.unknown');
    if (item.createTime) {
        try {
            const date = new Date(item.createTime);
            if (!Number.isNaN(date.getTime())) {
                createTime = date.toLocaleString(locale);
            }
        } catch (error) {
            console.error('SQL优化历史记录日期解析失败:', error);
        }
    }

    const statusText = this.getSqlOptimizationStatusText(item.status);
    const statusClass = this.getSqlOptimizationStatusClass(item.status);
    const notifyStatusText = this.getSqlOptimizationNotifyStatusText(item.notifyStatus);
    const notifyStatusClass = this.getSqlOptimizationNotifyStatusClass(item.notifyStatus);

    // 检查环境类型，内网环境下隐藏重发邮件按钮
    const envType = await this.getEnvType();
    const isInEnv = envType === 'in_env';

    const isResendDisabled = item.status !== 'success';
    const resendDisabledAttr = isResendDisabled ? 'disabled' : '';
    const resendDisabledClass = isResendDisabled ? 'disabled' : '';
    const resendTitle = isResendDisabled
        ? this.t('popup.sqlOptimization.history.resendDisabledTooltip')
        : this.t('popup.sqlOptimization.history.resendTooltip');

    const problemDesc = item.problemDescription || '';
    const problemPreview = problemDesc.length > 30 ? `${problemDesc.substring(0, 30)}...` : problemDesc;

    const fileName = item.fileName || '';
    const fileNamePreview = fileName.length > 20 ? `${fileName.substring(0, 20)}...` : fileName;

    const noFileText = this.t('popup.sqlOptimization.history.notSpecified');
    const unknownText = this.t('popup.sqlOptimization.history.unknown');
    const languageKeyMap = {
        zh: 'popup.sqlOptimization.history.language.zh',
        en: 'popup.sqlOptimization.history.language.en'
    };
    const languageCode = typeof item.language === 'string' ? item.language.toLowerCase() : '';
    const languageKey = languageKeyMap[languageCode] || 'popup.sqlOptimization.history.language.unknown';
    const languageText = this.t(languageKey);
    const resendButtonLabel = this.t('popup.sqlOptimization.history.resendButton');
    const downloadButtonLabel = this.t('popup.sqlOptimization.history.downloadButton') || '下载';
    const downloadTitle = this.t('popup.sqlOptimization.history.downloadTooltip') || '下载报告';

    // 只有状态为成功时才显示下载按钮
    const canDownload = item.status === 'success';
    const downloadButtonHtml = canDownload 
        ? `<button class="awr-action-btn download-btn" data-id="${escapeHtml(String(item.id ?? ''))}" title="${escapeHtml(downloadTitle)}">
            ${escapeHtml(downloadButtonLabel)}
        </button>`
        : '';
    
    // 内网环境下隐藏重发邮件按钮
    const resendButtonHtml = isInEnv ? '' : `<button class="awr-action-btn resend-email-btn ${resendDisabledClass}" data-id="${escapeHtml(String(item.id ?? ''))}" title="${escapeHtml(resendTitle)}" ${resendDisabledAttr}>
        ${escapeHtml(resendButtonLabel)}
    </button>`;

    // 内网环境下隐藏邮箱列
    const emailCellHtml = isInEnv ? '' : `<td class="awr-table-cell-email copyable-cell" data-full-text="${escapeHtml(item.email || unknownText)}" title="${escapeHtml(item.email || unknownText)}">${escapeHtml(item.email || unknownText)}</td>`;

    // 数据库类型固定为KingBase
    const typeText = 'KingBase';

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

    const resendBtn = tr.querySelector('.resend-email-btn');
    if (resendBtn && !isResendDisabled && !isInEnv) {
        resendBtn.addEventListener('click', () => {
            this.handleSqlOptimizationResend(item);
        });
    }

    const downloadBtn = tr.querySelector('.download-btn');
    if (downloadBtn && canDownload) {
        downloadBtn.addEventListener('click', () => {
            this.handleSqlOptimizationDownload(item);
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

function getSqlOptimizationStatusText(status) {
    const key = {
        'pending': 'popup.sqlOptimization.history.status.pending',
        'success': 'popup.sqlOptimization.history.status.success',
        'failed': 'popup.sqlOptimization.history.status.failed',
        'running': 'popup.sqlOptimization.history.status.running',
        'unknown': 'popup.sqlOptimization.history.status.unknown'
    }[status] || 'popup.sqlOptimization.history.status.unknown';
    return this.t(key);
}

function getSqlOptimizationStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'success': 'status-success',
        'failed': 'status-failed',
        'running': 'status-running',
        'unknown': 'status-unknown'
    };
    return classMap[status] || '';
}

function getSqlOptimizationNotifyStatusText(status) {
    const key = {
        'pending': 'popup.sqlOptimization.history.notifyStatus.pending',
        'success': 'popup.sqlOptimization.history.notifyStatus.success',
        'failed': 'popup.sqlOptimization.history.notifyStatus.failed',
        'unknown': 'popup.sqlOptimization.history.notifyStatus.unknown'
    }[status] || 'popup.sqlOptimization.history.notifyStatus.unknown';
    return this.t(key);
}

function getSqlOptimizationNotifyStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'success': 'status-success',
        'failed': 'status-failed',
        'unknown': 'status-unknown'
    };
    return classMap[status] || '';
}

function updateSqlOptimizationPagination() {
    const totalPages = Math.ceil(this.sqlOptimizationHistoryTotal / this.sqlOptimizationHistoryPageSize);
    const pageInfo = document.getElementById('sqlOptimizationPageInfo');
    const prevBtn = document.getElementById('sqlOptimizationPrevPageBtn');
    const nextBtn = document.getElementById('sqlOptimizationNextPageBtn');

    if (pageInfo) {
        const safeTotalPages = totalPages > 0 ? totalPages : 1;
        pageInfo.textContent = this.t('popup.sqlOptimization.pagination.info', {
            current: this.sqlOptimizationHistoryCurrentPage,
            total: safeTotalPages,
            records: this.sqlOptimizationHistoryTotal
        });
    }

    if (prevBtn) {
        prevBtn.disabled = this.sqlOptimizationHistoryCurrentPage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = this.sqlOptimizationHistoryCurrentPage >= totalPages || totalPages === 0;
    }
}

async function handleSqlOptimizationResend(item) {
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
        this.showLoadingOverlay(this.t('popup.sqlOptimization.history.resendingEmail'));

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
            this.showMessage(this.t('popup.message.sqlOptimizationResendSuccess'), 'success', { centered: true });
            const startTime = this.getDateTimeInputValue('sqlOptimizationStartTime');
            const endTime = this.getDateTimeInputValue('sqlOptimizationEndTime');
            const status = document.getElementById('sqlOptimizationStatusFilter')?.value || '';
            this.loadSqlOptimizationHistoryList(this.sqlOptimizationHistoryCurrentPage, this.sqlOptimizationHistoryPageSize, '', startTime, endTime, status);
        } else {
            const errorMessage = result.message || (result.status ? `Resend failed: ${result.status}` : this.t('popup.common.unknownError'));
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('SQL优化重发邮件失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.sqlOptimizationResendFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true });
    }
}

async function handleSqlOptimizationDownload(item) {
    const optimizationId = item.id || item.optimization_id;
    if (!optimizationId) {
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
        this.showLoadingOverlay(this.t('popup.common.downloading'));

        // POST 请求，参数 diagnosis_id 作为 URL 参数
        url.searchParams.append('diagnosis_id', optimizationId);

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

        // 确保文件扩展名始终为 .html
        let fileName;
        if (item.fileName) {
            // 如果存在文件名，去掉原有扩展名，添加 .html 后缀
            const nameWithoutExt = item.fileName.replace(/\.[^/.]+$/, '');
            fileName = `${nameWithoutExt}.html`;
        } else {
            fileName = `sql_optimization_report_${optimizationId}.html`;
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
        console.error('SQL优化下载失败:', error);
        this.hideLoadingOverlay();
        this.showMessage(this.t('popup.message.downloadFailed', { error: error.message || this.t('popup.common.unknownError') }), 'error', { centered: true });
    }
}

// SQL优化脚本采集器选项显示
async function showSqlOptimizationScriptCollectorOptions() {
    console.log('SQL优化：showSqlOptimizationScriptCollectorOptions 被调用');
    console.log('SQL优化：this 对象:', this);
    console.log('SQL优化：this.showSqlOptimizationScriptCollectorOptions:', typeof this.showSqlOptimizationScriptCollectorOptions);
    const downloadOptions = document.getElementById('sqlOptimizationPluginDownloadOptions');
    const statusDiv = document.getElementById('sqlOptimizationScriptCollectorStatus');

    console.log('SQL优化：downloadOptions 元素:', downloadOptions);
    if (!downloadOptions) {
        console.error('未找到SQL优化下载选项元素 sqlOptimizationPluginDownloadOptions');
        return;
    }

    // 如果已经显示，则隐藏；否则显示
    console.log('SQL优化：当前显示状态:', downloadOptions.style.display);
    if (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block') {
        console.log('SQL优化：卡片已显示，执行隐藏');
        hideDownloadOptions(downloadOptions);
        return;
    }

    // 每次都重新获取数据（暂时移除缓存检查）

    try {

        // 显示加载状态
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.className = 'script-collector-status loading';
            statusDiv.textContent = this.t('popup.sqlOptimization.form.loadingScriptCollector', '正在加载脚本采集器信息...');
        }

        // 获取用户当前版本
        const userProfile = await this.getUserProfile();
        const userPluginVersion = userProfile?.pluginversion || {};
        // 解析 pluginversion 对象
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'sqlOptimization');

        const latestList = await this.fetchLatestPluginsListSqlOptimization('2114', { force: true });
        console.log('SQL优化：获取到的插件列表:', latestList);

        // 渲染脚本采集器卡片
        renderSqlOptimizationScriptCollectorCards.call(this, {
            latestList,
            userPluginVersions,
            show: true
        });

        // 显示下载选项（带动画效果）
        showSqlOptimizationDownloadOptionsWithAnimation(downloadOptions);

        // 隐藏加载状态
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        // 绑定下载按钮事件（动态生成，使用事件委托）
        downloadOptions.onclick = (e) => {
            const btn = e.target.closest('.btn-download-plugin');
            if (btn && btn.dataset.os) {
                this.downloadSqlOptimizationPluginFile(btn.dataset.os);
            }
        };

        // 动态检查脚本采集器版本
        await this.checkSqlOptimizationScriptCollectorVersion(userProfile);

    } catch (error) {
        console.error('SQL优化显示脚本采集器选项失败:', error);
        if (statusDiv) {
            statusDiv.className = 'script-collector-status error';
            statusDiv.textContent = this.t('popup.sqlOptimization.form.loadFailed', '加载失败') + ': ' + (error.message || this.t('popup.common.unknownError'));
        }
    }
}

// 渲染SQL优化脚本采集器卡片（根据接口返回动态生成）
function renderSqlOptimizationScriptCollectorCards({ latestList = [], userPluginVersions = {}, show = false }) {
    const container = document.getElementById('sqlOptimizationPluginDownloadOptions');
    if (!container) return;

    container.innerHTML = '';

    // 如果没有数据但需要显示，显示提示信息
    if (!latestList.length) {
        if (show) {
            // 强制显示时的提示
            container.innerHTML = `
                <div class="script-collector-card">
                    <div class="card-header">
                        <div class="card-title">暂无脚本采集器数据</div>
                    </div>
                    <div class="card-content">
                        <p>无法获取脚本采集器信息，请稍后重试。</p>
                    </div>
                </div>
            `;
            container.style.display = 'flex';
        } else {
            container.style.display = 'none';
        }
        return;
    }

    latestList.forEach(item => {
        const os = item.support_os || 'unknown';
        const latestVersion = item.version || '';
        const userVersion = (userPluginVersions[os] || userPluginVersions.extras?.[os] || '').trim();
        const isDownloaded = !!userVersion;
        const needsUpdate = isDownloaded && latestVersion && userVersion !== latestVersion;

        const currentVersionText = isDownloaded
            ? (needsUpdate ? `${userVersion}${this.t('popup.sqlOptimization.form.needsUpdate')}` : userVersion || this.t('popup.sqlOptimization.form.unknown'))
            : this.t('popup.sqlOptimization.form.notDownloadedShort');

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
                        <span class="plugin-info-label">${this.t('popup.sqlOptimization.form.currentVersion', '当前版本：')}</span>
                        <span class="plugin-info-value">${currentVersionText}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.sqlOptimization.form.latestVersion', '最新版本：')}</span>
                        <span class="plugin-info-value">${latestVersion || this.t('popup.sqlOptimization.form.unknown')}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.sqlOptimization.form.updateDate', '更新日期：')}</span>
                        <span class="plugin-info-value">${formatDateToYMD(item.updatedAt || item.updated_at || '')}</span>
                    </div>
                    <div class="plugin-info-item">
                        <span class="plugin-info-label">${this.t('popup.sqlOptimization.form.md5', 'MD5：')}</span>
                        <span class="plugin-info-value">${item.md5 || ''}</span>
                    </div>
                </div>
                <button type="button" class="btn-download-plugin" data-os="${os}">
                    <span>${this.t('popup.sqlOptimization.form.download', '下载')}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    container.style.display = show ? 'flex' : 'none';
}

// 隐藏下载选项容器
function hideDownloadOptions(downloadOptions) {
    if (!downloadOptions) return;
    downloadOptions.classList.remove('show');
    // 等待动画完成后再隐藏
    setTimeout(() => {
        downloadOptions.style.display = 'none';
    }, 400);
}

// 显示下载选项容器（带动画效果）
function showSqlOptimizationDownloadOptionsWithAnimation(downloadOptions) {
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

// 获取当前选择的SQL优化脚本采集器编码
function getSelectedSqlOptimizationScriptCollectorCode() {
    // 直接复用"新建优化"下拉框的数据库 code
    const value = this.sqlOptimizationDatabaseType?.value;

    // 如果没有值，返回空字符串，让调用方决定如何处理
    return (value || '').trim();
}

// 下载SQL优化插件文件
async function downloadSqlOptimizationPluginFile(supportOs) {
    const downloadBtn = document.querySelector(`#sqlOptimizationPluginDownloadOptions .btn-download-plugin[data-os="${supportOs}"]`);

    let originalText = '';
    try {
        // 禁用按钮
        if (downloadBtn) {
            downloadBtn.disabled = true;
            originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<span>下载中...</span>';
        }

        // 获取插件信息
        const pluginInfo = await this.getSqlOptimizationRemoteScriptPackageInfo(supportOs);
        const pluginId = pluginInfo.plugin_id;

        if (!pluginId) {
            throw new Error('未找到插件ID');
        }

        // 下载插件
        const osName = supportOs ? supportOs.toUpperCase() : 'UNKNOWN';
        const downloadingText = `正在下载${osName}版本...`;
        this.showMessage(downloadingText, 'info', { centered: true, replaceExisting: true, durationMs: 1800 });

        // 调用下载方法（复用diagnosis模块的downloadPlugin）
        const blob = await this.downloadPlugin(pluginId, supportOs, pluginInfo.version);
        const filename = `sql_optimization_tools_${supportOs}_${pluginInfo.version || 'latest'}.zip`;
        this.triggerDownload(blob, filename);

        // 更新用户插件版本信息
        if (pluginInfo.version) {
            // 确保知识库数据已加载，以便正确获取数据库类型名称
            if (!this.knowledgeBases) {
                console.log('下载前加载知识库数据...');
                const apiResult = await this.loadKnowledgeBasesFromAPI('supportSQL');
                if (apiResult.success && apiResult.data) {
                    this.knowledgeBases = apiResult.data;
                }
            }
            await this.updatePluginVersion(supportOs, pluginInfo.version, 'sqlOptimization');
        }

        // 延迟显示成功消息，避免与下载中消息重叠
        setTimeout(() => {
            this.showMessage('下载成功', 'success', { centered: true, replaceExisting: true, durationMs: 2200 });
        }, 300);

        // 刷新版本检查和显示
        await this.checkSqlOptimizationScriptCollectorVersion(await this.getUserProfile());

        // 下载完成后实时更新脚本采集器列表（仿照巡检诊断功能）
        setTimeout(async () => {
            console.log('SQL优化下载完成，开始刷新脚本采集器列表');
            // 如果下载选项已显示，刷新显示内容（保持显示状态）
            const downloadOptions = document.getElementById('sqlOptimizationPluginDownloadOptions');
            if (downloadOptions && (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block')) {
                // 直接刷新内容，保持显示状态
                await this.refreshSqlOptimizationScriptPackage(true);
            }
        }, 1500);

    } catch (error) {
        console.error('SQL优化下载插件文件失败:', error);
        this.showMessage('下载失败: ' + (error.message || '未知错误'), 'error', { centered: true });
    } finally {
        // 恢复按钮状态
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
        }
    }
}

// 获取最新插件列表
async function fetchLatestPluginsList(code = '2101', options = { force: false }) {
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
            pluginType: 'sql_optimization',
            code: code || '',
            version: '',
            md5: '',
            path: '',
            supportOs: ''
        };

        console.log(`正在获取最新插件列表 (code: ${code})`);
        const result = await this.requestUtil.post(url, requestBody, { provider: tempProvider });

        if (result.status === 'success' && result.data) {
            const pluginList = Array.isArray(result.data) ? result.data : [];
            console.log(`成功获取 ${pluginList.length} 个插件信息`);

            // 缓存结果
            this.latestPluginListCache[cacheKey] = pluginList;
            return pluginList;
        } else {
            console.warn('获取插件列表失败:', result);
            return [];
        }
    } catch (error) {
        console.error('获取最新插件列表失败:', error);
        // 返回缓存的结果（如果有的话）
        return this.latestPluginListCache[cacheKey] || [];
    }
}

// 获取SQL优化远程脚本包信息
async function getSqlOptimizationRemoteScriptPackageInfo(supportOs) {
    try {
        const latestList = await this.fetchLatestPluginsListSqlOptimization('2114', {});
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

        console.warn(`未找到${supportOs}版本的SQL优化脚本采集器（code=${code}）`);
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
        console.error('获取SQL优化远程脚本包信息失败:', error);
        return {
            plugin_id: '',
            version: '',
            md5: '',
            path: '',
            supportOs: supportOs,
            createdAt: '',
            updatedAt: ''
        };
    }
}

// 检查SQL优化脚本采集器版本
async function checkSqlOptimizationScriptCollectorVersion(userProfileData = null, options = {}) {
    const { preserveVisibility = false } = options || {};
    const statusDiv = document.getElementById('sqlOptimizationScriptCollectorStatus');
    const downloadOrUpdateBtn = document.getElementById('sqlOptimizationDownloadOrUpdateScriptCollectorBtn');
    const downloadOptions = document.getElementById('sqlOptimizationPluginDownloadOptions');
    const keepCardsVisible = preserveVisibility && downloadOptions && (downloadOptions.style.display === 'flex' || downloadOptions.style.display === 'block');

    try {
        // 获取用户信息（如果未传入，则调用接口获取）
        let userProfile = userProfileData;
        if (!userProfile) {
            userProfile = await this.getUserProfile();
        }
        const userPluginVersion = userProfile?.pluginversion || {};
        // 解析 pluginversion 对象
        const userPluginVersions = parsePluginVersion(userPluginVersion, 'sqlOptimization');
        const hasAnyUserVersion = Boolean(
            userPluginVersions.windows ||
            userPluginVersions.linux ||
            (userPluginVersions.extras && Object.keys(userPluginVersions.extras).length)
        );

        // 检查pluginversion对象是否为空（没有sqlOptimization数据）
        const hasPluginVersionData = userPluginVersion && 
            (userPluginVersion.sqlOptimization && Array.isArray(userPluginVersion.sqlOptimization) && userPluginVersion.sqlOptimization.length > 0);

        // 如果没有版本号，标记状态但继续渲染卡片
        if (!hasPluginVersionData || !hasAnyUserVersion) {
            if (statusDiv) {
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status info';
                statusDiv.textContent = this.t('popup.sqlOptimization.form.notDownloaded', '监测到您还未下载过脚本采集器');
            }
            if (downloadOrUpdateBtn) {
                downloadOrUpdateBtn.textContent = this.t('popup.sqlOptimization.form.downloadScriptCollector', '下载脚本采集器');
            }
        }

        // 获取最新插件列表（直接使用KingBase数据库代码）
        const latestList = await this.fetchLatestPluginsListSqlOptimization('2114', {});

        // 缓存按操作系统的最新信息
        this.latestPluginInfoCache = {};
        latestList.forEach(item => {
            if (item.support_os) {
                this.latestPluginInfoCache[item.support_os] = item;
            }
        });

        // 注意：这里不渲染卡片，只缓存数据和更新按钮状态
        // 卡片的渲染只在点击按钮时进行，避免重复渲染

        // 状态判定
        let hasUpdateNeeded = false;
        let hasUndownloadedOs = false;
        latestList.forEach(item => {
            const os = item.support_os;
            if (!os) return;

            const remoteVersion = item.version;
            const userVersion = userPluginVersions[os] || userPluginVersions.extras?.[os];

            if (userVersion && remoteVersion && remoteVersion !== userVersion) {
                hasUpdateNeeded = true;
            } else if (!userVersion) {
                hasUndownloadedOs = true;
            }
        });

        // 更新UI状态
        if (statusDiv) {
            if (hasUpdateNeeded) {
                // 有版本需要更新
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status info';
                statusDiv.textContent = this.t('popup.sqlOptimization.form.newVersionAvailable', '检测到新版本可用');
            } else if (hasUndownloadedOs) {
                // 有未下载的操作系统版本
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status info';
                statusDiv.textContent = this.t('popup.sqlOptimization.form.partialDownloaded', '部分版本未下载，点击查看详情');
            } else if (hasAnyUserVersion) {
                // 所有可用版本都已下载且是最新的
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status success';
                statusDiv.textContent = this.t('popup.sqlOptimization.form.allVersionsLatest', '各版本插件均是最新版本');
            } else {
                // 没有下载任何版本
                statusDiv.style.display = 'none';
                statusDiv.className = 'script-collector-status info';
                statusDiv.textContent = this.t('popup.sqlOptimization.form.notDownloaded', '监测到您还未下载过脚本采集器');
            }
        }

        if (downloadOrUpdateBtn) {
            if (hasUpdateNeeded) {
                downloadOrUpdateBtn.textContent = this.t('popup.sqlOptimization.form.updateScriptCollector', '更新脚本采集器');
            } else {
                downloadOrUpdateBtn.textContent = this.t('popup.sqlOptimization.form.downloadScriptCollector', '下载脚本采集器');
            }
        }

    } catch (error) {
        console.error('检查SQL优化脚本采集器版本失败:', error);
    }
}

// 辅助函数
function convertStatusNumberToString(status) {
    const statusMap = {
        0: 'pending',
        1: 'success',
        2: 'failed',
        3: 'running'
    };
    return statusMap[status] || 'unknown';
}

function formatDateTime(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 绑定SQL优化数据库类型选择变化事件
 */
function bindSqlOptimizationDatabaseTypeChange() {
    if (!this.sqlOptimizationDatabaseType) return;

    // 移除之前的事件监听器（如果存在）
    if (this._sqlOptimizationDatabaseTypeChangeHandler) {
        this.sqlOptimizationDatabaseType.removeEventListener('change', this._sqlOptimizationDatabaseTypeChangeHandler);
    }

    // 创建新的事件处理器
    this._sqlOptimizationDatabaseTypeChangeHandler = (event) => {
        this.updateSqlOptimizationDatabaseDescription();
        this.updateSqlOptimizationScriptCollectorDownloadLinks();
    };

    // 添加事件监听器
    this.sqlOptimizationDatabaseType.addEventListener('change', this._sqlOptimizationDatabaseTypeChangeHandler);
}

/**
 * 更新SQL优化数据库类型描述显示
 */
function updateSqlOptimizationDatabaseDescription() {
    const descriptionElement = document.getElementById('sqlOptimizationDatabaseDescription');
    if (!descriptionElement) return;

    const select = this.sqlOptimizationDatabaseType;
    if (!select || !this.sqlOptimizationKnowledgeBases) {
        descriptionElement.style.display = 'none';
        return;
    }

    const selectedValue = select.value;
    if (!selectedValue) {
        descriptionElement.style.display = 'none';
        return;
    }

    // 查找对应的知识库项
    const selectedKb = this.sqlOptimizationKnowledgeBases.find(kb => (kb.id || kb.code) === selectedValue);

    if (selectedKb && selectedKb.tips) {
        try {
            // 从tips JSON字符串中解析描述信息
            const tipsData = JSON.parse(selectedKb.tips);
            const sqlTips = tipsData.sql;

            if (sqlTips && sqlTips.tips && sqlTips.tips.trim()) {
                // 显示描述信息
                descriptionElement.textContent = sqlTips.tips;
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
 * 更新SQL优化脚本采集器下载地址显示
 */
function updateSqlOptimizationScriptCollectorDownloadLinks() {
    const downloadLinksContainer = document.getElementById('sqlOptimizationScriptCollectorDownloadLinks');
    const downloadLabel = document.getElementById('sqlOptimizationScriptCollectorDownloadLabel');
    const giteeLink = document.getElementById('sqlOptimizationScriptCollectorGiteeLink');
    const githubLink = document.getElementById('sqlOptimizationScriptCollectorGithubLink');

    if (!downloadLinksContainer || !downloadLabel || !giteeLink || !githubLink) return;

    const select = this.sqlOptimizationDatabaseType;
    if (!select || !this.sqlOptimizationKnowledgeBases) {
        downloadLinksContainer.style.display = 'none';
        return;
    }

    const selectedValue = select.value;
    if (!selectedValue) {
        downloadLinksContainer.style.display = 'none';
        return;
    }

    // 查找对应的知识库项
    const selectedKb = this.sqlOptimizationKnowledgeBases.find(kb => (kb.id || kb.code) === selectedValue);
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

// 刷新SQL优化脚本采集器列表（仿照巡检诊断的refreshScriptPackage）
async function refreshSqlOptimizationScriptPackage(keepCardsVisible = false) {
    const statusDiv = document.getElementById('sqlOptimizationScriptCollectorStatus');
    const downloadOptions = document.getElementById('sqlOptimizationPluginDownloadOptions');

    console.log('开始刷新SQL优化脚本采集器列表, keepCardsVisible:', keepCardsVisible);

    try {
        // 显示加载状态
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.className = 'script-collector-status loading';
            statusDiv.textContent = this.t('popup.sqlOptimization.form.loadingScriptCollector', '正在加载脚本采集器信息...');
        }

        // 只有在不保持显示时才隐藏下载选项
        if (downloadOptions && !keepCardsVisible) {
            downloadOptions.style.display = 'none';
        }

        // 直接刷新数据，不调用showSqlOptimizationScriptCollectorOptions（避免收起卡片）
        if (keepCardsVisible && downloadOptions) {
            try {
                // 获取API密钥
                const apiKey = this.resolveApiKey();
                if (!apiKey) {
                    console.warn('刷新SQL优化脚本采集器：未找到API密钥，跳过数据刷新');
                    // 重置状态文本，显示无数据状态
                    if (statusDiv) {
                        statusDiv.className = 'script-collector-status info';
                        statusDiv.textContent = '无法刷新：未配置API密钥';
                    }
                    // 即使没有API密钥，也要确保卡片保持显示状态
                    return;
                }

                // 获取用户信息（包含用户绑定的pluginversion）
                const userProfile = await this.getUserProfile();
                const userPluginVersions = parsePluginVersion(userProfile.pluginversion || {}, 'sqlOptimization');
                const code = this.getSelectedSqlOptimizationScriptCollectorCode();

                console.log('刷新SQL优化脚本采集器：获取插件列表, code:', code);
                const latestList = await this.fetchLatestPluginsListSqlOptimization(code, { force: true });

                console.log('刷新SQL优化脚本采集器：获取到列表数据, length:', latestList?.length || 0);

                // 重新渲染脚本采集器卡片，保持显示状态
                renderSqlOptimizationScriptCollectorCards.call(this, {
                    latestList: latestList || [],
                    userPluginVersions,
                    show: true  // 强制保持显示状态
                });

                // 刷新成功，重置状态文本
                if (statusDiv) {
                    statusDiv.className = 'script-collector-status success';
                    statusDiv.textContent = '脚本采集器信息已更新';
                    // 3秒后隐藏状态提示
                    setTimeout(() => {
                        if (statusDiv && statusDiv.textContent === '脚本采集器信息已更新') {
                            statusDiv.style.display = 'none';
                        }
                    }, 3000);
                }

                console.log('SQL优化脚本采集器列表刷新完成，保持显示状态');
            } catch (refreshError) {
                console.error('刷新SQL优化脚本采集器数据失败:', refreshError);
                // 即使刷新失败，也要确保卡片保持显示状态
                // 不抛出错误，避免触发外层的错误处理
            }
        } else {
            // 如果不需要保持显示状态，重新调用显示函数
            await this.showSqlOptimizationScriptCollectorOptions();
        }

    } catch (error) {
        console.error('刷新SQL优化脚本采集器列表失败:', error);

        if (statusDiv) {
            statusDiv.className = 'script-collector-status error';
            statusDiv.textContent = this.t('popup.sqlOptimization.form.loadFailed', '加载失败') + ': ' + (error.message || this.t('popup.common.unknownError'));
        }
    }
}
