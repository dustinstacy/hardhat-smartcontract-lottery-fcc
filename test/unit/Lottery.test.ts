import { deployments, ethers, network } from 'hardhat'
import { devChains, networkConfig } from '../../helper-hardhat-config'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import {
    Lottery,
    VRFCoordinatorV2Interface__factory,
    VRFCoordinatorV2Mock,
} from '../../typechain-types'
import { expect } from 'chai'

!devChains.includes(network.name)
    ? describe.skip
    : describe('Lottery', async () => {
          let deployer: SignerWithAddress
          let entrant: SignerWithAddress
          let lottery: Lottery
          let lotteryAddress: string
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let vrfCoordinatorV2MockAddress: string

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              entrant = accounts[1]
              await deployments.fixture()
              lotteryAddress = (await deployments.get('Lottery')).address
              lottery = await ethers.getContractAt('Lottery', lotteryAddress)
              vrfCoordinatorV2MockAddress = (await deployments.get('VRFCoordinatorV2Mock')).address
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  'VRFCoordinatorV2Mock',
                  vrfCoordinatorV2MockAddress
              )
          })

          describe('constructor', async () => {
              it('initializes the VRFCoordinatorV2 correctly', async () => {
                  const vrfCoordinatorV2Address = await lottery.getVRFCoordinatorV2()
                  expect(vrfCoordinatorV2Address).to.equal(vrfCoordinatorV2MockAddress)
              })

              it('initializes the gas lane (key hash) correctly', async () => {
                  const gasLane = await lottery.getGasLane()
                  expect(gasLane).to.equal(networkConfig[network.name].gasLane)
              })

              it('initializes the callback gas limit correctly', async () => {
                  const callbackGasLimit = await lottery.getCallbackGasLimit()
                  expect(callbackGasLimit).to.equal(networkConfig[network.name].callbackGasLimit)
              })

              it('initalizes the subscription id correctly', async () => {
                  let subscriptionId = await lottery.getSubscriptionId()
                  const transaction = await vrfCoordinatorV2Mock.createSubscription()
                  const receipt = await transaction.wait(1)
                  subscriptionId++ // Calling createSubscription() again increments the indexed _subId so we match that here
                  expect(subscriptionId).to.equal(receipt!.logs[0].topics[1])
              })

              it('initializes the entrance fee correctly', async () => {
                  const entranceFee = await lottery.getEntranceFee()
                  expect(entranceFee).to.equal(networkConfig[network.name].entranceFee)
              })

              it('initializes the interval correctly', async () => {
                  const interval = await lottery.getInterval()
                  expect(interval).to.equal(networkConfig[network.name].interval)
              })

              it('initializes the last time stamp correctly', async () => {
                  const lastTimestamp = await lottery.getLastTimeStamp()
                  expect(lastTimestamp).to.equal(
                      (await ethers.provider.getBlock('latest'))!.timestamp
                  )
              })

              it('Initializes the lottery state correctly', async () => {
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(0)
              })
          })

          describe('enterLottery', () => {
              it('Reverts the transaction if there is not enough ETH', () => {})
              it('Adds entrant to entrants array', () => {})
              it('Emits a new Lottery Entered event for each new entrant', () => {})
          })

          describe('checkUpkeep', () => {})
          describe('performUpKeep', () => {})
      })
