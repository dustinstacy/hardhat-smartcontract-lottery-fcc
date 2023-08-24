import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import 'dotenv/config'

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia'
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xkey'
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'key'
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || 'key'

const config: HardhatUserConfig = {
    solidity: '0.8.19',
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            url: 'http://127.0.0.1:8545/',
            chainId: 31337,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY as string],
            chainId: 11155111,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        entrant: {
            default: 1,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: true,
        outputFile: 'gas-report.txt',
        noColors: true,
        currency: 'USD',
        coinmarketcap: COINMARKETCAP_API_KEY,
        token: 'ETH',
    },
    mocha: {
        timeout: 200000,
    },
}

export default config
