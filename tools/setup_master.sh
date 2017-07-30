#!/bin/bash

uuid=$(python  -c 'import uuid; print uuid.uuid4()')

sed -i -e "s/74ae900b-66df-4594-a977-eaf4205f9b30/$uuid/g" ./config/master.json

echo "Your admin uuid is $uuid"