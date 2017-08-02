#!/bin/bash

cat > /etc/yum.repos.d/mongodb.repo << EOF

[mongodb]
name=MongoDB Repository
baseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64/
gpgcheck=0
enabled=1

EOF

yum install wget xz tar git gcc gcc-c++ mongodb-org
wget http://people.centos.org/tru/devtools-2/devtools-2.repo -O /etc/yum.repos.d/devtools-2.repo
yum install devtoolset-2-gcc devtoolset-2-gcc-c++ devtoolset-2-binutils
export PATH=/opt/rh/devtoolset-2/root/usr/bin/:$PATH

chkconfig mongod on
service mongod start

cd /tmp
rm -rf v2ray-panel | true
mkdir v2ray-panel
cd v2ray-panel
wget https://github.com/losfair/IceCore/releases/download/v0.2.0/ice_core_linux.tar.xz
xz -d < ice_core_linux.tar.xz | tar x
cp dist/libice_core.so /usr/lib/
cp dist/libice_core.so /usr/lib64/

wget https://nodejs.org/dist/v8.2.1/node-v8.2.1-linux-x64.tar.xz
xz -d < node-v8.2.1-linux-x64.tar.xz | tar x

rm -rf /usr/local/v2ray-panel | true
mkdir /usr/local/v2ray-panel
cd /usr/local/v2ray-panel

mv /tmp/v2ray-panel/node-v8.2.1-linux-x64 ./node

wget https://github.com/losfair/v2ray-core/releases/download/patched-2017072901/v2ray_patched
chmod +x v2ray_patched

git clone https://github.com/v2ray/v2ray-Panel
cd v2ray-Panel

export PATH="/usr/local/v2ray-panel/node/bin:"$PATH
npm install --unsafe-perm

mkdir /etc/v2ray-panel && cp config/*.json /etc/v2ray-panel/

cat > /usr/local/bin/v2ray-panel-master << EOF

#!/bin/bash
export PATH="/usr/local/v2ray-panel/node/bin:"$PATH
node /usr/local/v2ray-panel/v2ray-Panel/backend/main.js /etc/v2ray-panel/master.json

EOF

cat > /usr/local/bin/v2ray-panel-node << EOF

#!/bin/bash
export PATH="/usr/local/v2ray-panel/node/bin:"$PATH
killall v2ray_patched | true
node /usr/local/v2ray-panel/v2ray-Panel/backend/main.js /etc/v2ray-panel/node.json

EOF

chmod +x /usr/local/bin/v2ray-panel-master
chmod +x /usr/local/bin/v2ray-panel-node
