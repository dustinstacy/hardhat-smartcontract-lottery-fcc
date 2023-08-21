import { DeploymentsExtension, DeployFunction } from 'hardhat-deploy/dist/types'
import { Network } from 'hardhat/types'

interface DeployInterface {
    getNamedAccounts: () => Promise<{
        [name: string]: string
    }>
    deployments: DeploymentsExtension
    network: Network
}

const deployLottery: DeployFunction = async ({
    getNamedAccounts,
    deployments,
    network,
}: DeployInterface) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    const lottery = await deploy('Lottery', {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 5,
    })
    log('--------------------------------------')
}

export default deployLottery
deployLottery.tags = ['all']
