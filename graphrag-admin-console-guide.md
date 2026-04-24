# GraphRAG 管理后台使用手册

## 1. 目标说明

当前仓库已经在尽量不改动 GraphRAG 核心逻辑的前提下，补齐了一套最小侵入式管理后台，包含：

- 图谱项目管理
- 源文件上传
- GraphRAG 构建触发
- 模型配置管理
- 图谱结构预览
- 基于 GraphRAG 的问答接口

整体仍然保持单仓库、单后端入口、单前端目录的轻量结构。

## 2. 关键目录

```text
graphrag/
├─ main.py                       # FastAPI 启动入口
├─ api/                          # 外挂式 API 层
├─ config/
│  ├─ app_settings.json          # 系统配置与模型配置
│  └─ graph_registry.json        # 图谱项目注册表
├─ data/
│  └─ projects/
│     └─ <graph_id>/             # 每个图谱对应一个 GraphRAG 工作目录
│        ├─ input/               # 上传的源文件
│        ├─ output/              # GraphRAG 输出产物
│        ├─ cache/               # 构建缓存
│        ├─ prompts/             # GraphRAG prompts
│        ├─ settings.yaml        # 图谱级 GraphRAG 配置
│        └─ .env                 # 图谱级模型密钥
└─ web/                          # React + TypeScript 前端
```

## 3. 启动方式

### 3.1 后端启动

后端保持单命令启动：

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

如果当前 PowerShell 无法直接识别 `uvicorn`，可先把项目虚拟环境加入本次会话的 `PATH`：

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

启动后访问：

- API 根路径：`http://127.0.0.1:8000/` 或 `http://<你的局域网IP>:8000/`
- Swagger 文档：`http://127.0.0.1:8000/docs` 或 `http://<你的局域网IP>:8000/docs`
- 管理后台：`http://127.0.0.1:8000/console/` 或 `http://<你的局域网IP>:8000/console/`

### 3.2 前端开发模式

如果需要单独开发前端：

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

访问地址：

- `http://127.0.0.1:5173/console/`

说明：

- Vite 已配置 `/api/*` 代理到本地 FastAPI
- 前端生产构建后可由 FastAPI 直接托管

### 3.3 前端生产构建

```powershell
cd web
npm.cmd run build
```

构建后会生成：

- `web/dist`

只要该目录存在，FastAPI 会自动把前端托管到 `/console/`。

## 4. 日常使用流程

推荐按下面顺序使用系统。

### 4.1 配置模型

进入“模型配置页”后，先配置模型 profile。

当前支持：

- OpenAI
- Azure OpenAI
- Ollama

每个 profile 可配置：

- `base_url`
- `api_key`
- `model_name`
- `embedding_model_name`
- `api_version`（Azure 可选）

配置保存在：

- `config/app_settings.json`

### 4.2 创建图谱项目

进入“图谱管理页”，创建图谱项目后，系统会自动初始化一个标准 GraphRAG 工作目录。

系统会为每个图谱生成独立目录，例如：

```text
data/projects/customer-service-1234abcd/
```

初始化时会自动生成：

- `settings.yaml`
- `.env`
- `prompts/`
- `input/`

### 4.3 上传源文件

在图谱管理页给某个图谱上传源文件，文件会落到该图谱目录下的：

- `input/`

当前支持的源文件类型：

- `txt`
- `md`
- `markdown`
- `json`
- `jsonl`
- `csv`
- `pdf`

说明：

- 同名文件会自动追加编号，避免覆盖旧文件
- `json/jsonl/csv` 默认按 `id/title/text` 字段读取

### 4.4 触发构建

上传完成后，在图谱管理页执行构建。

构建时系统会：

1. 根据图谱绑定的模型 profile，同步更新该图谱目录下的 `settings.yaml` 和 `.env`
2. 读取 `input/` 中的源文件
3. 调用 GraphRAG 原生索引能力完成切片、抽取和图谱构建
4. 将状态写回注册表

构建状态可在接口和前端页面中看到，常见状态包括：

- `initialized`
- `building`
- `ready`
- `failed`
- `artifacts_deleted`

### 4.5 查看图谱结构

构建成功后，可查看：

- 节点预览
- 关系预览
- 社区报告摘要

这些数据来自 GraphRAG 构建产物，并由 API 做了轻量转换，方便前端直接显示。

