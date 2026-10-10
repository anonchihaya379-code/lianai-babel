# 恋爱巴别塔 · 主角的手机

火狐角色卡「恋爱巴别塔：和方言少女们的同居日常」的悬浮组件外置资源。

- `phone/theme.css` / `phone/app.js`：手机界面（锁屏、QQ、相册、地图）
- `phone/data/cg.json`：CG 解锁表（`cond.love` 好感阈值 或 `cond.event` 事件名；`src` 填图片直链，`cap` 拍立得下的手写字）
- `phone/data/map.json`：上海地点与公寓房间
- `phone/data/state.json`：会话变量初始值
- `phone/huohu/`：粘进火狐的入口与世界书文本
- `phone/mock.html`：本地模拟火狐运行时的测试页

火狐里只放 `phone/huohu/floating_entry.html`，资源地址钉到提交哈希；改动后推送、换哈希、保存，即为上线。
