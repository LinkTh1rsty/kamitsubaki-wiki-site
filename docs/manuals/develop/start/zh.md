---
book: develop
chapter: start
locale: zh
order: 1
title: 环境与启动
summary: 安装固定运行时，启动独立开发服务，并配置可核对的本机来源。
---

## 准备环境

先阅读仓库 README，使用 `.node-version` 指定的 Node.js 补丁版本和 pnpm 11.1.1。不要用“同为 Node 22”代替精确版本。为本任务保留独立分支、工作树和空闲端口。

```sh
node --version
pnpm --version
pnpm node:check
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 18000
```

启动命令会准备编辑器、共享界面和繁体内容。首次安装或构建可能较慢；等待终端打印本机访问地址后再打开浏览器。不要重复启动同一端口。

## 单站与跨服务开发

只修改静态页面、文档或百科内容时，可以独立克隆前端。账号、文章和图库的真实状态转换需要匹配的本机服务；单站启动成功不代表跨服务验收通过。

隔离模式同时设置 `WORKSPACE_ISOLATED=true`、`PUBLIC_WORKSPACE_ISOLATED=true`，以及 `PUBLIC_WORKSPACE_API_ORIGIN`、`PUBLIC_WORKSPACE_WIKI_ORIGIN`、`PUBLIC_WORKSPACE_COMPANION_ORIGIN`。三个来源必须是不同端口的 `http://127.0.0.1` 地址；Wiki 来源对应当前前端。业务 API 变量指向本机 API，`PUBLIC_SITE_URL` 指向本机 Wiki。

不要复制生产环境文件、Cookie 或数据库。隔离配置遗漏或互相冲突时应先修正配置，不切回生产服务来完成测试。

## 核对结果

确认首页、文档、词条可打开，终端没有运行时版本错误。记录分支、提交、运行时、启动命令与端口。远程字体、外部图片和登录供应商在隔离环境的限制应单独记录。

如果启动失败，先看终端首个错误，再查[故障排查](/zh/docs/develop/troubleshooting/)。更改业务代码前先确保依赖和运行时正确。
