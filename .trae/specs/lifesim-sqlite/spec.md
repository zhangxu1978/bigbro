# 人生模拟器 SQLite 重构 - 产品需求文档

## Overview
- **Summary**: 对人生模拟器进行重大重构，将现有的 JSON 文件存储改为 SQLite 数据库存储，实现每回合独立存档、存档摘要生成和选择式载入功能。
- **Purpose**: 解决现有 JSON 文件存储的性能瓶颈，实现更灵活的存档管理，提升用户体验。
- **Target Users**: 人生模拟器游戏玩家

## Goals
- 将游戏数据存储从 JSON 文件迁移到 SQLite 数据库
- 实现每回合独立存档功能
- 保存时自动生成存档摘要（≤50字）
- 实现存档选择式载入界面
- 载入存档后支持剧情重新推演

## Non-Goals (Out of Scope)
- 不改变现有的游戏玩法和界面设计
- 不添加新的游戏功能
- 不修改 AI 对话逻辑

## Background & Context
- 当前系统使用 JSON 文件存储游戏数据，存在性能瓶颈和数据一致性问题
- 用户希望能够在多个存档点之间自由切换
- 需要保存每次对话和玩家选择，支持剧情回溯

## Functional Requirements
- **FR-1**: 使用 SQLite 数据库存储游戏数据（世界设定、游戏状态、对话历史）
- **FR-2**: 每回合自动保存一个独立存档
- **FR-3**: 保存时调用大模型生成≤50字的存档摘要
- **FR-4**: 提供存档列表界面，显示存档摘要供用户选择
- **FR-5**: 载入存档后，支持从该时间点重新推演剧情

## Non-Functional Requirements
- **NFR-1**: 存档和载入操作响应时间 < 500ms
- **NFR-2**: 数据库操作必须保证事务一致性
- **NFR-3**: 兼容现有数据格式，支持数据迁移

## Constraints
- **Technical**: Node.js 环境，使用 sqlite3 库
- **Business**: 需要保持与现有 API 的兼容性
- **Dependencies**: 需要安装 sqlite3 依赖

## Assumptions
- 现有游戏逻辑无需修改
- 用户已配置好 AI 模型访问权限

## Acceptance Criteria

### AC-1: SQLite 数据库初始化
- **Given**: 服务器启动时
- **When**: 检测到数据库文件不存在
- **Then**: 自动创建数据库和必要的表结构
- **Verification**: `programmatic`

### AC-2: 每回合独立存档
- **Given**: 玩家做出选择后
- **When**: 游戏状态更新完成
- **Then**: 自动创建新的存档记录，包含回合号和时间戳
- **Verification**: `programmatic`

### AC-3: 存档摘要生成
- **Given**: 准备保存存档时
- **When**: 调用保存 API
- **Then**: 自动调用大模型生成≤50字的存档摘要
- **Verification**: `programmatic`

### AC-4: 存档列表展示
- **Given**: 用户进入存档选择界面
- **When**: 请求存档列表
- **Then**: 返回包含存档摘要、时间、回合数的存档列表
- **Verification**: `human-judgment`

### AC-5: 选择式载入
- **Given**: 用户选择一个存档
- **When**: 点击载入按钮
- **Then**: 加载对应存档的游戏状态和对话历史
- **Verification**: `human-judgment`

### AC-6: 剧情重新推演
- **Given**: 存档载入完成后
- **When**: 玩家做出新选择
- **Then**: 从当前时间点重新推演剧情，不影响原始存档
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要保留旧的 JSON 文件存储作为备份？
- [ ] 是否需要提供数据迁移工具？
