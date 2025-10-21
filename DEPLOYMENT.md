# 部署到 Cloudflare Pages 的详细步骤

## 第一步：创建 GitHub 仓库

1. **登录 GitHub**
   - 访问 https://github.com
   - 使用你的账号登录（如果没有账号，请先注册）

2. **创建新仓库**
   - 点击右上角 "+" → "New repository"
   - 仓库名: `chess-analyzer`
   - 描述: `Online Chess Analyzer with Stockfish`
   - 选择 "Public"（公开仓库）
   - 点击 "Create repository"

3. **上传代码到 GitHub**

   打开终端，在项目根目录执行：

   ```bash
   git branch -m master main
   git remote add origin https://github.com/YOUR_USERNAME/chess-analyzer.git
   git push -u origin main
   ```

   将 `YOUR_USERNAME` 替换成你的 GitHub 用户名。

## 第二步：配置 Cloudflare Pages

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com
   - 使用你的 Cloudflare 账号登录（如果没有账号，请先创建）

2. **进入 Pages 服务**
   - 在左侧菜单中找到 "Pages"
   - 点击 "Pages"

3. **连接 Git 仓库**
   - 点击 "连接到 Git"
   - 授权 Cloudflare 访问你的 GitHub 账号
   - 在仓库列表中找到并选择 `chess-analyzer`
   - 点击 "开始"

4. **配置构建设置**

   在构建配置页面：

   - **框架预设**: 选择 "Next.js"
   - **构建命令**: `npm run build`
   - **构建输出目录**: `out`
   - 其他设置保持默认

   点击 "保存并部署"

5. **等待部署完成**

   Cloudflare 会自动：
   - 克隆你的代码
   - 安装依赖 (npm install)
   - 运行构建 (npm run build)
   - 部署到 Cloudflare 的全球 CDN

   部署通常需要 1-2 分钟。

## 第三步：配置自定义域名（可选）

### 如果你已有域名：

1. **在 Cloudflare Pages 中配置**
   - 进入你的 Pages 项目
   - 点击 "自定义域名"
   - 输入你的域名（例如: chess.example.com）
   - 点击 "继续"

2. **更新域名 DNS 设置**

   根据 Cloudflare 的提示，将你的域名 DNS 指向 Cloudflare：

   - 登录你的域名注册商（如 GoDaddy、NameSilo 等）
   - 找到 DNS 设置
   - 更改 Nameservers 为 Cloudflare 提供的地址
   - 等待 DNS 生效（通常 24 小时内）

### 如果你没有域名：

你可以使用 Cloudflare 为你生成的免费子域名：
- 例如: `chess.pages.dev`
- 这个域名已经自动配置好，无需额外设置

## 第四步：验证部署

1. **查看部署状态**
   - 访问 Cloudflare Pages 项目首页
   - 应该看到一个 "✓ Successfully published" 的消息

2. **访问你的网站**
   - 使用 Cloudflare 生成的域名访问
   - 或者使用你配置的自定义域名

3. **测试功能**
   - 在棋盘上移动棋子
   - 检查分析面板是否显示
   - 确保所有功能正常工作

## 后续更新

每当你在本地修改代码并推送到 GitHub 时：

```bash
git add .
git commit -m "描述你的更改"
git push
```

Cloudflare 会自动检测到新的推送，并自动重新构建和部署你的网站。无需手动操作！

## 故障排除

### 构建失败

- 检查 `npm run build` 在本地是否能成功运行
- 查看 Cloudflare Pages 的构建日志寻找具体错误信息
- 确保 Node.js 版本兼容

### 网站访问缓慢

- 这可能是 Stockfish 首次加载时的正常行为（约 7MB）
- 浏览器会缓存，后续访问会更快
- 如果持续缓慢，检查网络连接

### DNS 不生效

- DNS 更改通常需要 24 小时
- 可以在命令行使用 `nslookup` 或 `dig` 检查

## 支持资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [GitHub Pages 与 Cloudflare Pages 对比](https://developers.cloudflare.com/pages/platform/known-issues/)
