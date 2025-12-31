// 测试错误处理逻辑
function testErrorHandling() {
    console.log('=== 测试错误处理逻辑 ===');
    
    // 测试用例1: 大模型服务错误
    const modelError = new Error('大模型服务调用失败: 认证失败，请检查API密钥配置');
    console.log('测试大模型服务错误:', modelError.message);
    
    // 模拟processQuestion中的错误判断逻辑
    let errorType = 'model';
    let errorMessage = '';
    
    if (modelError.message.includes('知识库查询') || 
        modelError.message.includes('知识库服务') ||
        modelError.message.includes('dataset_name') ||
        modelError.message.includes('知识库查询失败:') ||
        modelError.message.includes('知识库服务调用失败:') ||
        modelError.message.includes('知识库服务网络请求失败:')) {
        errorType = 'knowledge';
        console.log('❌ 错误: 大模型错误被识别为知识库错误');
    } else if (modelError.message.includes('大模型服务调用失败:') || 
               modelError.message.includes('模型服务调用失败:') ||
               modelError.message.includes('API调用失败:')) {
        errorType = 'model';
        console.log('✅ 正确: 大模型错误被正确识别');
    } else {
        errorType = 'model';
        console.log('⚠️ 警告: 错误类型默认为大模型');
    }
    
    console.log('错误类型:', errorType);
    console.log('---');
    
    // 测试用例2: 知识库服务错误
    const knowledgeError = new Error('知识库服务调用失败: 网络连接失败');
    console.log('测试知识库服务错误:', knowledgeError.message);
    
    errorType = 'model';
    
    if (knowledgeError.message.includes('知识库查询') || 
        knowledgeError.message.includes('知识库服务') ||
        knowledgeError.message.includes('dataset_name') ||
        knowledgeError.message.includes('知识库查询失败:') ||
        knowledgeError.message.includes('知识库服务调用失败:') ||
        knowledgeError.message.includes('知识库服务网络请求失败:')) {
        errorType = 'knowledge';
        console.log('✅ 正确: 知识库错误被正确识别');
    } else if (knowledgeError.message.includes('大模型服务调用失败:') || 
               knowledgeError.message.includes('模型服务调用失败:') ||
               knowledgeError.message.includes('API调用失败:')) {
        errorType = 'model';
        console.log('❌ 错误: 知识库错误被识别为大模型错误');
    } else {
        errorType = 'model';
        console.log('⚠️ 警告: 错误类型默认为大模型');
    }
    
    console.log('错误类型:', errorType);
    console.log('---');
    
    // 测试用例3: 通用API错误
    const apiError = new Error('API调用失败: 请求格式错误');
    console.log('测试通用API错误:', apiError.message);
    
    errorType = 'model';
    
    if (apiError.message.includes('知识库查询') || 
        apiError.message.includes('知识库服务') ||
        apiError.message.includes('dataset_name') ||
        apiError.message.includes('知识库查询失败:') ||
        apiError.message.includes('知识库服务调用失败:') ||
        apiError.message.includes('知识库服务网络请求失败:')) {
        errorType = 'knowledge';
        console.log('❌ 错误: API错误被识别为知识库错误');
    } else if (apiError.message.includes('大模型服务调用失败:') || 
               apiError.message.includes('模型服务调用失败:') ||
               apiError.message.includes('API调用失败:')) {
        errorType = 'model';
        console.log('✅ 正确: API错误被识别为大模型错误');
    } else {
        errorType = 'model';
        console.log('⚠️ 警告: 错误类型默认为大模型');
    }
    
    console.log('错误类型:', errorType);
    console.log('=== 测试完成 ===');
}

// 运行测试
testErrorHandling(); 