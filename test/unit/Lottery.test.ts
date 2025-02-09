import { deployments, ethers, network } from 'hardhat'
import { devChains, networkConfig } from '../../helper-hardhat-config'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Lottery, VRFCoordinatorV2Mock } from '../../typechain-types'
import { expect } from 'chai'
import { TypedContractEvent } from '../../typechain-types/common'

!devChains.includes(network.name)
    ? describe.skip
    : describe('Lottery', () => {
          let accounts: SignerWithAddress[]
          let entrant: SignerWithAddress
          let lottery: Lottery
          let lotteryContract: Lottery
          let lotteryAddress: string
          let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
          let vrfCoordinatorV2MockAddress: string
          let entranceFee: bigint | undefined
          let interval: number

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              entrant = accounts[1]
              await deployments.fixture()
              lotteryAddress = (await deployments.get('Lottery')).address
              lotteryContract = await ethers.getContractAt('Lottery', lotteryAddress)
              lottery = lotteryContract.connect(entrant)
              vrfCoordinatorV2MockAddress = (await deployments.get('VRFCoordinatorV2Mock')).address
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  'VRFCoordinatorV2Mock',
                  vrfCoordinatorV2MockAddress
              )
              entranceFee = networkConfig[network.name].entranceFee
              interval = networkConfig[network.name].interval as number
          })

          describe('constructor', () => {
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
                  const tx = await vrfCoordinatorV2Mock.createSubscription()
                  const receipt = await tx.wait(1)
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
                  const lastTimestamp = await lottery.getLatestTimeStamp()
                  expect(lastTimestamp + BigInt(1)).to.equal(
                      (await ethers.provider.getBlock('latest'))!.timestamp
                  )
              })

              it('Initializes the lottery state correctly', async () => {
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(0)
              })
          })

          describe('enterLottery', () => {
              it('Reverts the transaction if there is not enough ETH', async () => {
                  await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
                      lottery,
                      'Lottery__NotEnoughEthSent'
                  )
              })

              it('Denies entry when lottery is in a Closed state', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send('evm_mine', [])
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await lottery.performUpkeep('0x')
                  await expect(
                      lottery.enterLottery({ value: entranceFee })
                  ).to.be.revertedWithCustomError(lottery, 'Lottery__Closed')
              })

              it('Adds entrant to entrants array upon entry!', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  const entrantFromContract = await lottery.getEntrant(0)
                  expect(entrantFromContract).to.equal(entrant.address)
              })

              it('Emits a new Lottery Entered event for each new entrant', async () => {
                  await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
                      lottery,
                      'LotteryEntered'
                  )
              })
          })

          describe('checkUpkeep', () => {
              it('Returns false if the lottery is closed', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
                  await lottery.performUpkeep('0x')
                  const lotteryState = await lottery.getLotteryState()
                  const { upkeepNeeded } = await lottery.checkUpkeep.staticCall('0x')
                  expect(lotteryState).to.equal(1)
                  expect(upkeepNeeded).to.be.false
              })

              it('Returns false if not enough time has passed', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send('evm_increaseTime', [interval - 2])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await lottery.checkUpkeep.staticCall('0x')
                  expect(upkeepNeeded).to.be.false
              })

              it('Return false if there are no entrants', async () => {
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await lottery.checkUpkeep.staticCall('0x')
                  expect(upkeepNeeded).to.be.false
              })

              it('Returns true if is open, enough time has passed, and has entrants', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
                  const { upkeepNeeded } = await lottery.checkUpkeep.staticCall('0x')
                  expect(upkeepNeeded).to.be.true
              })
          })

          describe('performUpKeep', async () => {
              beforeEach(async () => {
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
              })

              it('Should revert if upkeep is not needed', async () => {
                  await expect(lottery.performUpkeep('0x')).to.be.revertedWithCustomError(
                      lottery,
                      'Lottery__UpkeepNotNeeded'
                  )
              })

              it('Should set the lottery state to Calculating', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await lottery.performUpkeep('0x')
                  const lotteryState = await lottery.getLotteryState()
                  expect(lotteryState).to.equal(1)
              })

              it('Should call the requestRandomWords function and stores it as a requestId', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  const tx = await lottery.performUpkeep('0x')
                  const txReceipt = await tx.wait(1)
                  const requestId = txReceipt!.logs[1].topics[1]
                  expect(requestId).to.be.greaterThan(BigInt(0))
              })

              it('Should emit a Requested Random Lottery winner event', async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await expect(lottery.performUpkeep('0x')).to.emit(
                      lottery,
                      'RequestedLotteryWinner'
                  )
              })
          })

          describe('fulfillRandomWords', () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: entranceFee })
                  await network.provider.send('evm_increaseTime', [interval + 1])
                  await network.provider.send('evm_mine', [])
              })

              it('It can only be called after performUpkeep', async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lotteryAddress)
                  ).to.be.rejectedWith('nonexistent request')
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lotteryAddress)
                  ).to.be.rejectedWith('nonexistent request')
                  expect(lottery).to.be.revertedWithCustomError(lottery, 'Lottery__TransferFailed')
              })

              it('picks a winner, resets the lottery, and sends ETH', async () => {
                  const winnerPickedEvent: TypedContractEvent = lottery.filters['WinnerPicked']
                  const additionalEntrants = 3
                  const startingAccountIndex = 2
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      lottery = lotteryContract.connect(accounts[i])
                      await lottery.enterLottery({ value: entranceFee })
                  }
                  const startingTimeStamp = await lottery.getLatestTimeStamp()
                  const entrants = await lottery.getEntrants()

                  await new Promise(async (resolve, reject) => {
                      lottery.once(winnerPickedEvent, async (winner) => {
                          console.log('Found the event!', 'Winner:', winner)
                          try {
                              const recentWinner = await lottery.getRecentWinner()
                              const winnerBalance = await ethers.provider.getBalance(recentWinner)
                              const numEntrants = await lottery.getNumEntrants()
                              const lotteryState = await lottery.getLotteryState()
                              const endingTimeStamp = await lottery.getLatestTimeStamp()
                              expect(numEntrants).to.equal(0)
                              expect(lotteryState).to.equal(0)
                              expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp)
                              expect(winnerBalance).to.equal(
                                  startingBalance + entranceFee! * BigInt(entrants.length)
                              )
                              expect(lottery).to.not.be.revertedWithCustomError(
                                  lottery,
                                  'Lottery__TransferFailed'
                              )
                              resolve(null)
                          } catch (e) {
                              reject(e)
                          }
                      })
                      const tx = await lottery.performUpkeep('0x')
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await ethers.provider.getBalance(
                          accounts[2].getAddress()
                      )
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt!.logs[1].topics[1],
                          lotteryAddress
                      )
                  })
              })
          })
      })
