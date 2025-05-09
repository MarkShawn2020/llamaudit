# 智审大师系统架构

## 系统架构图

```mermaid
graph TB
    %% 主要层级
    subgraph Client["客户端"]
        FE_COMPONENTS["UI组件 (Components)"]
        PAGES["页面 (Pages)"]
    end
    
    subgraph ServerLayer["服务器层"]
        subgraph NextFramework["Next.js框架"]
            SERVER_COMPONENTS["服务端组件"]
            SERVER_ACTIONS["Server Actions"]
            API_ROUTES["API路由"]
        end
        
        subgraph AiLayer["AI处理层"]
            AI_MODELS["DeepSeek模型集成"]
            DEEPSEEK_V3["DeepSeek-V3\n(671B参数基础模型)"]
            DEEPSEEK_R1["DeepSeek-R1\n(推理增强模型)"]
        end
    end
    
    subgraph PersistenceLayer["持久化层"]
        DB["PostgreSQL数据库"]
        FILE_STORAGE["文件存储"]
    end
    
    %% 连接关系
    PAGES --> FE_COMPONENTS
    PAGES --> SERVER_COMPONENTS
    PAGES --> SERVER_ACTIONS
    SERVER_COMPONENTS --> API_ROUTES
    SERVER_COMPONENTS --> DB
    SERVER_ACTIONS --> AiLayer
    SERVER_ACTIONS --> DB
    API_ROUTES --> AiLayer
    API_ROUTES --> DB
    AI_MODELS --> DEEPSEEK_V3
    AI_MODELS --> DEEPSEEK_R1
    SERVER_ACTIONS --> FILE_STORAGE
    AI_MODELS --> FILE_STORAGE
    
    %% 客户端细分
    subgraph "前端组件结构"
        UI["UI组件库"]
        THEME["主题系统"]
        PROVIDERS["Provider组件"]
        LAYOUT["布局组件"]
        FORMS["表单组件"]
        HOOKS["自定义Hooks"]
    end
    
    %% AI处理细分
    subgraph "AI功能模块"
        TEXT_EXTRACT["文本信息提取"]
        COMPLIANCE["合规性检查"]
        QA["智能问答"]
        REASONING["复杂推理"]
    end
    
    %% 数据库模型细分
    subgraph "数据模型"
        AUTH_MODELS["认证模型\n(Users, Teams)"]
        ORG_MODELS["组织模型\n(Organizations)"]
        DOC_MODELS["文档模型\n(Documents, Files)"]
        AUDIT_MODELS["审计模型\n(ComplianceRules, Checks)"]
        ANALYSIS_MODELS["分析结果模型\n(AnalysisResults)"]
    end
```

## 架构说明

### 1. 客户端层

客户端层采用Next.js框架的客户端组件，负责用户界面渲染和交互。

- **页面 (Pages)**: 遵循Next.js的应用路由结构，包含核心页面、登录页面和管理页面
- **UI组件 (Components)**: 包含可复用的UI组件，如按钮、表单、导航栏等

### 2. 服务器层

服务器层包含Next.js框架的服务端能力和AI处理模块。

- **Next.js框架**:
  - **服务端组件**: 负责数据预取和服务端渲染
  - **Server Actions**: 处理表单提交和数据修改等操作
  - **API路由**: 提供客户端API接口

- **AI处理层**:
  - **DeepSeek-V3**: 基础大模型，用于文本理解和生成
  - **DeepSeek-R1**: 推理增强模型，用于复杂审计任务和信息提取

### 3. 持久化层

持久化层负责数据的存储和检索。

- **PostgreSQL数据库**: 存储用户数据、组织信息、文档元数据和审计结果
- **文件存储**: 存储上传的文档文件

### 4. 主要功能模块

- **文本信息提取**: 从会议纪要和合同中提取关键信息
- **合规性检查**: 根据规则检查文档的合规性
- **智能问答**: 基于文档内容回答问题
- **复杂推理**: 进行决策分析和逻辑推理

### 5. 数据流

1. 用户通过客户端上传文档或发起请求
2. 请求通过Server Actions或API路由传递到服务器
3. 服务器根据请求类型调用相应的AI处理模块
4. AI模块处理请求并返回结果
5. 结果存储到数据库并返回给客户端
