# LlamaAudit - AI 驱动的审计辅助系统

基于 AI 的智能审计辅助系统，支持文件管理、信息抽取、合规性检查等功能。

## 核心功能

- 被审计单位信息维护
- 文件导入与管理（会议纪要、合同、附件等）
- AI 驱动的关键信息抽取
  - 三重一大会议纪要信息提取
  - 合同关键信息提取
- 智能问答系统
- 合规性规则配置与检查
- 审计底稿导出

## 技术栈

- **框架**: [Next.js](https://nextjs.org/)
- **数据库**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/)
- **AI 模型**: [LLaMA](https://ai.meta.com/llama/)

## 本地开发

```bash
git clone https://github.com/your-org/llamaudit
cd llamaudit
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

- 用户名: `admin@llamaudit.com`
- 密码: `admin123`

启动开发服务器：

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables. Make sure to update the values for the production environment, including:

1. `BASE_URL`: Set this to your production domain.
2. `STRIPE_SECRET_KEY`: Use your Stripe secret key for the production environment.
3. `STRIPE_WEBHOOK_SECRET`: Use the webhook secret from the production webhook you created in step 1.
4. `POSTGRES_URL`: Set this to your production database URL.
5. `AUTH_SECRET`: Set this to a random string. `openssl rand -base64 32` will generate one.

## Other Templates

While this template is intentionally minimal and to be used as a learning resource, there are other paid versions in the community which are more full-featured:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev
