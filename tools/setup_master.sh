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

read -p "Username: " username

while true; do
    read -s -p "Password: " password
    echo
    read -s -p "Password (again): " password2
    echo
    [ "$password" = "$password2" ] && break
    echo "The passwords DO NOT match, please try again."
done

uuid=$(PWD=/usr/local/v2ray-panel/v2ray-Panel /usr/local/v2ray-panel/node/bin/node ./backend/cli.js -c $config_file register -u "$username" -p "$password")

if  [ $? != 0 ]; then
    echo $uuid
    exit 1
fi

sed -i -e "s/74ae900b-66df-4594-a977-eaf4205f9b30/$uuid/g" $config_file

echo "Done."
