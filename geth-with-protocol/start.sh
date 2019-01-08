geth -networkid 54321 -rpc -ws \
      -rpcaddr "0.0.0.0" -wsaddr "0.0.0.0" \
      -rpccorsdomain "*" -wsorigins "*" \
      -rpcapi 'personal,account,eth,web3,net' \
      -wsapi 'personal,account,eth,web3,net' \
      --unlock 0,1,2,3 \
      --password $gethRoot/password.txt \
      --nodiscover --maxpeers 0 \
      -targetgaslimit 8000000 \
      -mine
