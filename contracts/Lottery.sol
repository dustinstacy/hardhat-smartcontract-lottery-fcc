// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/* Custom Errors */
error Lottery__Closed();
error Lottery__NotEnoughEthSent(uint256 required, uint256 sent);
error Lottery__TransferFailed();
error Lottery__UpkeepNotNeeded(
    uint256 state,
    uint256 timePassed,
    uint256 balance,
    uint256 numEntrants
);

///@title A sample Lottery Contract
///@author Dustin Stacy
///@notice This contract is for creating a sample raffle contract
///@dev This implements the Chainlink VRF Version 2
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* Type declarations */
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    /* State variables */

    // Chainlink VRF variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint64 private immutable i_subscriptionId;
    uint16 private constant NUM_WORDS = 1;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    // Lottery variables
    uint256 private immutable i_entranceFee;
    uint256 private immutable i_interval;
    address payable[] private entrants;
    address private recentWinner;
    uint256 private lastTimeStamp;
    LotteryState private lotteryState;

    /* Events */
    event LotteryEntered(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane, //keyHash
        uint32 callbackGasLimit,
        uint64 subscriptionId,
        uint256 entranceFee,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        i_interval = interval;
        lastTimeStamp = block.timestamp;
        lotteryState = LotteryState.OPEN;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughEthSent({
                required: i_entranceFee,
                sent: msg.value
            });
        }
        if (lotteryState != LotteryState.OPEN) {
            revert Lottery__Closed();
        }
        entrants.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (bool upkeepNeeded, bytes memory /*performData*/)
    {
        bool isOpen = (LotteryState.OPEN == lotteryState);
        bool timePassed = ((block.timestamp - lastTimeStamp) > i_interval);
        bool hasBalance = address(this).balance > 0;
        bool hasPlayers = (entrants.length > 0);
        upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
    }

    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded({
                state: uint256(lotteryState),
                timePassed: (block.timestamp - lastTimeStamp),
                balance: address(this).balance,
                numEntrants: entrants.length
            });
        }
        lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % entrants.length;
        address payable mostRecentWinner = entrants[indexOfWinner];
        recentWinner = mostRecentWinner;
        entrants = new address payable[](0);
        lastTimeStamp = block.timestamp;
        lotteryState = LotteryState.OPEN;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /* Getter Functions */

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getEntrant(uint256 index) public view returns (address) {
        return entrants[index];
    }

    function getNumEntrants() public view returns (uint256) {
        return entrants.length;
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return lotteryState;
    }

    function getLatestTimeStampe() public view returns (uint256) {
        return lastTimeStamp;
    }
}
