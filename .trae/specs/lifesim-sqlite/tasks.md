# 人生模拟器 SQLite 重构 - 实现计划

## [ ] Task 1: 安装 SQLite 依赖并创建数据库模块
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 安装 sqlite3 依赖包
  - 创建数据库连接模块
  - 设计数据库表结构（worlds, saves, messages）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 数据库文件自动创建
  - `programmatic` TR-1.2: 表结构正确创建
- **Notes**: 使用 Node.js sqlite3 库

## [ ] Task 2: 实现数据库 CRUD 操作
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 实现世界存档的增删改查
  - 实现对话消息的存储
  - 实现每回合独立存档功能
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 世界存档可正常保存和读取
  - `programmatic` TR-2.2: 每回合创建独立存档记录
- **Notes**: 使用参数化查询防止 SQL 注入

## [ ] Task 3: 实现存档摘要生成功能
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 在保存时调用大模型生成存档摘要
  - 限制摘要长度 ≤50 字
  - 将摘要存储到数据库
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 摘要长度 ≤50 字
  - `programmatic` TR-3.2: 摘要正确存储到数据库
- **Notes**: 需要确保摘要生成失败不影响存档

## [ ] Task 4: 重构后端 API（lifesimserver.js）
- **Priority**: P0
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 将现有的 JSON 文件操作改为数据库操作
  - 添加存档列表 API（按世界分组）
  - 添加按存档 ID 载入 API
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 存档列表 API 返回正确格式
  - `programmatic` TR-4.2: 载入 API 正确恢复游戏状态
- **Notes**: 保持 API 兼容性

## [ ] Task 5: 更新前端界面支持存档选择
- **Priority**: P0
- **Depends On**: Task 4
- **Description**: 
  - 更新存档列表展示，显示摘要和时间
  - 实现存档选择界面（按世界分组显示存档）
  - 更新载入逻辑，支持从存档重新开始
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `human-judgment` TR-5.1: 存档列表正确显示摘要
  - `human-judgment` TR-5.2: 选择存档后正确载入
  - `human-judgment` TR-5.3: 载入后新选择不影响原存档
- **Notes**: 需要修改 life-simulator.js

## [ ] Task 6: 数据迁移工具（可选）
- **Priority**: P2
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 创建数据迁移脚本
  - 将现有的 JSON 文件数据导入 SQLite
- **Acceptance Criteria Addressed**: NFR-3
- **Test Requirements**:
  - `programmatic` TR-6.1: 迁移脚本成功执行
  - `programmatic` TR-6.2: 数据完整性验证通过
- **Notes**: 作为可选功能

## [ ] Task 7: 测试和验证
- **Priority**: P0
- **Depends On**: All previous tasks
- **Description**: 
  - 运行单元测试
  - 验证所有功能正常工作
  - 修复发现的问题
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-7.1: 所有 API 测试通过
  - `human-judgment` TR-7.2: 端到端功能验证通过
- **Notes**: 确保回归测试覆盖
