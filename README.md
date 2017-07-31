# V2Ray Panel

**Warning: 本项目处于早期开发阶段，请勿用于生产环境。**

### 安装

环境要求： 

- 64 位 Linux , **glibc 版本最低 2.14**

安装 (Debian / Ubuntu): 

```
curl -O "https://raw.githubusercontent.com/v2ray/v2ray-Panel/master/tools/install_debian.sh" && bash install_debian.sh
```

安装 (CentOS): 

```
curl -O "https://raw.githubusercontent.com/v2ray/v2ray-Panel/master/tools/install_centos.sh" && bash install_centos.sh
```

主节点:

```
# Initialize
cd /usr/local/v2ray-panel/v2ray-Panel/
chmod +x ./tools/setup_master.sh
./tools/setup_master.sh

# Run
v2ray-panel-master
```

承载节点:

```
# Connect the master
cd /usr/local/v2ray-panel/v2ray-Panel/
chmod +x ./tools/setup_node.sh
./tools/setup_node.sh

# Run
v2ray-panel-node
```

其中， 

- `config/master.json` 和 `config/node.json` 是配置文件，可以根据需要修改。
- 承载节点初始化所需的 Node Key 是 Panel 中创建节点时生成的。
- 目前，每次有用户变动或在 Panel 中手动修改用户流量时，需要在管理后台更新配置。

### Patch Core

目前， V2Ray Panel 需要对 Core 进行 Patch 来实现流量统计功能。

Patched Core: [https://github.com/losfair/v2ray-core](https://github.com/losfair/v2ray-core)
