# 个人品牌与内容素材授权

© 2026 KeyCat。下列素材与文字**不在 MIT 范围内**，保留所有权利（All Rights Reserved）。

未经书面许可，请勿使用、修改或再分发这些素材，也请勿把本站整体换个名字直接上线。欢迎学习代码与交互实现；fork 或二次发布时，请换成你自己的形象、图标与文案。

更概括的说明见 `LICENSE`，第三方素材见 `CREDITS.md`。

## 1. KeyCat 形象与自制图片

- `site/assets/keycat-avatar.png`
- `site/assets/keycat-avatar.jpg`
- `site/assets/og-image.jpg`
- `site/assets/favicon-32.png`
- `site/assets/apple-touch-icon.png`
- `site/assets/cat-paw.png`
- `site/assets/keycat-signature.png`
- `site/assets/arcade/wanxiang-tangshui.png`
- `site/assets/arcade/huanming.png`
- `site/assets/arcade/shijie.png`

本地生成、未纳入 Git 跟踪的签名动图（`exports/keycat-signature-hd-*.gif`，目录已被 `.gitignore` 忽略）同样保留所有权利。

## 2. 名称与标识

「KeyCat」名称、手写签名字形，以及由上述形象构成的整体视觉识别。

## 3. 文字内容

以下文字保留所有权利，不得作为自己的内容再发布：

- `site/content/site.json` 中的随笔（`essays`）、便条文案（`deskNotes`），以及其中的站点介绍性文字
- 页面里的自我介绍与标题文案（例如「一隅键声」及副标题）

## 4. 不在本文件范围内的素材

这些文件遵循各自原许可或权利人声明，**不是** KeyCat 的 All Rights Reserved 素材，详见 `CREDITS.md`：

- `site/assets/audio/`：Kevin MacLeod，CC BY 4.0
- `site/assets/fonts/`：霞鹜文楷屏幕版，SIL OFL 1.1
- `site/assets/watermark-arcade.svg`、`site/assets/watermark-essays.svg`：Streamline Freehand，CC BY 4.0
- `site/assets/icon-x.svg`、`site/assets/icon-xiaohongshu.svg`：品牌标识归各自平台所有，仅用于本站外链指引
- 页面脚本中的线性小图标（换碟、关闭、箭头等）：Lucide 风格路径，Lucide 为 ISC 许可
- `site/assets/icon-mail.svg`、`site/assets/arrow-hand-left.svg`、`site/assets/arrow-hand-right.svg`：线性图标，按界面小图标处理
- `site/assets/arrow-loop-hint.svg`、`site/assets/vinyl-record.svg`、`site/assets/vinyl-record-amber.svg`、`site/assets/vinyl-record-plum.svg`、`site/assets/vinyl-record-teal.svg`：来源尚未最终确认，暂不视为 KeyCat 自制素材，也不得被误认为已按 MIT 授权

## 5. 公开仓库不含这些二进制素材

为避免黑猫形象等个人素材随公开 Git 历史被他人取用，上述第 1 节中的图片文件**不在公开仓库 `Gyanano/keyca7-site` 中**。它们存放在私有仓库 `Gyanano/keyca7-play` 的 `keyca7-site-brand-assets/` 目录，部署到 keyca7.com 时再并入 `site/assets/`，所以线上展示不变。

本地预览或部署前，请把该目录中的文件按相对路径拷回 `site/assets/`（文件已列入 `.gitignore`）。
