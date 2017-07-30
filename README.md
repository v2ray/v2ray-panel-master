# V2Ray Panel

**Warning: 本项目处于早期开发阶段，请勿用于生产环境。**

### 安装

环境要求： 

- 64 位 Linux, glibc 与 libstdc++ 版本最低与 Ubuntu 14.04 相同
- Node.JS v8.0 或以上
- MongoDB
- [Ice Core 核心库](https://github.com/losfair/IceCore)

安装: 

```
git clone https://github.com/v2ray/v2ray-Panel
cd v2ray-Panel
npm install
```

Panel 前端节点:

```
# Auto generate admin id
chmod +x tools/setup_master.sh
./tools/setup_master.sh

# Run
node backend/main.js config/master.json
```

承载节点:

```
# Connect the master
chmod +x tools/setup_node.sh
./tools/setup_node.sh

# Run
node backend/main.js config/node.json
```

其中， `config/master.json` 和 `config/node.json` 是配置文件，可以根据需要修改。

### Patch Core

目前， V2Ray Panel 需要对 Core 进行 Patch 来实现流量统计功能。

Patched Core: [https://github.com/losfair/v2ray-core](https://github.com/losfair/v2ray-core)
