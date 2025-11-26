# BIC-QA Intelligent Q&A Assistant

<div align="center">

## 🌐 Language Selection / 语言选择

[![中文版](https://img.shields.io/badge/📖_中文版_README-blue?style=for-the-badge&logo=github)](README.md) [![English Version](https://img.shields.io/badge/📖_English_README-green?style=for-the-badge&logo=github)](README_EN.md)

</div>

## 📖 Product Introduction

**BIC-QA (Business Intelligence & Knowledge Query Assistant)** is an intelligent Q&A system specifically designed for enterprise-level database knowledge management. As a next-generation database knowledge retrieval solution, BIC-QA is committed to providing efficient and accurate knowledge query services for database administrators, developers, and operations engineers.

### 🎯 Core Positioning
BIC-QA is a comprehensive database knowledge Q&A platform that supports all mainstream database systems, with deep optimization specifically for domestic database ecosystems. The system integrates rich database knowledge bases covering SQL syntax, performance optimization, troubleshooting, best practices, and comprehensive content, providing users with instant professional database technical support.

### 🗄️ Database Support
- **International Mainstream Databases**: Oracle, MySQL, PostgreSQL, SQL Server, MongoDB, Redis, etc.
- **Domestic Database Priority Support**: DM Database (DM), KingBase, OceanBase, GoldenDB, Huawei GaussDB, Tencent TDSQL, etc.
- **Cloud-Native Databases**: Alibaba Cloud PolarDB, Tencent Cloud TDSQL-C, Huawei Cloud GaussDB, etc.

### 🚀 Technical Advantages
- **Intelligent Semantic Understanding**: Based on advanced NLP technology for accurate user query intent understanding
- **Knowledge Graph Construction**: Builds complete database knowledge association networks for contextually relevant answers
- **Real-time Knowledge Updates**: Continuously updates database version features and best practices
- **Multi-dimensional Retrieval**: Supports precise retrieval by database type, problem type, technical domain, and other dimensions

<div align="center">
<img src="icons/logo.png" alt="BIC-QA Logo" width="600" height="150">

**A powerful browser extension providing intelligent Q&A and knowledge base retrieval services**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Edge Add-ons](https://img.shields.io/badge/Edge-Add--ons-blue?logo=microsoft-edge)](https://microsoftedge.microsoft.com/addons)
[![Version](https://img.shields.io/badge/Version-v1.0.5-green)](https://github.com/your-repo/BIC-QA)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

<div align="center">

## 🚀 Download Now

[![Download](https://img.shields.io/badge/📥_Download_BIC--QA_v1.0.8.2-orange?style=for-the-badge&logo=download)](https://gitee.com/BIC-QA/bic-qa/releases/download/v1.0.8.2/BIC-QA_v1.0.8.2.zip)

**Version**: v1.0.8.2 | **Size**: ~1MB | **Updated**: August 2025

</div>

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration Guide](#️-configuration-guide)
- [🎯 Usage Instructions](#-usage-instructions)
- [🔧 Advanced Features](#-advanced-features)
  - [📊 AWR Report Analysis Feature](#-awr-report-analysis-feature)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [📱 System Requirements](#-system-requirements)
- [🔒 Privacy & Security](#-privacy--security)
- [📞 Technical Support](#-technical-support)

## ✨ Features

### 🤖 Intelligent Q&A
- **Multi-model Support**: Integrates GPT, Claude, local Ollama, and various AI models
- **Streaming Output**: Real-time display of responses for enhanced user experience
- **Conversation Management**: Save conversation history with one-click clear functionality
- **Smart Stop**: Interrupt generation process at any time

### 📚 Knowledge Base Retrieval
- **Enterprise Integration**: Seamlessly connect to enterprise knowledge base systems
- **Intelligent Matching**: Precise content retrieval based on similarity
- **Multi-library Support**: Manage multiple knowledge bases simultaneously
- **Result Optimization**: Smart sorting and relevance filtering

### ⚙️ Flexible Configuration
- **Parameter Customization**: Adjustable temperature, similarity, TopN, and other parameters
- **Prompt Optimization**: Support for custom system prompts
- **Rule Presets**: Built-in multiple preset rules for out-of-the-box use

### 📊 Result Management
- **One-click Copy**: Quickly copy response content
- **Format Export**: Support HTML format export
- **Feedback System**: Built-in rating mechanism for continuous experience optimization

## 🚀 Quick Start

### 📦 Install Extension

1. Download extension files to local machine
2. Open browser extension management page
3. Enable developer mode
4. Click "Load unpacked extension"
5. Select extension folder

### ⚡ Four-Step Configuration

#### Step 1: User Registration

![User Registration Interface](assets/image-20250815140746815.png)

1. Open extension settings page
2. Fill in username, company name, and email address
3. Click **Save** button
4. Check email for API Key

> ⚠️ **Important Reminder**: Do not modify the default URL arbitrarily to avoid affecting plugin operation. If already modified, please reset settings to restore default values.

#### Step 2: Knowledge Base Service Configuration

![Knowledge Base Configuration](assets/image-20250815140930391.png)

1. Enter knowledge base service configuration page
2. Fill in the API Key from email into corresponding fields
3. Click **Save** to complete configuration

#### Step 3: AI Model Configuration

##### 3.1 Configure Service Provider Interface

![Model Service Provider Configuration](assets/image-20250815141625955.png)

1. Open **Settings** → **Models & Service Providers**
2. Add service providers (such as `ollama`, `deepseek`, etc.)
3. Fill in corresponding **API Address** and **API Key** (if required)

**Local Ollama Configuration Example**:
```bash
API Address: http://localhost:11434/v1
```

4. Click **Test** to connect, system automatically discovers available models
5. Check desired models, click **Batch Management** to save

![Model Management Interface](assets/image-20250815141948338.png)

> 💡 **Tip**: Homepage dropdown menu displays **Model Name (Service Provider)** format to avoid confusion with same-name models.

##### 3.2 Manual Model Configuration

![Model Configuration Interface](assets/image-20250815142020584.png)

For service providers that don't support auto-discovery:

1. Click **Add Model**
2. Fill in model name, token limit, temperature, and other parameters
3. Click **Save** to complete configuration

![Model Parameter Settings](assets/image-20250815142317185.png)

#### Step 4: Start Using

1. Select configured **Model (Service Provider)** on homepage
2. Choose target knowledge base from **Knowledge Base** dropdown menu
3. Input question, click **Send** or press Enter
4. Enjoy intelligent Q&A experience!

> 💡 **Usage Tip**: When knowledge base is enabled, system automatically loads latest configuration and prioritizes knowledge base services.

## ⚙️ Configuration Guide

### 🔧 Parameter Rule Settings

BIC-QA supports custom prompts and retrieval parameters with three preset modes:

| Mode | Temperature | Similarity | Use Case |
|------|-------------|------------|----------|
| **Creative Mode** | High | Medium | Requires creative responses |
| **Precise Mode** | Low | High | Requires accuracy priority |
| **Custom Mode** | Adjustable | Adjustable | Fully customizable needs |

**Configurable Parameters**:
- **Prompt**: System instruction template
- **Temperature**: Controls response randomness
- **Similarity**: Knowledge base retrieval threshold
- **TopN**: Number of retrieval results

> ⚠️ **Parameter Impact**: Higher temperature increases creativity, similarity/TopN affects knowledge base retrieval scope and quantity.

## 🎯 Usage Instructions

### 📱 Usage Modes

#### Popup Mode
- Click BIC-QA icon in browser toolbar
- Suitable for quick Q&A and simple questions
- Clean interface with rapid response

#### Full Page Mode
- Click **🖥️ Full Page** button in top-right corner of popup
- Opens in new tab with complete functionality
- Suitable for complex conversations and extended use

### 🎮 Operation Guide

#### Basic Q&A
1. Select AI model
2. Select knowledge base (optional)
3. Input question
4. Wait for streaming response
5. Use copy/export functions

#### Advanced Features
- **Stop Generation**: Click stop button to interrupt response
- **Clear Conversation**: One-click clear history
- **Rating Feedback**: Rate response quality
- **Parameter Adjustment**: Real-time model parameter adjustment

## 🔧 Advanced Features

### 📊 AWR Report Analysis Feature

BIC-QA provides a powerful Oracle database AWR (Automatic Workload Repository) report analysis feature that helps database administrators quickly diagnose database performance issues and obtain professional analysis reports and optimization recommendations.

#### 📹 Feature Demo Video

<div align="center">

[![Watch Demo Video](https://img.shields.io/badge/📹_Download_Demo_Video-blue?style=for-the-badge&logo=video)](assets/BIC-QA%20解析AWR功能使用介绍.mp4)

> 💡 **Note**: Not support direct video playback in Markdown. Click the button above to download and watch the demo video.

</div>

#### 🎯 Feature Overview

The AWR analysis feature can:
- **Intelligent Parsing**: Automatically parse Oracle AWR report HTML format files
- **Deep Analysis**: Comprehensive performance issue diagnosis based on AI large language models
- **Professional Reports**: Generate structured analysis reports including problem diagnosis and optimization recommendations
- **Multi-language Support**: Support for Chinese and English analysis reports
- **History Management**: View and manage historical analysis records with support for re-analysis

> ⚠️ **Version Notice**: The AWR report analysis feature is currently in Beta testing phase. We sincerely invite you to provide valuable feedback and suggestions during use. Your feedback will help us continuously improve the product. The current version has no usage restrictions and all features are available for normal use.

#### 📋 AWR Report Analysis Data Source Notes

**AWR Report Analysis Data Source Notes**:

- ✅ **Supported**: AWR reports from Oracle single-instance databases.
- ✅ **RAC Recommendation**: For RAC environments, please use `awrrpt.sql` or `awrrpti.sql` to generate reports.
- ❌ **Not Currently Supported**: AWR comparison reports generated by `awrddrpi.sql` and global reports generated by `awrgrpt.sql`.

#### 📝 Usage Steps

##### 1. Open AWR Analysis Feature

1. In the left navigation bar, click the **"AWR分析(Analysis)"** button
2. The system will open the AWR analysis dialog

##### 2. Create New Analysis Task

In the **"新建分析 (New Analysis)"** tab, follow these steps:

**Step 1: Fill in System Issue Overview (Optional)**

- In the **"系统问题概述 (System Issue Overview)"** text box, describe the system issues you are experiencing
- Examples: "Database response is slow", "High CPU usage", "Lock wait issues exist", etc.
- ⚠️ **Important Note**: Please provide a relatively clear system issue description. If you are unsure about certain details, it's better not to fill them in to avoid misleading the AI model's analysis results

**Step 2: Fill in Receiving Email (Required)**

- In the **"接收邮箱 (Email)"** input field, enter your email address
- After analysis is complete, the system will send the analysis report to this email
- This field is required (marked with *)

**Step 3: Upload AWR Report File (Required)**

- Click the **"上传文件 (Upload)"** button
- Select the Oracle AWR report HTML file you want to analyze
- Supports standard Oracle AWR report formats (Oracle 10g, 11g, 12c, 19c+, and other versions)
- This field is required (marked with *)

**Step 4: Select Analysis Language**

- In the **"语言 (Language)"** dropdown menu, select the language for the analysis report
- Options: **中文 (Chinese)** or **English**
- The system will generate an analysis report in the selected language

**Step 5: Execute Analysis**

- Confirm all required information is complete
- Click the **"执行分析 (Execute Analysis)"** button to submit the analysis task
- The system will begin processing your AWR report

##### 3. View History Records

In the **"历史记录 (History)"** tab, you can:

**View Analysis History**
- View all submitted AWR analysis task records
- Each record displays the following information:
  - **Create Time**: Time when the task was submitted
  - **Status**: Task execution status (Success/Failed/Processing)
  - **Filename**: Name of the uploaded AWR report file
  - **Description**: Problem description entered during submission
  - **Email**: Email address for receiving reports
  - **Language**: Language of the analysis report

**Filter and Search**
- **Start Time**: Select the start date for the query
- **End Time**: Select the end date for the query
- **Task Status**: Filter by status (All/Success/Failed/Processing)
- Click the **"搜索 (Search)"** button to execute the filter
- Click the **"重置 (Reset)"** button to clear filter conditions

**Re-analyze**
- For historical records, you can click the **"重新分析 (Reanalyze)"** button
- The system will re-execute the analysis task with the same parameters
- Suitable for scenarios where you need to update analysis results or re-analyze with different models

#### 💡 Usage Tips

1. **Accurate Problem Description**: If you clearly know the system issues, it's recommended to describe them in detail to help the AI model analyze related metrics more accurately
2. **Leave Blank When Uncertain**: If you're uncertain about the problem description, it's recommended to leave it blank and let the AI perform a comprehensive analysis
3. **Check Email Address**: Ensure the email address is correct to receive the analysis report in time
4. **Confirm File Format**: Ensure the uploaded file is a standard Oracle AWR report HTML file
5. **Regular History Review**: Through the history function, you can compare analysis results from different periods and track performance trends

#### ⚠️ Important Notes

- AWR Report File Size Limit: Ensure uploaded files do not exceed system limits
- Analysis Processing Time: Depending on report size and complexity, analysis may take several minutes
- Network Connection: Ensure stable network connection for successful file upload and report reception
- Email Reception: Please check your spam folder to ensure you can receive analysis reports normally

#### 🔍 Analysis Report Content

The AWR analysis report generated by the system typically includes the following content:

- **Report Overview**: Basic information such as database version, report time range, etc.
- **Load Profile**: Analysis of overall database load situation
- **Performance Metrics**: Detailed analysis of key performance indicators (such as hit rates, wait events, etc.)
- **Problem Diagnosis**: Identification of potential performance issues and bottlenecks
- **Optimization Recommendations**: Specific optimization recommendations and solutions for identified problems
- **SQL Analysis**: Analysis and optimization recommendations for high-load SQL statements
- **Wait Event Analysis**: Detailed analysis of wait events and handling recommendations

### 🔍 Knowledge Base Management
- **Multi-library Switching**: Support simultaneous management of multiple knowledge bases
- **Intelligent Retrieval**: Content matching based on semantic similarity
- **Result Sorting**: Automatic sorting of retrieval results by relevance

### 📊 Conversation Management
- **History Records**: Automatically save all conversation content
- **Session Export**: Support HTML format export
- **Batch Operations**: Support batch clear and export

### ⚡ Performance Optimization
- **Streaming Output**: Real-time display of generated content
- **Cache Mechanism**: Smart caching for improved response speed
- **Concurrency Control**: Prevent duplicate requests

## 🛠️ Troubleshooting

### ❗ Common Issues

#### 1. Extension Import Failure

**Possible Causes**:
- File corruption during extraction
- Browser didn't select the innermost folder when choosing plugin

**Solutions**:
- Selected folder should contain manifest.json as shown below:

![Import File Hierarchy](assets/q1-chajian.png)

#### 2. Request Failure
**Possible Causes**:
- Incorrect model service address
- Network connection issues
- Invalid API Key
- Local model permissions not granted

**Solutions**:
```bash
# Check service address
curl http://localhost:11434/v1/models

# Verify network connection
ping your-api-endpoint.com

# Configure local environment variables
Set system variable OLLAMA_ORIGINS to *
```
![](./assets/ollama_origins.png)

#### 3. Model Loading Failure
**Possible Causes**:
- Ollama service not started
- Incorrect API address format
- Model not properly deployed

**Solutions**:
```bash
# Start Ollama service
ollama serve

# Check model list
ollama list
```

#### 4. Knowledge Base Connection Failure
**Possible Causes**:
- Incorrect knowledge base service URL
- Expired or invalid API Key
- Network permission restrictions

**Solutions**:
- Check knowledge base service status
- Re-obtain API Key
- Verify network access permissions

### 🔍 Debug Steps

1. **Reload Extension**
   - Open extension management page
   - Click reload button
![](./assets/reload_plugin_en.png)

2. **Clear Cache**
   - Clear browser cache and cookies
   - Restart browser

3. **Check Console**
   - Press F12 to open developer tools
   - View Console error messages

4. **Verify Configuration**
   - Check configuration file format
   - Confirm all required fields

## 📱 System Requirements

### 🌐 Browser Support
- **Chrome** 88+
- **Edge** 88+
- **Other Chromium-based browsers**

### 🌍 Network Requirements
- Support HTTPS/HTTP requests
- Stable network connection
- Firewall allows extension access

## 🔒 Privacy & Security

### 🛡️ Data Protection
- **Local Storage**: Conversation history stored locally
- **Encrypted Transmission**: All network requests use HTTPS
- **Permission Control**: Minimized permission requirements

### 🔐 Security Features
- **Local Models**: Support complete local deployment
- **API Keys**: Secure storage and transmission
- **Access Control**: Configurable network access permissions

### 📋 Privacy Policy
- No collection of personal sensitive information
- No data sharing with third parties
- Support data export and deletion

## 📞 Technical Support

### 🆘 Get Help
- **Community**: Join BIC-QA discussion group

<img src="assets/bic-qa-wechat.jpg" style="zoom: 30%;" />

- **Feedback**: Submit issue feedback

### 📧 Contact Information
- **Support Email**: support@dbaiops.com
- **DBAIOps Community:**
<img src="assets/DBAIOps社区二维码.png" style="zoom:50%;" />
- **GitHub**: [Submit Issue](https://gitee.com/BIC-QA/BIC-QA/issues)

### 🔄 Update Log
- **v1.0.8.2**: Added multi-language support, fixed known bugs
- **v1.0.7**: Added AWR report analysis feature, supporting Oracle database performance diagnosis
- **v1.0.6**: Support for adding large model service providers, fixed known issues
- **v1.0.5**: Performance optimization, fixed known issues
- **v1.0.4**: Added knowledge base functionality
- **v1.0.3**: Support for local Ollama models

---

<div align="center">

**BIC-QA Intelligent Q&A Assistant** - Making knowledge retrieval smarter, making Q&A more efficient

**Version**: v1.0.8.2 | **Update Date**: November 2025

[⭐ Give us a star](https://gitee.com/BIC-QA/BIC-QA) | [🐛 Report Issues](https://gitee.com/BIC-QA/BIC-QA/issues)

</div>
