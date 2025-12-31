/**
 * 版本管理工具
 * 统一从 manifest.json 读取版本号，避免在多个地方硬编码版本号
 */

let versionCache = null;

/**
 * 从 manifest.json 加载版本号
 * @returns {Promise<string>} 版本号，如 "1.1"
 */
async function loadVersion(forceRefresh = false) {
    // 如果强制刷新，清除缓存
    if (forceRefresh) {
        versionCache = null;
    }
    
    if (versionCache) {
        return versionCache;
    }

    try {
        // 优先使用 chrome.runtime.getManifest()，这是实时的，不会有缓存问题
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
            const manifest = chrome.runtime.getManifest();
            versionCache = manifest.version || '1.1';
            console.log('[version.js] 从 chrome.runtime.getManifest 获取版本号:', versionCache);
            return versionCache;
        }
        
        // 如果 chrome.runtime.getManifest 不可用，则从文件读取
        const response = await fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`Failed to load manifest.json: ${response.status}`);
        }
        const manifest = await response.json();
        versionCache = manifest.version || '1.1';
        console.log('[version.js] 从 manifest.json 文件获取版本号:', versionCache);
        return versionCache;
    } catch (error) {
        console.error('[version.js] 加载版本号失败:', error);
        // 返回默认版本号作为后备
        versionCache = '1.1';
        return versionCache;
    }
}

/**
 * 获取应用版本号（异步）
 * @returns {Promise<string>} 版本号，如 "1.1"
 */
export async function getVersion() {
    return await loadVersion();
}

/**
 * 获取应用版本号（同步，如果已缓存）
 * @returns {string|null} 版本号，如果未缓存则返回null
 */
export function getVersionSync() {
    return versionCache;
}

/**
 * 获取带 "v" 前缀的版本号（异步）
 * @returns {Promise<string>} 版本号，如 "v1.1"
 */
export async function getVersionWithPrefix() {
    const version = await loadVersion();
    return `v${version}`;
}

/**
 * 预加载版本号（在应用启动时调用）
 */
export async function preloadVersion() {
    await loadVersion();
}

