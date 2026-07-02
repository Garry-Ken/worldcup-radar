# 绿茵雷达 worldcup-radar

FIFA 世界杯 2026 实时胜负与比分分析看板。

## 功能

- **实时比分**：直播中比赛大卡片（走表时钟），45 秒自动轮询 + 回到前台立即刷新
- **胜负·比分预测**：泊松模型（本届攻防强度 + 贝叶斯收缩），给出胜/平/负概率与最可能比分
- **淘汰赛对阵图**：1/16 决赛 → 决赛，左右半区对称布局
- **赛程与比分**：今日/直播/未开赛/已完赛筛选 + 轮次过滤，按日分组
- **分析面板**：球队战力榜（场均积分）、常见比分分布、单场进球结构、每日进球趋势

## 在线版

**https://garry-ken.github.io/worldcup-radar/** — GitHub Pages 静态托管，浏览器直连 ESPN 拉实时数据（接口开放 CORS），push 到 main 自动部署（`.github/workflows/deploy.yml`）。

## 数据链路

前端三级兜底：同源 `/api`（dev / standalone 模式，服务端缓存 45 秒）→ **浏览器直连 ESPN**（纯静态托管时）→ **离线演示模式**（确定性模拟数据，页面明确标注）。服务端 `/api` 自身也有三级：直连 → 本机代理 CONNECT 隧道（`WC_PROXY`，默认 `127.0.0.1:7897`）→ 演示数据。归一化与演示生成器在 `shared/`，前后端共用。

## 运行

```bash
npm install
npm run dev        # http://localhost:5197（/api 挂在 Vite 中间件，同端口）
npm run build && npm start   # 生产模式 http://localhost:3189
```
