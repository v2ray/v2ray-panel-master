#!/bin/bash

  echo "Please enter your node key: "
  read key

  if [ ! $key ]; then
      echo "quit"
      exit
  else
      sed -i -e "s/fe11630d-10ae-47c3-9c79-d363bc35593a/$key/g" ./config/node.json
      echo "You key: $key"
  fi