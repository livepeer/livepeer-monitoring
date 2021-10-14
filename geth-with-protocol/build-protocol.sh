mkdir /psrc && cd /psrc

git clone -b streamflow https://github.com/livepeer/protocol.git
srcDir=/psrc
cd $srcDir/protocol
# TODO: Update this file to be compatible with new deployment scripts in protocol repo
git checkout d8e3523e3779a7f339b94159ad5d36ce428799cc
echo "Setting devenv specific protocol parameters"
migrations="$srcDir/protocol/migrations/migrations.config.js"
sed -i 's/roundLength:.*$/roundLength: 50,/' $migrations
sed -i 's/unlockPeriod:.*$/unlockPeriod: 50,/' $migrations
sed -i 's/numActiveTranscoders:.*$/numActiveTranscoders: 50,/' $migrations
sed -i 's/numTranscoders:.*$/numTranscoders: 100,/' $migrations

cat << EOF > $srcDir/protocol/truffle.js
require("babel-register")
require("babel-polyfill")

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*", // Match any network id
            gas: 8000000
        },
        lpTestNet: {
            from: "0x$GETH_MINING_ACCOUNT",
            host: "localhost",
            port: 8545,
            network_id: 54321,
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

echo "Installing local dev version of $srcDir/protocol/scripts/unpauseController.js"

cat <<EOF > $srcDir/protocol/scripts/unpauseController.js
const Controller = artifacts.require("Controller")

module.exports = async cb => {
    const controller = await Controller.deployed()
    await controller.unpause({from: "0x$GETH_MINING_ACCOUNT"})
    cb()
}
EOF

echo "npm install"
npm install
echo "Compiling contracts..."
npm run compile
echo "Done compiling, deploying..."

# Create truffle alias pointing to locally installed version
alias truffle=./node_modules/.bin/truffle

nohup bash -c "/start.sh &" &&
sleep 1

OPWD=$PWD
cd $srcDir/protocol
migrateCmd="npm run migrate -- --network=lpTestNet"
echo "Running $migrateCmd"
eval $migrateCmd
unpauseCmd="truffle exec --network lpTestNet scripts/unpauseController.js"
echo "Running $unpauseCmd"
eval $unpauseCmd
controllerAddress=$(cd $srcDir/protocol && truffle networks | awk '/54321/{f=1;next} /TokenPools/{f=0} f' | grep Controller | cut -d':' -f2 | tr -cd '[:alnum:]')
echo "Controller address: $controllerAddress"
truffle networks
truffle networks > $gethRoot/networks
echo $controllerAddress > $gethRoot/controllerAddress
cd $OPWD
sleep 3
# now we need to wait till 100 block mined (so current protocol round will be 2)
while true
do
    blockNumber=$(geth attach --exec 'eth.blockNumber')
    echo "Current block is $blockNumber"

    if [ $blockNumber -gt 101 ]
    then
        echo "Good to go"
        break
    else
        echo "Need to wait till second round - we can't initialize transcoders in first one"
        sleep 5
    fi
done
# gracefully shutdown geth
pkill -9 geth
# let geth to write his data files to disk
sleep 1
