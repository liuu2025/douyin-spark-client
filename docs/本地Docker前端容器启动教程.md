# 本地 Docker 前端容器启动教程

本文用于在 Windows + Docker Desktop 中构建并启动 `douyin-spark-web` 前端容器。

当前前端项目路径：

```text
D:\Projects\test\douyin-spark-workspace\douyin-spark-client
```

当前容器信息：

```text
容器名：douyin-spark-web
环境基线镜像：douyin-spark-web:local
前端产物镜像：douyin-spark-web:frontend-local
本机端口：8080
容器端口：8080
```

## 一、启动前提

本教程假设：

```text
Docker Desktop 已打开
douyin-spark-web:local 基础镜像已经存在
Go 后端容器正在 8787 端口运行
Agent 容器正在 8000 端口运行
```

检查 Docker：

```powershell
docker version
```

如果出现 `Cannot connect to the Docker daemon`，先打开 Docker Desktop，并等待 Docker Engine 完全启动。

检查基础前端镜像：

```powershell
docker images douyin-spark-web
```

如果能看到环境基线镜像：

```text
douyin-spark-web   local   ...
```

说明可以继续。这个镜像只作为运行环境基线，重构过程中不会删除。

如果没有这个镜像，当前前端仓库的 `Dockerfile.deploy` 不能单独完成第一次基础镜像构建，需要先准备 `douyin-spark-web:local` 基础运行镜像。

## 二、进入前端项目

在 PowerShell 中执行：

```powershell
cd D:\Projects\test\douyin-spark-workspace\douyin-spark-client
```

确认当前目录：

```powershell
Get-Location
```

## 三、构建前端 dist

如果依赖已经安装，直接执行：

```powershell
npm.cmd run build
```

如果提示缺少依赖，先执行：

```powershell
npm.cmd install
```

然后再次执行：

```powershell
npm.cmd run build
```

构建成功时通常会看到：

```text
✓ built in ...
```

并且项目根目录会生成：

```text
dist/
```

检查 `dist`：

```powershell
Get-ChildItem .\dist | Select-Object -First 10 Name,Length
```

Vite 可能提示某些 JavaScript chunk 大于 500 KB。只要最后显示 `built`，通常是构建警告，不代表构建失败。

## 四、构建前端 Docker 镜像

执行：

```powershell
docker build -f Dockerfile.deploy --build-arg BASE_IMAGE=douyin-spark-web:local -t douyin-spark-web:frontend-local .
```

这条命令会：

```text
1. 使用已有的 douyin-spark-web:local 作为环境基线。
2. 读取当前目录下的 dist/。
3. 把 dist/ 复制到容器内的 /app/html/。
4. 生成 douyin-spark-web:frontend-local，不覆盖环境基线镜像。
```

检查镜像：

```powershell
docker images douyin-spark-web
```

## 五、启动或重建前端容器

如果容器只是停止了，而且前端代码没有变化，可以直接启动：

```powershell
docker start douyin-spark-web
```

如果刚刚重新构建了镜像，建议删除旧容器并重新创建：

```powershell
docker rm -f douyin-spark-web 2>$null
docker run -d --name douyin-spark-web --restart unless-stopped -p 8080:8080 -e ADDR=:8080 -e BACKEND_URL=http://host.docker.internal:8787 douyin-spark-web:frontend-local
```

参数说明：

```text
ADDR=:8080
  让前端运行程序监听容器内 8080 端口。

BACKEND_URL=http://host.docker.internal:8787
  让前端容器访问本机 Docker 暴露的 Go 后端。
```

如果前端和 Go 后端由同一个 Compose 文件启动，并且服务名为 `douyin-spark`，则可以使用：

```text
BACKEND_URL=http://douyin-spark:8787
```

## 六、检查容器状态和日志

查看状态：

```powershell
docker ps --filter name=douyin-spark-web
```

正常应看到：

```text
STATUS 显示 Up
PORTS 显示 0.0.0.0:8080->8080/tcp
```

查看最近日志：

```powershell
docker logs --tail 100 douyin-spark-web
```

持续查看日志：

```powershell
docker logs -f douyin-spark-web
```

按 `Ctrl+C` 退出日志查看，不会停止容器。

## 七、健康检查和打开页面

健康检查：

```powershell
curl.exe http://127.0.0.1:8080/health
```

正常返回：

```json
{"status":"ok"}
```

浏览器打开：

```text
http://127.0.0.1:8080/
```

如果前端容器正常，但页面无法调用接口，再检查：

```powershell
curl.exe http://127.0.0.1:8787/health
curl.exe http://127.0.0.1:8000/health
```

完整智能客服链路需要三项健康检查都通过：

```text
前端：8080
Go 后端：8787
Agent：8000
```

## 八、修改前端代码后的流程

只修改前端 Vue、TypeScript、样式或接口调用代码时，执行：

```powershell
cd D:\Projects\test\douyin-spark-workspace\douyin-spark-client
npm.cmd run build
docker build -f Dockerfile.deploy --build-arg BASE_IMAGE=douyin-spark-web:local -t douyin-spark-web:frontend-local .
docker rm -f douyin-spark-web 2>$null
docker run -d --name douyin-spark-web --restart unless-stopped -p 8080:8080 -e ADDR=:8080 -e BACKEND_URL=http://host.docker.internal:8787 douyin-spark-web:frontend-local
curl.exe http://127.0.0.1:8080/health
```

不能只执行：

```powershell
docker restart douyin-spark-web
```

因为 `dist/` 已经被复制进旧镜像。重启只会重新启动旧容器，不会重新执行 Vue 构建。

## 九、常见问题

### 1. 8080 端口被占用

检查：

```powershell
netstat -ano | findstr :8080
```

如果确认是旧的前端容器，可以先删除：

```powershell
docker rm -f douyin-spark-web
```

### 2. 提示 dist 不存在

确认当前路径是前端项目根目录，然后执行：

```powershell
npm.cmd run build
```

### 3. 提示基础镜像不存在

错误通常类似：

```text
pull access denied for douyin-spark-web
```

这表示本机没有 `douyin-spark-web:local` 环境基线镜像，而当前 `Dockerfile.deploy` 依赖这个已有镜像，需要先准备基础前端运行镜像。

### 4. 页面能打开但接口失败

先检查 Go 后端：

```powershell
curl.exe http://127.0.0.1:8787/health
```

再检查前端容器环境变量：

```powershell
docker inspect douyin-spark-web --format '{{range .Config.Env}}{{println .}}{{end}}'
```

重点确认 `BACKEND_URL` 指向当前实际可访问的 Go 后端地址。

## 十、停止和删除

停止容器：

```powershell
docker stop douyin-spark-web
```

重新启动：

```powershell
docker start douyin-spark-web
```

删除容器：

```powershell
docker rm -f douyin-spark-web
```

删除容器不会删除 `douyin-spark-web:local` 或 `douyin-spark-web:frontend-local` 镜像，也不会删除前端源代码。
