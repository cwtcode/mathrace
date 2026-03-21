# Tasks
- [x] Task 1: 初始化项目结构 (Initialize Project Structure): 设置 React 前端和 Node.js/Express 后端的基础框架。
  - [x] SubTask 1.1: 创建 `frontend` 文件夹并初始化 Vite/React 项目。
  - [x] SubTask 1.2: 创建 `backend` 文件夹并初始化 Node.js/Express 项目。
  - [x] SubTask 1.3: 设置共享的数据模型（问题、答案、进度）。

- [x] Task 2: 实现核心竞赛界面 (Implement Main Race Interface): 创建主要的游戏屏幕，包括问题显示、数字键盘和赛道进度条。
  - [x] SubTask 2.1: 构建问题显示组件。
  - [x] SubTask 2.2: 构建数字键盘组件用于输入。
  - [x] SubTask 2.3: 构建赛道可视化组件，显示玩家角色和 AI/Ghost 角色的位置。

- [x] Task 3: 开发自适应挑战引擎 (Develop Adaptive Challenge Engine): 实现生成数学问题（加减法）并根据表现调整难度的逻辑。
  - [x] SubTask 3.1: 编写加减法问题的生成算法。
  - [x] SubTask 3.2: 实现难度调整逻辑（连续 3 对加难，连续 2 错减难）。
  - [x] SubTask 3.3: 创建 API 端点以请求新问题。

- [x] Task 4: 实现即时反馈与提示系统 (Implement Feedback & Hint System): 为正确答案提供正向反馈，为错误答案提供分层提示。
  - [x] SubTask 4.1: 添加正确答案的视觉/音效反馈。
  - [x] SubTask 4.2: 实现第一层提示：鼓励性文字信息。
  - [x] SubTask 4.3: 实现第二层提示：视觉化计数（例如苹果图标）。

- [x] Task 5: 游戏化与进度保存 (Gamification & Progression): 实现积分系统、角色解锁和简单的玩家个人资料。
  - [x] SubTask 5.1: 编写积分计算逻辑。
  - [x] SubTask 5.2: 实现本地存储（JSON 或 SQLite）以保存玩家进度和得分。
  - [x] SubTask 5.3: 创建角色选择和奖励显示屏幕。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 2, Task 4]
