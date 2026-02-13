// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAintiVirusFactory} from "../interfaces/IAintiVirusFactory.sol";

interface IAintiVirusStaking {
    // Events
    event Staked(
        address indexed staker,
        uint256 indexed seasonId,
        address indexed asset,
        uint256 amount
    );
    event Claimed(
        address indexed staker,
        uint256 indexed seasonId,
        address indexed asset,
        uint256 amount
    );
    event Unstaked(address indexed staker, address indexed asset, uint256 amount);

    event RewardAdded(uint256 amount, address indexed asset, uint256 seasonId);
    event SeasonStarted(uint256 seasonId, uint256 start, uint256 end);
    event NextSeasonDurationUpdated(uint256 oldDuration, uint256 newDuration);

    // Structs
    struct Season {
        uint64 seasonId;
        uint64 start;
        uint64 end;
        uint64 duration;
        mapping(address asset => SeasonTotals totals) totals;
    }

    struct SeasonTotals {
        uint256 totalStaked;
        uint256 totalReward;
        uint256 totalWeight;
    }

    struct StakeRecord {
        uint64 seasonId;
        uint64 stakedAt;
        uint128 claimedCount;
        uint256 staked;
        uint256 weight;
    }

    // Public state variables
    function factory() external view returns (IAintiVirusFactory);

    function nextSeasonDuration() external view returns (uint256);

    function currentSeasonId() external view returns (uint256);

    function seasonAndTotals(
        uint256 seasonId_,
        address asset_
    )
        external
        view
        returns (
            uint256 seasonId,
            uint256 start,
            uint256 end,
            uint256 duration,
            uint256 totalStaked,
            uint256 totalReward,
            uint256 totalWeight
        );

    function seasons(
        uint256 seasonId_
    ) external view returns (uint256 seasonId, uint256 start, uint256 end, uint256 duration);

    function records(
        address staker_,
        address asset_
    )
        external
        view
        returns (
            uint64 seasonId,
            uint64 stakedAt,
            uint128 claimedCount,
            uint256 staked,
            uint256 weight
        );

    function wasSeasonClaimed(
        address staker,
        uint256 seasonId,
        address asset
    ) external view returns (bool);

    // Functions
    function addRewards(address asset, uint256 amount) external;

    function startNewSeason() external;

    function updateNextSeasonDuration(uint256 _duration) external;

    // State-only functions for Factory
    function stake(address staker, address asset, uint256 amount) external;

    function claim(
        address staker,
        address asset,
        uint256 seasonId
    ) external returns (uint256 reward);

    function unstake(address staker, address asset) external returns (uint256 releaseAmount);
}
