import { DeployInterface } from '../global'
import { devChains } from '../helper-hardhat-config'
import { ethers } from 'hardhat'

const BASE_FEE = ethers.parseEther('0.25')
const GAS_PRICE_LINK = 1e9

const deployMocks = async ({ getNamedAccounts, deployments, network }: DeployInterface) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    if (devChains.includes(network.name)) {
        log('Local netowrk detected! Deploying mocks...')
        await deploy('VRFCoordinatorV2Mock', {
            from: deployer,
            log: true,
            args: [BASE_FEE, GAS_PRICE_LINK],
        })
    }
    log('Mocks Deployed')
    log('----------------------------------')
}

export default deployMocks
deployMocks.tags = ['all', 'mocks']
