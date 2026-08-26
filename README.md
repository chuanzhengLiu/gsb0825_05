# FlyTie Atlas 飞钓绑制图谱

一个面向飞蝇钓爱好者的 Web 应用，帮助用户学习毛钩绑制、管理材料库存、记录绑制时间并分享作品。

## 技术栈

- **后端**：Node.js + Express + MySQL 8
- **前端**：React + Tailwind CSS + Vite
- **亮点**：SVG 绑制步骤图、Canvas 材料用量估算、绑制计时器

## 快速开始

### 1. 安装依赖

```bash
npm run setup
```

### 2. 启动 MySQL

使用 Docker（推荐）：

```bash
docker-compose up -d
```

> 若本地 3306 端口已被占用，项目默认映射到 `3307:3306`，可在 `server/.env` 中修改 `DB_PORT`。

或自行准备 MySQL 8 数据库，修改 `server/.env` 中的连接信息。

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动开发服务器

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3001

## 默认账号

- 邮箱：`demo@flytie.atlas`
- 密码：`demo123`

## 核心功能

- 用户注册登录与个人绑制档案
- 毛钩库：分步骤展示，每步含材料清单与 SVG 示意图
- 材料库存：羽毛、丝线、钩子等库存记录与低库存预警
- 绑制计时：记录单只毛钩耗时与历史平均统计
- 分类检索：按目标鱼种、水域类型筛选
- 收藏夹：收藏常用款式
- 作品上传：上传成品照片并关联款式
- 社区分享：公开作品，点赞与收藏
