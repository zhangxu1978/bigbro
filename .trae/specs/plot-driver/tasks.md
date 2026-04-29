# 人生模拟器 - 剧情推演系统实现计划

## [x] Task 1: 数据库表设计与创建
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建剧情表（plots）存储剧情数据
  - 创建世界角色表（world_characters）存储世界级角色属性
  - 创建剧情内角色表（plot_characters）存储剧情级角色属性，关联世界角色
  - 创建剧情步骤表（plot_steps）存储每步剧情
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: 数据库表创建成功，包含必要字段（欲望、立场、缺陷、关系、生效范围）
  - `programmatic` TR-1.2: 表之间的外键关系正确建立（plot_characters关联world_characters和plots）
  - `programmatic` TR-1.3: 支持角色从世界到剧情的关联
- **Notes**: 需要与现有worlds表关联，plot_characters需要记录是否来自world_characters

## [x] Task 2: 后端API开发（剧情管理）
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 新增剧情CRUD API（含年龄范围校验）
  - 新增世界角色CRUD API (/world-characters)
  - 新增剧情内角色CRUD API (/plot-characters)
  - 新增角色流转API（从世界角色创建剧情角色、剧情结束时带出角色）
  - 新增剧情步骤管理API
  - 实现同一世界多剧情年龄冲突校验逻辑
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-2.1: POST /plots 创建剧情成功
  - `programmatic` TR-2.2: GET /plots/:worldId 获取世界剧情列表
  - `programmatic` TR-2.3: POST /world-characters 创建世界角色成功
  - `programmatic` TR-2.4: POST /plot-characters/from-world 将世界角色加入剧情
  - `programmatic` TR-2.5: 年龄范围冲突时创建剧情失败并返回错误信息
  - `programmatic` TR-2.6: POST /plot-characters/b带出 将剧情角色带出到世界
- **Notes**: 需要处理剧情与世界、角色与剧情的关联，以及角色流转逻辑

## [x] Task 3: 剧情推演界面设计与实现
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 创建剧情推演设置界面（主角年龄、场景、角色、目标等）
  - 实现分屏布局（左侧剧情，右侧角色）
  - 实现剧情步骤的保留/删除操作
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5
- **Test Requirements**:
  - `human-judgment` TR-3.1: 界面布局清晰，分屏显示正常
  - `programmatic` TR-3.2: 设置表单验证正确
  - `programmatic` TR-3.3: 保留/删除按钮功能正常
- **Notes**: 需要设计简洁的UI，支持滚动查看

## [x] Task 4: AI世界编织者提示词设计
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 设计世界编织者的系统提示词
  - 设计角色推演工具的提示词
  - 确保输出格式符合（目的、阻碍、达成）要求
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 剧情输出符合格式要求
  - `human-judgment` TR-4.2: 角色属性生成合理
- **Notes**: 需要多次调试提示词以获得最佳效果

## [x] Task 5: 角色生成工具实现
- **Priority**: P1
- **Depends On**: Task 2, Task 4
- **Description**: 
  - 实现角色属性AI生成（欲望、立场、缺陷、关系、生效范围）
  - 支持手动编辑角色属性
  - 支持重新生成角色属性
  - 支持从世界角色表选择角色加入剧情
  - 保存角色到剧情内角色表
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: 点击生成按钮后AI返回角色属性
  - `programmatic` TR-5.2: 手动编辑后保存成功
  - `programmatic` TR-5.3: 重新生成功能正常
  - `programmatic` TR-5.4: 可选择世界角色加入当前剧情
- **Notes**: 角色属性包括：欲望、立场、缺陷、关系、生效范围（本剧情内生效/一直生效），生效范围决定剧情结束后角色是否带出到世界

## [x] Task 6: 世界选择界面增加剧情推演按钮
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 修改世界卡片点击逻辑
  - 增加"开始冒险"和"推演剧情"选项弹窗
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-6.1: 点击世界卡片显示两个选项
  - `programmatic` TR-6.2: 选择"推演剧情"进入对应界面
- **Notes**: 需要修改storage.js中的renderWorldsGrid函数

## [x] Task 7: 剧情保存功能实现
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 实现剧情推演完成后的保存功能
  - 记录开始年龄、结束年龄、时长、每步骤
  - 实现角色带出逻辑：根据生效范围判定，将"一直生效"的新角色添加到世界角色表，更新"一直生效"的老角色属性
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-7.1: 剧情保存成功后可通过API获取
  - `programmatic` TR-7.2: 剧情数据完整（包含所有步骤）
  - `programmatic` TR-7.3: "一直生效"的新角色成功添加到世界角色表
  - `programmatic` TR-7.4: "一直生效"的老角色属性成功更新
  - `programmatic` TR-7.5: "本剧情内生效"的角色不会带出到世界
- **Notes**: 需要处理剧情与世界的关联，以及角色流转逻辑

## [x] Task 8: 命运之书自动触发机制
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 在游戏主循环中检测年龄触发条件
  - 当年龄到达预设剧情触发年龄时，自动插入剧情选项
  - 确保无论玩家选择如何都进入剧情
  - 处理剧情角色进入世界（将剧情内角色加入当前游戏）
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `programmatic` TR-8.1: 到达触发年龄时显示剧情选项
  - `programmatic` TR-8.2: 无论选择哪个选项都进入剧情
  - `programmatic` TR-8.3: 剧情角色正确进入游戏世界
- **Notes**: 需要修改game.js中的selectOption逻辑，以及处理角色进入机制

## [ ] Task 9: 前端路由与界面切换
- **Priority**: P2
- **Depends On**: Task 3, Task 6
- **Description**: 
  - 添加剧情推演界面路由
  - 实现界面之间的切换逻辑
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-9.1: 界面切换正常
  - `programmatic` TR-9.2: 历史记录管理正确
- **Notes**: 需要修改ui.js中的showScreen函数

## [ ] Task 10: 测试与调试
- **Priority**: P2
- **Depends On**: 所有任务
- **Description**: 
  - 端到端测试所有功能
  - 修复发现的bug
  - 优化用户体验
- **Acceptance Criteria Addressed**: 所有AC
- **Test Requirements**:
  - `programmatic` TR-10.1: 所有API端点测试通过
  - `human-judgment` TR-10.2: 用户流程顺畅
