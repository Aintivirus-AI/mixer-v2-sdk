// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAintiVirusStaking} from "./interfaces/IAintiVirusStaking.sol";
import {IAintiVirusFactory} from "./interfaces/IAintiVirusFactory.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract AintiVirusStaking is IAintiVirusStaking {
    using SafeCast for uint256;

    IAintiVirusFactory public immutable override factory;

    uint256 public override nextSeasonDuration;
    uint256 public override currentSeasonId;

    mapping(uint256 seasonId => Season) internal _seasons;
    mapping(address staker => mapping(address asset => StakeRecord)) public records;
    mapping(address staker => mapping(uint256 seasonId => mapping(address asset => bool)))
        public wasSeasonClaimed;

    error OnlyFactory();
    error InvalidAmount();
    error SeasonExpired();
    error AlreadyStaked();
    error SeasonNotStarted();
    error SeasonStillActive();
    error AlreadyClaimed();
    error NotStakedInSeason();
    error NoRewardToClaim();
    error NoStakedBalance();
    error MustClaimAllSeasons();
    error SameDuration();

    constructor() {
        factory = IAintiVirusFactory(msg.sender);

        uint256 _nextSeasonDuration = 30 days;
        uint256 _currentSeasonId = 1;

        currentSeasonId = _currentSeasonId;
        nextSeasonDuration = _nextSeasonDuration;

        Season storage season = _seasons[_currentSeasonId];
        season.seasonId = _currentSeasonId.toUint64();
        season.start = block.timestamp.toUint64();
        season.end = (block.timestamp + _nextSeasonDuration).toUint64();
        season.duration = _nextSeasonDuration.toUint64();

        emit SeasonStarted(
            _currentSeasonId,
            block.timestamp,
            block.timestamp + _nextSeasonDuration
        );
    }

    // ============ MODIFIERS ============

    modifier onlyFactory() {
        if (msg.sender != address(factory)) revert OnlyFactory();
        _;
    }

    // ============ FUNCTIONS ============

    /**
     * @dev State-only function to add rewards to the current staking season
     * Funds are held by the Factory, this only updates state
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param amount Amount of reward to add
     */
    function addRewards(address _asset, uint256 amount) external override onlyFactory {
        if (amount == 0) revert InvalidAmount();

        uint256 _currentSeasonId = currentSeasonId;
        SeasonTotals storage totals = _seasons[_currentSeasonId].totals[_asset];
        totals.totalReward += amount;

        emit RewardAdded(amount, _asset, _currentSeasonId);
    }

    /**
     * @dev State-only stake function for Factory to call
     * @param staker The staker address
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param amount The amount to stake
     */
    function stake(address staker, address _asset, uint256 amount) external override onlyFactory {
        uint256 _currentSeasonId = currentSeasonId;
        Season storage season = _seasons[_currentSeasonId];
        if (block.timestamp > season.end) revert SeasonExpired();
        if (amount == 0) revert InvalidAmount();

        StakeRecord storage record = records[staker][_asset];
        if (record.staked != 0) revert AlreadyStaked();

        uint256 timeLeft = season.end - block.timestamp;
        uint256 weight = (amount * timeLeft) / 1 days;

        SeasonTotals storage totals = season.totals[_asset];
        totals.totalStaked += amount;
        totals.totalWeight += weight;

        record.staked = amount;
        record.stakedAt = block.timestamp.toUint64();
        record.seasonId = _currentSeasonId.toUint64();
        record.weight = weight;

        emit Staked(staker, _currentSeasonId, _asset, amount);
    }

    /**
     * @dev State-only claim function for Factory to call
     * @param staker The staker address
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param seasonId The season ID to claim rewards from
     * @return reward The reward amount to be claimed
     */
    function claim(
        address staker,
        address _asset,
        uint256 seasonId
    ) external override onlyFactory returns (uint256 reward) {
        if (seasonId >= currentSeasonId) revert SeasonNotStarted();
        if (_seasons[seasonId].end >= block.timestamp) revert SeasonStillActive();
        if (wasSeasonClaimed[staker][seasonId][_asset]) revert AlreadyClaimed();

        StakeRecord storage record = records[staker][_asset];
        Season storage season = _seasons[seasonId];
        SeasonTotals storage seasonTotals = season.totals[_asset];

        if (record.seasonId > seasonId) revert NotStakedInSeason();
        if (record.weight == 0) revert NoRewardToClaim();

        wasSeasonClaimed[staker][seasonId][_asset] = true;

        uint256 weight;
        if (seasonId == record.seasonId) {
            weight = record.weight;
        } else {
            weight = (record.staked * season.duration) / 1 days;
        }

        reward = (seasonTotals.totalReward * weight) / seasonTotals.totalWeight;
        record.claimedCount++;

        emit Claimed(staker, seasonId, _asset, reward);
    }

    /**
     * @dev State-only unstake function for Factory to call
     * @param staker The staker address
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @return releaseAmount The amount to be released
     */
    function unstake(
        address staker,
        address _asset
    ) external override onlyFactory returns (uint256 releaseAmount) {
        StakeRecord storage record = records[staker][_asset];
        releaseAmount = record.staked;
        if (releaseAmount == 0) revert NoStakedBalance();

        uint256 _currentSeasonId = currentSeasonId;
        uint256 stakedSeasonId = record.seasonId;
        uint256 expectedClaimedCount = _currentSeasonId - stakedSeasonId;
        if (record.claimedCount != expectedClaimedCount) revert MustClaimAllSeasons();

        Season storage season = _seasons[_currentSeasonId];
        SeasonTotals storage totals = season.totals[_asset];

        uint256 weightToRemove;

        // Calculate weight to remove based on current season
        if (_currentSeasonId == stakedSeasonId) {
            // If unstaking from the same season they staked, remove actual weight
            weightToRemove = record.weight;
        } else {
            // Otherwise, remove full period weight (same as claim calculation)
            weightToRemove = (releaseAmount * season.duration) / 1 days;
        }

        totals.totalStaked -= releaseAmount;
        totals.totalWeight -= weightToRemove;

        record.claimedCount = 0;
        record.staked = 0;
        record.weight = 0;

        emit Unstaked(staker, _asset, releaseAmount);
    }

    function startNewSeason() external override onlyFactory {
        uint256 _currentSeasonId = currentSeasonId;
        Season storage currentSeason = _seasons[_currentSeasonId];
        if (currentSeason.end >= block.timestamp) revert SeasonStillActive();

        uint256 _nextSeasonDuration = nextSeasonDuration;
        uint256 nextSeasonId = _currentSeasonId + 1;
        Season storage nextSeason = _seasons[nextSeasonId];

        nextSeason.seasonId = nextSeasonId.toUint64();
        nextSeason.start = block.timestamp.toUint64();
        nextSeason.duration = _nextSeasonDuration.toUint64();
        nextSeason.end = (block.timestamp + _nextSeasonDuration).toUint64();

        address[] memory activeAssets = factory.assets();

        // Transfer staked amounts and recalculate weights for all active assets
        for (uint256 i = 0; i < activeAssets.length; i++) {
            address asset = activeAssets[i];
            SeasonTotals storage currentTotals = currentSeason.totals[asset];
            SeasonTotals storage nextTotals = nextSeason.totals[asset];

            nextTotals.totalStaked = currentTotals.totalStaked;
            nextTotals.totalWeight = (currentTotals.totalStaked * _nextSeasonDuration) / 1 days;
            nextTotals.totalReward = 0;
        }

        currentSeasonId = nextSeasonId;

        emit SeasonStarted(_currentSeasonId, nextSeason.start, nextSeason.end);
    }

    function updateNextSeasonDuration(uint256 _duration) external override onlyFactory {
        if (nextSeasonDuration == _duration) revert SameDuration();
        uint256 oldDuration = nextSeasonDuration;
        nextSeasonDuration = _duration;
        emit NextSeasonDurationUpdated(oldDuration, _duration);
    }

    function getCurrentWeight(
        address staker,
        address asset
    ) external view returns (uint256 weight) {
        StakeRecord storage record = records[staker][asset];
        uint256 _currentSeasonId = currentSeasonId;

        if (_currentSeasonId == record.seasonId) {
            return record.weight;
        } else {
            return (record.staked * _seasons[_currentSeasonId].duration) / 1 days;
        }
    }

    // ============ VIEW FUNCTIONS FOR INTERFACE ============

    function seasonAndTotals(
        uint256 seasonId_,
        address asset_
    )
        external
        view
        override
        returns (
            uint256 seasonId,
            uint256 start,
            uint256 end,
            uint256 duration,
            uint256 totalStaked,
            uint256 totalReward,
            uint256 totalWeight
        )
    {
        Season storage season = _seasons[seasonId_];
        SeasonTotals storage totals = season.totals[asset_];
        return (
            season.seasonId,
            season.start,
            season.end,
            season.duration,
            totals.totalStaked,
            totals.totalReward,
            totals.totalWeight
        );
    }

    function seasons(
        uint256 seasonId_
    )
        external
        view
        override
        returns (uint256 seasonId, uint256 start, uint256 end, uint256 duration)
    {
        Season storage season = _seasons[seasonId_];

        return (season.seasonId, season.start, season.end, season.duration);
    }
}
