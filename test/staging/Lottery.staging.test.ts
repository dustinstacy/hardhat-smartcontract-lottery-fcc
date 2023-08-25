import { ethers, network } from 'hardhat'
import { devChains, networkConfig } from '../../helper-hardhat-config'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { Lottery } from '../../typechain-types'
import { expect } from 'chai'
import { TypedContractEvent } from '../../typechain-types/common'

devChains.includes(network.name)
    ? describe.skip
    : describe('lottery', () => {
          let accounts: SignerWithAddress[]
          let lottery: Lottery
          let entranceFee: bigint | undefined

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              lottery = await ethers.getContractAt(
                  'Lottery',
                  networkConfig[network.name].contractAddress as string
              )
              entranceFee = networkConfig[network.name].entranceFee
          })

          describe('fullfillRandomWords', () => {
              it('Connects Chainlink Keepers and VRF, and we get a random winner', async () => {
                  const winnerPickedEvent: TypedContractEvent = lottery.filters['WinnerPicked']
                  const startingTimeStamp = await lottery.getLatestTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      lottery.once(winnerPickedEvent, async (winner) => {
                          console.log('Found the event!', 'Winner:', winner)
                          try {
                              const recentWinner = await lottery.getRecentWinner()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  recentWinner
                              )
                              const lotteryState = await lottery.getLotteryState()
                              const endingTimeStamp = await lottery.getLatestTimeStamp()

                              await expect(lottery.getEntrant(0)).to.be.reverted
                              expect(recentWinner).to.equal(accounts[0].address)
                              expect(lotteryState).to.equal(0)
                              expect(winnerEndingBalance).to.equal(
                                  winnerEndingBalance + entranceFee!
                              )
                              expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp)
                              resolve(null)
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })

                      await lottery.enterLottery({ value: entranceFee })
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[0])
                  })
              })
          })
      })
