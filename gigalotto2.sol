// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/shared/interfaces/AggregatorV2V3Interface.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.0/contracts/access/Ownable.sol";
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/v4.9.0/contracts/security/ReentrancyGuard.sol";

contract GigaLottoV3 is VRFConsumerBaseV2, Ownable, ReentrancyGuard {
    struct Entry {
        address user;
        uint256 cumulativeWeight;
    }

    Entry[] public entries;
    mapping(address => uint256) public userDeposits;
    uint256 public totalPool;
    uint256 public collectedFees;

    AggregatorV2V3Interface public priceFeed;
    VRFCoordinatorV2Interface public vrfCoordinator;

    uint256 public constant TARGET_USD = 2_200_000_000 * 1e8; // 8 decimal Chainlink price feed
    uint256 public constant MIN_24H_USD = 2_500_000 * 1e8; // 8 decimal USD check
    uint256 public constant FEE_PERCENT = 2;

    uint256 public holdStartTimestamp;
    uint256 public last24hWindowStart;
    uint256 public last24hDepositUsd;

    address public winner;
    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint256 public lastRequestId;
    uint32 public callbackGasLimit = 200000;
    uint16 public requestConfirmations = 3;

    constructor(
        address _priceFeed,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        priceFeed = AggregatorV2V3Interface(_priceFeed);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    receive() external payable {
        deposit();
    }

    function deposit() public payable nonReentrant {
        require(msg.value >= 0.001 ether, "Min deposit 0.001 ETH");
        uint256 fee = (msg.value * FEE_PERCENT) / 100;
        collectedFees += fee;
        uint256 contribution = msg.value - fee;

        userDeposits[msg.sender] += contribution;
        totalPool += contribution;

        uint256 cumulative = entries.length == 0 ? contribution : entries[entries.length - 1].cumulativeWeight + contribution;
        entries.push(Entry({user: msg.sender, cumulativeWeight: cumulative}));

        (, int256 ethUsd,,,) = priceFeed.latestRoundData();
        uint256 usdValue = uint256(ethUsd) * contribution / 1e18;

        if (block.timestamp > last24hWindowStart + 24 hours) {
            last24hWindowStart = block.timestamp;
            last24hDepositUsd = usdValue;
        } else {
            last24hDepositUsd += usdValue;
        }

        if (holdStartTimestamp == 0 && getJackpotUsd() >= TARGET_USD) {
            holdStartTimestamp = block.timestamp;
            last24hWindowStart = block.timestamp;
            last24hDepositUsd = usdValue;
        }
    }

    function getJackpotUsd() public view returns (uint256) {
        (, int256 ethUsd,,,) = priceFeed.latestRoundData();
        return uint256(ethUsd) * totalPool / 1e18;
    }

    function canDraw() public view returns (bool) {
        if (holdStartTimestamp == 0) return false;
        if (block.timestamp < holdStartTimestamp + 24 hours) return false;
        return last24hDepositUsd < MIN_24H_USD;
    }

    function requestDraw() external onlyOwner {
        require(canDraw(), "Cannot draw yet");
        require(entries.length > 0, "No entries");

        lastRequestId = vrfCoordinator.requestRandomWords(
            keyHash,
            uint64(subscriptionId),
            requestConfirmations,
            callbackGasLimit,
            1
        );
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        require(requestId == lastRequestId, "Invalid request ID");
        uint256 totalWeight = entries[entries.length - 1].cumulativeWeight;
        uint256 winningWeight = randomWords[0] % totalWeight;

        for (uint256 i = 0; i < entries.length; i++) {
            if (winningWeight < entries[i].cumulativeWeight) {
                winner = entries[i].user;
                break;
            }
        }
    
    }

    function withdrawIfWinner() external nonReentrant {
        require(msg.sender == winner, "Not winner");
        uint256 prize = address(this).balance - collectedFees;
        winner = address(0);
        payable(msg.sender).transfer(prize);
    }

    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        collectedFees = 0;
        payable(msg.sender).transfer(fees);
    }

    function getEntriesCount() external view returns (uint256) {
        return entries.length;
    }

    function getEntry(uint256 index) external view returns (address user, uint256 cumulative) {
        Entry memory e = entries[index];
        return (e.user, e.cumulativeWeight);
    }
}
