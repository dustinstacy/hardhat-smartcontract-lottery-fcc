import { DeployFunction } from 'hardhat-deploy/dist/types'
import { devChains, networkConfig } from '../helper-hardhat-config'
import { DeployInterface } from '../global'
import { ethers } from 'hardhat'
import verify from '../utils/verify'
import { VRFCoordinatorV2Mock } from '../typechain-types'

const VRF_SUB_FUND_AMOUNT = ethers.parseEther('2')

const deployLottery: DeployFunction = async ({
    getNamedAccounts,
    deployments,
    network,
}: DeployInterface) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()

    let vrfCoordinatorV2Address: string | undefined
    let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
    let subscriptionId: string | undefined

    if (devChains.includes(network.name)) {
        const vrfCoordinatorV2MockDeployment = await get('VRFCoordinatorV2Mock')
        vrfCoordinatorV2Address = vrfCoordinatorV2MockDeployment.address
        vrfCoordinatorV2Mock = await ethers.getContractAt(
            'VRFCoordinatorV2Mock',
            vrfCoordinatorV2Address
        )
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = transactionReceipt!.logs[0].topics[1]
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[network.name]['vrfCoordinatorV2']
        subscriptionId = networkConfig[network.name]['subscriptionId']
    }

    const args: any[] = [
        vrfCoordinatorV2Address,
        networkConfig[network.name]['gasLane'],
        networkConfig[network.name]['callbackGasLimit'],
        subscriptionId,
        networkConfig[network.name]['entranceFee'],
        networkConfig[network.name]['interval'],
    ]

    const lottery = await deploy('Lottery', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
    })

    if (devChains.includes(network.name)) {
        await vrfCoordinatorV2Mock!.addConsumer(subscriptionId as string, lottery.address)
    }

    if (!devChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log('Verifying...')
        await verify(lottery.address, args)
    }
    log('--------------------------------------')
}

export default deployLottery
deployLottery.tags = ['all']
