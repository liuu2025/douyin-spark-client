# 前端 Docker 部署说明

本文说明 `douyin-spark-client` 如何构建前端静态文件、制作前端运行镜像，以及如何在本机或服务器上启动 `douyin-spark-web` 容器。

当前版本：

```text
douyin-spark-client v0.9.0
```

配套版本：

```text
douyin-spark v0.9.0
douyin-spark-assistant v0.9.0
```

## 一、前端容器的职责

前端项目是 Vue + Vite 项目。Docker 部署时，浏览器访问的是已经构建好的 `dist/` 静态文件，而不是直接运行 Vue 源码。

完整运行链路是：

```text
浏览器
  -> douyin-spark-web:8080
  -> douyin-spark Go 后端:8787
  -> douyin-spark-assistant:8000
```

前端不会直接请求 Python Agent。智能客服请求仍然通过 Go 后端的：

```text
/api/v1/assistant/...
```

进行代理。

## 二、前端 Docker 文件

```text
package.json
  前端依赖和构建脚本。

package-lock.json
  npm 实际安装版本和完整依赖锁定信息。

Dockerfile.deploy
  把 dist/ 复制到已有前端运行镜像。
```

当前 `Dockerfile.deploy` 的核心内容是：

```dockerfile
FROM douyin-spark-web:local
COPY dist/ /app/html/
```

它不是从 Node.js 镜像开始构建的完整 Dockerfile，而是依赖本机或服务器已经存在：

```text
douyin-spark-web:local
```

这个基础镜像包含前端静态文件运行程序，通常使用：

```text
/app/web-server
```

因此，前端仓库主要负责：

```text
Vue 源码
npm 构建
dist/ 静态文件
Dockerfile.deploy
```

## 三、镜像标签和代码版本

三个项目从 `v0.9.0` 开始使用同步兼容版本号，但当前 Docker 部署使用的镜像标签是：

```text
douyin-spark-web:local
```

这两个概念不同：

```text
Git 标签：v0.9.0
Docker 镜像标签：local
```

`:local` 表示当前机器上构建和部署的镜像。服务器部署时通常也是导入同名镜像，再由 Compose 使用该标签启动容器。

## 四、本地构建前端镜像

在前端项目根目录执行：

```powershell
cd D:\Projects\test\douyin-spark-workspace\douyin-spark-client
npm.cmd run build
docker build -f Dockerfile.deploy -t douyin-spark-web:local .
```

第一条构建命令会生成：

```text
dist/
```

第二条 Docker 命令会把 `dist/` 复制进 `douyin-spark-web:local` 镜像。

如果只是修改了 Vue 页面、样式或接口调用代码，通常需要重新执行这两步。仅执行 `docker restart` 不会把新的 `dist/` 复制进旧镜像。

## 五、前端容器运行参数

前端容器通常使用：

```text
容器名：douyin-spark-web
镜像：douyin-spark-web:local
端口：8080
```

容器运行程序通常需要：

```text
ADDR=:8080
BACKEND_URL=http://douyin-spark:8787
```

当 Go 后端和前端容器在同一个 Docker Compose 网络中时，推荐使用：

```text
BACKEND_URL=http://douyin-spark:8787
```

如果前端容器单独运行在 Docker Desktop 中，而 Go 后端通过宿主机端口暴露，则可以使用：

```text
BACKEND_URL=http://host.docker.internal:8787
```

## 六、服务器轻量部署

如果只修改了前端代码，没有修改前端运行程序和基础镜像，可以采用轻量部署：

1. 本地执行 `npm.cmd run build`。
2. 准备 `dist/` 和 `Dockerfile.deploy`。
3. 使用 `tar.gz` 打包这两个文件。
4. 上传到服务器并解压。
5. 服务器基于已有的 `douyin-spark-web:local` 重新构建镜像。
6. 只重建 `douyin-spark-web` 容器。

服务器上的典型命令：

```bash
cd /opt/douyin-spark-images/web-dist-current
sudo docker build -f Dockerfile.deploy -t douyin-spark-web:local .
cd /opt/douyin-spark-deploy
sudo docker compose up -d --force-recreate --no-deps douyin-spark-web
```

前端轻量部署不需要上传：

```text
node_modules/
源码以外的本地缓存
.env
本地测试数据
```

## 七、检查前端容器

查看容器状态：

```powershell
docker ps --filter name=douyin-spark-web
```

查看日志：

```powershell
docker logs --tail 100 douyin-spark-web
```

查看前端健康接口：

```powershell
curl.exe http://127.0.0.1:8080/health
```

正常情况下返回：

```json
{"status":"ok"}
```

## 八、数据和安全边界

前端容器通常不保存 Go 后端业务数据库，也不保存 Agent 的会话数据库或向量库。

不要把以下内容提交到 GitHub：

```text
node_modules/
.env
.env.local
.tmp/
本地调试输出
```

`dist/` 通常是部署产物，可以在本地生成后用于制作镜像，但当前项目不要求把它提交到 Git。

