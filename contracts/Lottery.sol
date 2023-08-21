// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Lottery__NotEnoughEthEntered(uint256 required, uint256 sent);

contract Lottery is VRFConsumerBaseV2 {
    uint256 private immutable i_entranceFee;
    address payable[] private entrants;

    event LotteryEntered(address indexed player);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughEthEntered({
                required: i_entranceFee,
                sent: msg.value
            });
        }
        entrants.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }

    function requestRandomWinner() external {}

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {}

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getEntrant(uint256 index) public view returns (address) {
        return entrants[index];
    }

    function getEntrants() public view returns (address payable[] memory) {
        return entrants;
    }
}
