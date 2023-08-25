import { ethers } from 'hardhat'
import { networkConfigInfo } from './global'

export const networkConfig: networkConfigInfo = {
    hardhat: {
        blockConfirmations: 1,
        entranceFee: ethers.parseEther('0.01'),
        gasLane: '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
        callbackGasLimit: '500000',
        interval: 30,
    },
    sepolia: {
        vrfCoordinatorV2: '0x8103b0a8a00be2ddc778e6e7eaa21791cd364625',
        entranceFee: ethers.parseEther('0.01'),
        gasLane: '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
        subscriptionId: '4673',
        callbackGasLimit: '500000',
        interval: 30,
        blockConfirmations: 5,
        contractAddress: '0x7581803f45e8ae263d90cd13b6e97b53a97cda67',
    },
}

export const devChains = ['hardhat', 'localhost']
