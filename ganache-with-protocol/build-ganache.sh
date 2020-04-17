git clone -b streamflow https://github.com/livepeer/protocol.git
cd protocol
echo "Setting devenv specific protocol parameters"
migrations="/protocol/migrations/migrations.config.js"
sed -i 's/roundLength:.*$/roundLength: 50,/' $migrations
sed -i 's/unlockPeriod:.*$/unlockPeriod: 50,/' $migrations
sed -i 's/numActiveTranscoders:.*$/numActiveTranscoders: 50,/' $migrations
sed -i 's/numTranscoders:.*$/numTranscoders: 100,/' $migrations

cat << EOF > /protocol/truffle.js
require("babel-register")
require("babel-polyfill")

module.exports = {
    networks: {
        lpTestNet: {
            host: "localhost",
            port: 8545,
            network_id: "54321", // Match any network id
            gas: 8000000
        }
    },
    compilers: {
        solc: {
            version: "0.5.11",
            parser: "solcjs",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }
    }
};
EOF

echo "Installing local dev version of /protocol/scripts/unpauseController.js"

cat <<EOF > /protocol/scripts/unpauseController.js
const Controller = artifacts.require("Controller")

module.exports = async cb => {
    const controller = await Controller.deployed()
    await controller.unpause()
    cb()
}
EOF

echo "npm install"
npm install 
echo "Compiling contracts..."
npm run compile
echo "Done compiling, deploying..."

echo "installing ganache"
npm i ganache-cli -g

# Create truffle alias pointing to locally installed version
alias truffle=./node_modules/.bin/truffle
nohup bash -c "ganache-cli -k istanbul -l 0x7A1200 -h 0.0.0.0 -i 54321 -d --db $GANACHE_DB_PATH &" &&
sleep 1

migrateCmd="npm run migrate -- --network=lpTestNet"
echo "Running $migrateCmd"
eval $migrateCmd
unpauseCmd="truffle exec --network lpTestNet scripts/unpauseController.js"
echo "Running $unpauseCmd"
eval $unpauseCmd
controllerAddress=$(cd /protocol && truffle networks | awk '/54321/{f=1;next} /TokenPools/{f=0} f' | grep Controller | cut -d':' -f2 | tr -cd '[:alnum:]')
echo "Controller address: $controllerAddress"
truffle networks
sleep 3

cat <<EOF > /protocol/scripts/skipBlocks.js
const RPC = require('../utils/rpc')

module.exports = async cb => {
    const rpc = new RPC(web3)
    await rpc.wait(100)
}
EOF

echo "Need to wait till second round - we can't initialize transcoders in first one"
waitBlocksCmd="truffle exec --network lpTestNet scripts/skipBlocks.js"
echo "Running $waitBlocksCmd"
eval $waitBlocksCmd

echo "Good to go"

# shut down ganache-cli 
pkill -9 node 
sleep 1