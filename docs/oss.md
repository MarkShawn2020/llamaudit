# 阿里云 OSS 文件存储配置指南

本项目使用阿里云 OSS（对象存储服务）来存储被审计单位上传的文件。这种方式比本地文件存储更安全、更可靠，并且提供了更好的扩展性和访问性能。

## 配置步骤

### 1. 创建阿里云 OSS Bucket

1. 登录[阿里云控制台](https://home.console.aliyun.com/)
2. 进入 OSS 管理界面
3. 创建一个新的 Bucket，记下以下信息：
   - Bucket 名称
   - 所在地域（Region）
   - 访问域名（Endpoint）

### 2. 创建 AccessKey

1. 在阿里云控制台中找到 "AccessKey 管理"
2. 创建一个新的 AccessKey（推荐使用 RAM 用户的 AccessKey，而非主账号）
3. 记录 AccessKey ID 和 AccessKey Secret

### 3. 配置环境变量

在项目的 `.env` 文件中添加以下配置：

```
# 阿里云OSS配置
STORAGE_PROVIDER=aliyun_oss
ALIYUN_OSS_REGION=oss-cn-hangzhou  # 替换为您的地域
ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id  # 替换为您的 AccessKey ID
ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret  # 替换为您的 AccessKey Secret
ALIYUN_OSS_BUCKET=llamaudit-files  # 替换为您的 Bucket 名称
ALIYUN_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com  # 替换为您的访问域名
```

## 文件存储机制

本系统支持两种文件存储模式：

1. 本地存储（默认）：文件保存在服务器的本地文件系统中
2. 阿里云 OSS 存储：文件保存在阿里云 OSS 中

通过设置 `STORAGE_PROVIDER` 环境变量可以切换存储模式：
- `STORAGE_PROVIDER=local`：使用本地存储
- `STORAGE_PROVIDER=aliyun_oss`：使用阿里云 OSS 存储

## 工作原理

1. 当用户上传文件时，文件会根据配置的存储提供商进行处理
2. 如果使用阿里云 OSS，文件会直接上传到 OSS，并在数据库中记录文件的元数据和访问路径
3. 访问文件时，系统会返回文件的 URL（OSS文件的公共访问URL）
4. 删除文件时，系统会同时删除 OSS 中的文件和数据库中的记录

## 文件安全

为了确保文件安全，建议配置以下 OSS 安全设置：

1. 设置合理的 Bucket 访问权限（推荐私有读写）
2. 配置 STS（Security Token Service）实现临时授权访问
3. 配置防盗链设置，限制文件被非法引用
4. 开启服务器端加密功能
5. 定期审计访问日志

## 相关代码文件

- `lib/file-storage.ts`：文件存储的核心实现
- `lib/actions/file-actions.ts`：处理文件上传和删除的 Server Actions
- `.env`：存储提供商配置 