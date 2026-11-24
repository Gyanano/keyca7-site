# keyca7-site

KeyCat 的个人小站 · <https://keyca7.com>（尚未上线）

一只戴细框眼镜的黑猫，在纸与键帽之间，写一点关于 AI 的念头，也顺手敲些小东西。

## 亮点

- **零依赖、零构建**：纯 HTML / CSS / 原生 JavaScript，没有框架、没有 npm 依赖。
- **一笔书写签名**：自写 `<keycat-brush>` Web Component，Canvas 上实时模拟 34 根笔毫的蓄墨与飞白。
- **宣纸着色器**：WebGL2 程序化宣纸纤维光与多色墨晕涟漪，不支持时自动降级为静态纹理。
- **机械键盘声合成**：Web Audio 纯程序化合成四种轴体声音，不使用任何音频采样。
- **捏角撕起的便利贴**、毛笔「Say Hi.」与可留墨的水写布。

## 目录

```
site/            唯一部署目录（上线的只有它）
  index.html
  content/site.json   页面文字内容：游乐场 / 随笔 / 社交
  scripts/ styles/ tools/ assets/
components/      可复用组件（React 封装等，未被页面直接引用）
docs/            产品与设计说明
scripts/         开发脚本（签名 GIF 生成）
```

## 本地预览

页面通过 `fetch` 读取 `site/content/site.json`，直接双击打开（file://）会被浏览器拦截，请用任意静态服务器：

```bash
npx serve site
# 或
python -m http.server 8080 --directory site
```

## 修改内容

编辑 `site/content/site.json`：

- `arcade`：游乐场条目（`cat` 为 `game` 或 `tool`）。`/play/<slug>/` 下的小游戏和小工具不在本仓库，由同域的另一个服务提供，本地预览时这些链接会 404
- `essays`：随笔（`title` / `summary` / `body[]` / `quote` / `date` / `readTime`），为空时页面显示空状态
- `socials`：社交账号

## 部署

静态托管即可，构建命令留空，输出目录为 `site`。例如 Cloudflare Workers 静态资源（`assets.directory = "./site"`）或 Cloudflare Pages。
**不要把仓库根目录当作部署目录。**

## 授权

- 代码：MIT（`LICENSE`）
- 文字内容：CC BY-NC-ND 4.0；KeyCat 形象、头像、猫爪与签名：保留所有权利（`LICENSE-CONTENT.md`）
- 第三方素材：见 `CREDITS.md`

欢迎学习和借鉴实现；请不要换个名字直接套用本站的形象与整体设计。
