#!/bin/bash

export PATH+=:/usr/local/v2ray-panel/node/bin

config_file=/etc/v2ray-panel/master.json

echo -n "Choose a port for the Web panel: (default: 1247)"
read web_port
if [ ! $web_port ]; then
    web_port="1247"
fi
sed -i -e "s/WEB_PORT/$web_port/g" $config_file

echo "Choose a username and password for your account."

echo -n "Username: "
read username

echo -n "Password: "
read password

uuid=$(node ./backend/cli.js -c $config_file register -u "$username" -p "$password")

if  [ $? != 0 ]; then
    echo $uuid
    exit 1
fi

sed -i -e "s/74ae900b-66df-4594-a977-eaf4205f9b30/$uuid/g" $config_file

echo "Done."
