// 知识库管理器 - 简化版本
class KnowledgeBaseManager {
    constructor() {
        this.knowledgeBases = [];
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            await this.loadKnowledgeBases();
            this.initialized = true;
            console.log('知识库管理器初始化完成');
        } catch (error) {
            console.error('知识库管理器初始化失败:', error);
            // 使用默认知识库
            this.loadDefaultKnowledgeBases();
            this.initialized = true;
        }
    }

    async loadKnowledgeBases() {
        try {
            // 尝试从配置文件加载
            const configUrl = chrome.runtime.getURL('config/knowledge_bases.json');
            const response = await fetch(configUrl, {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`配置文件加载失败: ${response.status}`);
            }
            
            const config = await response.json();
            this.knowledgeBases = config.knowledge_bases || [];
            console.log('从配置文件加载知识库:', this.knowledgeBases.length, '个');
            
        } catch (error) {
            console.error('加载知识库配置失败:', error);
            // 使用默认知识库
            this.loadDefaultKnowledgeBases();
        }
    }

    loadDefaultKnowledgeBases() {
        console.log('使用默认知识库配置');
        
        this.knowledgeBases = [
            { id: "2101", name: "Oracle", dataset_name: "Oracle 知识库" },
            { id: "2102", name: "MySQL兼容", dataset_name: "MySQL兼容 知识库" },
            { id: "2103", name: "达梦", dataset_name: "达梦 知识库" },
            { id: "2104", name: "PG兼容生态", dataset_name: "PG兼容生态 知识库" },
            { id: "2105", name: "SQL Server", dataset_name: "SQL Server 知识库" },
            { id: "2106", name: "神通-OSCAR", dataset_name: "神通-OSCAR 知识库" },
            { id: "2107", name: "YashanDB", dataset_name: "YashanDB 知识库" },
            { id: "2108", name: "Redis", dataset_name: "Redis 知识库" },
            { id: "2109", name: "MongoDB", dataset_name: "MongoDB 知识库" },
            { id: "2110", name: "Redis Cluster", dataset_name: "Redis Cluster 知识库" },
            { id: "2111", name: "DB2", dataset_name: "DB2 知识库" },
            { id: "2114", name: "KingBase", dataset_name: "KingBase 知识库" },
            { id: "2115", name: "Gbase", dataset_name: "Gbase 知识库" },
            { id: "2116", name: "磐维", dataset_name: "磐维 知识库" },
            { id: "2117", name: "OpenGauss", dataset_name: "OpenGauss 知识库" },
            { id: "2201", name: "TDSQL", dataset_name: "TDSQL 知识库" },
            { id: "2202", name: "GaussDB", dataset_name: "GaussDB 知识库" },
            { id: "2203", name: "OceanBase", dataset_name: "OceanBase 知识库" },
            { id: "2204", name: "TiDB", dataset_name: "TiDB 知识库" },
            { id: "2205", name: "GoldenDB", dataset_name: "GoldenDB 知识库" },
            { id: "2206", name: "Gbase 分布式", dataset_name: "Gbase 分布式 知识库" },
            { id: "1111", name: "操作系统", dataset_name: "操作系统 知识库" }
        ];
        
        console.log('默认知识库加载完成:', this.knowledgeBases.length, '个');
    }

    // 获取所有知识库
    getKnowledgeBases() {
        return this.knowledgeBases;
    }

    // 根据ID获取知识库
    getKnowledgeBaseById(id) {
        return this.knowledgeBases.find(kb => kb.id === id);
    }

    // 根据名称获取知识库
    getKnowledgeBaseByName(name) {
        return this.knowledgeBases.find(kb => kb.name === name);
    }

    // 获取知识库分类
    getKnowledgeBaseCategory(id) {
        if (id.startsWith('21')) {
            return '关系型数据库';
        } else if (id.startsWith('22')) {
            return '分布式数据库';
        } else if (id.startsWith('11')) {
            return '操作系统';
        } else {
            return '其他';
        }
    }

    // 刷新知识库列表
    async refreshKnowledgeBases() {
        try {
            await this.loadKnowledgeBases();
            console.log('知识库列表已刷新');
            return true;
        } catch (error) {
            console.error('刷新知识库列表失败:', error);
            return false;
        }
    }

    // 导出知识库配置
    async exportKnowledgeBases() {
        // 从 manifest.json 获取版本号
        const { getVersion } = await import('./utils/version.js');
        const version = await getVersion();

        const exportData = {
            knowledge_bases: this.knowledgeBases,
            export_time: new Date().toISOString(),
            total_count: this.knowledgeBases.length,
            version: version
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge_bases_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('知识库配置已导出');
    }

    // 检查是否已初始化
    isInitialized() {
        return this.initialized;
    }

    // 获取知识库统计信息
    getStatistics() {
        const categories = {};
        this.knowledgeBases.forEach(kb => {
            const category = this.getKnowledgeBaseCategory(kb.id);
            categories[category] = (categories[category] || 0) + 1;
        });

        return {
            total: this.knowledgeBases.length,
            categories: categories,
            initialized: this.initialized
        };
    }
}

// 创建全局知识库管理器实例
window.knowledgeBaseManager = new KnowledgeBaseManager();

// 导出到全局作用域，供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeBaseManager;
} 