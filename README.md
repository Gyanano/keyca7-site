# keyca7-site

KeyCat 的个人小站 · <https://keyca7.com>

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
  content/site.json   页面文字内容：小作坊 / 随笔 / 社交 / 便条文案
  scripts/ styles/ assets/
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

- `arcade`：小作坊条目（`cat` 为 `game` 或 `tool`）。`/play/<slug>/` 下的游戏和工具不在本仓库，由同域的另一个服务提供，本地预览时这些链接会 404
- `essays`：随笔（`title` / `summary` / `body[]` / `quote` / `date` / `readTime`），为空时页面显示空状态
- `socials`：社交账号

## 部署

静态托管即可，构建命令留空，输出目录为 `site`。例如 Cloudflare Workers 静态资源（`assets.directory = "./site"`）或 Cloudflare Pages。
**不要把仓库根目录当作部署目录。**

## 授权

本仓库采用双重许可，详见 `LICENSE`：

- **代码**（HTML / CSS / JavaScript / 脚本 / 配置）：MIT
- **个人品牌与内容素材**：保留所有权利（All Rights Reserved）。包括 KeyCat 黑猫形象及所有猫图 / 头像、插画、`site/assets` 下的自制图片与图标、随笔文章与便条文案、KeyCat 名称与标识。文件清单见 `ASSETS-LICENSE.md`
- **第三方字体与素材**：遵循各自原许可，见 `CREDITS.md`

欢迎学习、修改并使用代码。若 fork 或二次发布，请替换上述品牌形象、自制图片与文案，换成你自己的素材，不要把本站换个名字直接上线。

黑猫形象、头像、猫爪、签名和小作坊作品图标等二进制素材不在本公开仓库中，以免随 Git 历史被取用。这些文件放在私有仓库的 `keyca7-site-brand-assets/`，部署到 keyca7.com 时再并入 `site/assets/`。本地预览请先按 `ASSETS-LICENSE.md` 的说明拷回。
