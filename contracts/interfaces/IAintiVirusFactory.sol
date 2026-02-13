// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAintiVirusStaking} from "./IAintiVirusStaking.sol";
import {AintiVirusMixer} from "../AintiVirusMixer.sol";

interface IAintiVirusFactory {
    // ============ STATE VARIABLES ============

    function OPERATOR_ROLE() external view returns (bytes32);

    function ETH_ADDRESS() external view returns (address);

    function verifier() external view returns (address);

    function hasher() external view returns (address);

    function feeRate() external view returns (uint256);

    function adminWallet() external view returns (address);

    function rewardPoolShareBps() external view returns (uint256);

    function staking() external view returns (IAintiVirusStaking);

    function mixers(address asset, uint256 amount) external view returns (address);

    function isWhiteLabelPartner(address partner) external view returns (bool);

    function partnerExtraFee(address partner) external view returns (uint256);

    // ============ MIXER FUNCTIONS ============

    function deployMixer(address _asset, uint256 _amount) external returns (address mixerAddress);

    function deposit(address _asset, uint256 _amount, bytes32 _commitment) external payable;

    function deposit(
        address _asset,
        uint256 _amount,
        bytes32 _commitment,
        address _partnerAddress
    ) external payable;

    function withdraw(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        uint256 _fee,
        uint256 _amount,
        address _asset
    ) external;

    // ============ STAKING FUNCTIONS ============

    function stake(address _asset, uint256 amount) external payable;

    function claim(address _asset, uint256 seasonId) external returns (uint256 reward);

    function unstake(address _asset) external returns (uint256 releaseAmount);

    // ============ ADMIN FUNCTIONS ============

    function updateNextSeasonDuration(uint256 _duration) external;

    function startNewSeason() external;

    function claimUnclaimedRewards(address _asset, uint256 seasonId) external;

    function setFeeRate(uint256 _feeRate) external;

    function setAdminWallet(address _adminWallet) external;

    function setRewardPoolShareBps(uint256 _rewardPoolShareBps) external;

    function addWhiteLabelPartner(address _partner, uint256 _extraFee) external;

    function setPartnerExtraFee(address _partner, uint256 _extraFee) external;

    function setMyExtraFee(uint256 _extraFee) external;

    function removeWhiteLabelPartner(address _partner) external;

    // ============ VIEW FUNCTIONS ============

    function calculateDepositAmount(uint256 _amount) external view returns (uint256);

    function calculateTotalDepositAmount(uint256 _amount, address _partnerAddress) external view returns (uint256);

    function isETH(address _asset) external pure returns (bool);

    function currentStakeSeasonId() external view returns (uint256);

    function assets() external view returns (address[] memory);
}
