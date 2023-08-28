import { deployments, network } from 'hardhat'
import * as fs from 'fs'

const FRONT_END_ADDRESSES_FILE =
    '../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json'
const FRONT_END_ABI_FILE = '../nextjs-smartcontract-lottery-fcc/constants/abi.json'

const updateContractAddresses = async () => {
    const lottery = await deployments.get('Lottery')
    const chainId = network.config.chainId
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, 'utf-8'))
    if ((chainId as number) in currentAddresses) {
        if (!currentAddresses[chainId!].includes(lottery.address)) {
            currentAddresses[chainId!].push(lottery.address)
        }
    }
    {
        currentAddresses[chainId!] = [lottery.address]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

const updateABI = async () => {
    const lottery = await deployments.get('Lottery')
    fs.writeFileSync(FRONT_END_ABI_FILE, JSON.stringify(lottery.abi))
}

const updateFrontEnd = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log('Updating front end...')
        updateContractAddresses()
        updateABI()
    }
}

export default updateFrontEnd
updateFrontEnd.tags = ['all', 'front-end']
