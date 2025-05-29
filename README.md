# 智审大师 - AI 驱动的审计辅助系统

基于 AI 的智能审计辅助系统，支持文件管理、信息抽取、合规性检查等功能。主题色采用南京审计大学蓝灰色(#5C7A95)。

## 核心功能

- 被审计单位信息维护（单位代码，单位名称）
- 文件导入与管理（会议纪要、合同、附件等）
  - 支持Word和PDF格式文档
  - 按不同单位、文件类型分类存放
  - 支持查看、筛选和搜索已导入文件
- AI 驱动的关键信息抽取
  - 三重一大会议纪要信息提取
    - 重大问题决策、重要干部任免、重大项目投资安排、大额资金使用等
  - 合同关键信息提取
    - 合同编号、签署日期、合同名称、合同金额等
- 智能问答系统
  - 基于导入的文档内容进行问答
- 合规性规则配置与检查
  - 自定义合规规则
  - 校验文件是否符合规则
- 审计底稿导出

## 技术栈

- **框架**: [Next.js](https://nextjs.org/)
- **数据库**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/)
- **AI 模型**: [DeepSeek](https://www.deepseek.com/)
  - DeepSeek-V3 用于通用理解
  - DeepSeek-R1 用于复杂推理

## 本地开发

```bash
git clone https://github.com/your-org/zhishen
cd zhishen
pnpm install
```

### 环境配置

使用提供的脚本创建 `.env` 文件：

```bash
pnpm db:setup
```

运行数据库迁移并初始化种子数据：

```bash
pnpm db:migrate
pnpm db:seed
```

这将创建以下默认用户：

- 用户名: `admin@zhishen.com`
- 密码: `admin123`

启动开发服务器：

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 部署到生产环境

当准备将应用部署到生产环境时，请遵循以下步骤：

### 部署到Vercel

1. 将代码推送到GitHub仓库
2. 将仓库连接到[Vercel](https://vercel.com/)并部署
3. 按照Vercel部署流程进行设置

### 添加环境变量

在Vercel项目设置（或部署期间）中，添加所有必要的环境变量。确保为生产环境更新以下值：

1. `BASE_URL`: 设置为生产域名
2. `POSTGRES_URL`: 设置为生产数据库URL
3. `AUTH_SECRET`: 设置为随机字符串，可使用 `openssl rand -base64 32` 生成
4. `DEEPSEEK_API_KEY`: 设置为DeepSeek API密钥

## 功能展示

系统主要包括以下几个界面：

1. **首页** - 展示系统概览和主要功能
2. **文件管理** - 上传、分类和管理审计文件
3. **信息提取** - 使用AI从文件中提取关键信息
4. **规则设置** - 配置合规检查规则
5. **智能问答** - 基于文档内容进行提问与回答

## 贡献指南

欢迎贡献代码或提出功能建议。请遵循以下步骤：

1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request
