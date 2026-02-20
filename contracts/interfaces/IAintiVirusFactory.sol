// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAintiVirusStaking} from "./IAintiVirusStaking.sol";
import {IAintiVirusPayment} from "./IAintiVirusPayment.sol";
import {AintiVirusMixer} from "../AintiVirusMixer.sol";

interface IAintiVirusFactory {
    // ============ STATE VARIABLES ============

    function OPERATOR_ROLE() external view returns (bytes32);

    function payment() external view returns (IAintiVirusPayment);

    function verifier() external view returns (address);

    function hasher() external view returns (address);

    function feeBps() external view returns (uint256);

    function feeCollector() external view returns (address);

    function rewardsShareBps() external view returns (uint256);

    function staking() external view returns (IAintiVirusStaking);

    function mixers(address asset, uint256 amount) external view returns (AintiVirusMixer);

    function isPartner(address partner) external view returns (bool);

    function partnersFee(address partner) external view returns (uint256);

    function giftCardWithdrawEnabled(address mixer) external view returns (bool);

    // ============ MIXER FUNCTIONS ============

    function deployMixer(address _asset, uint256 _amount) external returns (AintiVirusMixer mixer);

    function deposit(
        address _asset,
        uint256 _amount,
        bytes32 _commitment,
        address _partnerAddress
    ) external;

    function withdraw(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        uint256 _fee,
        uint256 _amount,
        address _asset
    ) external;

    // ============ STAKING FUNCTIONS ============

    function stake(address _asset, uint256 amount) external;

    function stake(address _asset, uint256 amount, address _staker) external;

    function claim(address _asset, uint256 seasonId) external returns (uint256 reward);

    function unstake(address _asset) external returns (uint256 releaseAmount);

    // ============ ADMIN FUNCTIONS ============

    function updateNextSeasonDuration(uint256 _duration) external;

    function startNewSeason() external;

    function claimUnclaimedRewards(address _asset, uint256 seasonId) external;

    function setFeeRate(uint256 _feeBps) external;

    function setFeeCollector(address _feeCollector) external;

    function setRewardPoolShareBps(uint256 _rewardsShareBps) external;

    function addPartner(address _partner, uint256 _extraFee) external;

    function setPartnerExtraFee(address _partner, uint256 _extraFee) external;

    function setMyExtraFee(uint256 _extraFee) external;

    function removePartner(address _partner) external;

    // ============ VIEW FUNCTIONS ============

    function calculateDepositAmount(
        uint256 _amount,
        address _partnerAddress
    ) external view returns (uint256);

    function currentStakeSeasonId() external view returns (uint256);

    function assets() external view returns (address[] memory);
}