### 4.6 问答查询

进入问答页后，可选择图谱并输入问题。

当前支持查询模式：

- `local`
- `global`
- `basic`
- `drift`

接口：

- `POST /api/query`
- `POST /api/chat`

## 5. 关键配置文件说明

### 5.1 系统配置

文件：

- `config/app_settings.json`

主要字段：

- `projects_root`：图谱项目根目录
- `upload_root`：上传根目录
- `default_model_profile_id`：默认模型 profile
- `model_profiles`：模型配置列表

### 5.2 图谱注册表

文件：

- `config/graph_registry.json`

用于记录：

- 图谱 ID
- 图谱名称
- 目录位置
- 当前状态
- 绑定模型
- 构建时间
- 最近错误

### 5.3 图谱级配置

每个图谱目录中保留自己的：

- `settings.yaml`
- `.env`

这样做的目的，是尽量复用 GraphRAG 原有项目结构，避免侵入式改造底层配置机制。

## 6. 常用接口一览

### 6.1 图谱管理

- `GET /api/graph`
- `POST /api/graph`
- `GET /api/graph/{graph_id}`
- `POST /api/graph/{graph_id}/files`
- `GET /api/graph/{graph_id}/files`
- `POST /api/graph/{graph_id}/build`
- `GET /api/graph/{graph_id}/status`
- `DELETE /api/graph/{graph_id}/artifacts`
- `GET /api/graph/{graph_id}/graph`
- `GET /api/graph/{graph_id}/reports`

### 6.2 配置管理

- `GET /api/config/system`
- `PUT /api/config/system`
- `GET /api/config/models`
- `POST /api/config/models`
- `PUT /api/config/models/{profile_id}`
- `DELETE /api/config/models/{profile_id}`

### 6.3 问答接口

- `POST /api/query`
- `POST /api/chat`

## 7. 上线前检查清单

上线或交付前，建议至少完成下面检查。

### 7.1 运行环境

- Python 版本满足当前项目要求
- `uvicorn` 可正常运行
- Node.js 与 `npm` 可正常执行前端构建
- 目标机器具备 GraphRAG 所需依赖

### 7.2 配置检查

- `config/app_settings.json` 已存在且可写
- `config/graph_registry.json` 已存在且可写
- `data/projects` 目录具备读写权限
- 至少存在一个可用模型 profile
- 默认模型已按需要设置

### 7.3 模型连通性

- OpenAI/Azure/Ollama 的 `base_url` 正确
- `api_key` 已配置
- `model_name` 与 `embedding_model_name` 可实际调用
- 若使用 Azure，`api_version` 与部署名匹配

### 7.4 功能验收

- 能创建图谱
- 能上传至少一种源文件
- 能成功触发一次 build
- 能看到图谱节点/关系预览
- 能成功执行一次 query/chat
- 能清理产物后再次重建

### 7.5 前端交付

- 已执行 `npm.cmd run build`
- `web/dist` 已生成
- 访问 `/console/` 能正常打开页面
- 页面中的 `/api/*` 调用无 404/500 异常

### 7.6 后端交付

- `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` 可直接启动
- `/docs` 可正常打开
- `/api/health` 返回成功
- 图谱构建失败时能看到错误信息

## 8. 常见问题

### 8.1 `uv` 命令不可用

如果 PowerShell 中无法直接识别 `uv`，说明通常是环境变量未加入 `PATH`。

可临时执行：

```powershell
$env:PATH = "$HOME\.local\bin;$env:PATH"
```

或者直接使用 `uv.exe` 的绝对路径执行。

### 8.2 访问 `/console/` 为空白

优先检查：

- `web/dist` 是否存在
- 是否已经执行 `npm.cmd run build`
- `web/vite.config.ts` 的 `base` 是否为 `/console/`

### 8.3 图谱 build 失败

优先检查：

- 图谱是否已上传源文件
- 绑定模型是否可用
- `api_key` 是否有效
- `settings.yaml` 和 `.env` 是否已同步更新

## 9. 建议的交付方式

如果要把这套系统交给团队继续使用，推荐一起交付下面内容：

- 当前仓库代码
- `config/app_settings.json` 示例
- 至少一个可用模型 profile
- 一份演示数据
- 一份操作说明
- 一份上线前检查清单

这样接手人基本可以在较短时间内完成启动、导入、构建和问答验证。
