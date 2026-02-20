// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IAintiVirusFactory} from "./interfaces/IAintiVirusFactory.sol";
import {AintiVirusMixer} from "./AintiVirusMixer.sol";
import {AintiVirusStaking} from "./AintiVirusStaking.sol";
import {IAintiVirusStaking} from "./interfaces/IAintiVirusStaking.sol";
import {IAintiVirusPayment} from "./interfaces/IAintiVirusPayment.sol";
import {IWETH} from "./interfaces/IWETH.sol";

contract AintiVirusFactory is IAintiVirusFactory, ReentrancyGuardTransient, AccessControl {
    using Address for address;
    using Address for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Basis points (1 bps = 0.01%). Fee rate and reward pool share both use this (e.g. 25 = 0.25%, 5000 = 50%)
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MAX_FEE_BPS = 500; // 5% max deposit fee

    IWETH public immutable weth;
    address public immutable verifier;
    address public immutable hasher;
    IAintiVirusStaking public immutable staking;
    IAintiVirusPayment public payment;

    uint256 public feeBps;
    address public feeCollector; // Receives (100% - rewardsShareBps) of deposit fees
    uint256 public rewardsShareBps; // Share of deposit fees to reward pool (e.g. 5000 = 50%)
    mapping(address asset => mapping(uint256 amount => AintiVirusMixer)) public mixers;
    EnumerableSet.AddressSet internal _assets;

    // White-label partner registry: only registered partners can receive extra fee
    mapping(address => bool) public isPartner;
    mapping(address => uint256) public partnersFee;
    mapping(address mixer => bool) public giftCardWithdrawEnabled;

    // ============ EVENTS ============

    event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate);
    event FeeCollectorUpdated(address indexed oldWallet, address indexed newWallet);
    event RewardPoolShareUpdated(uint256 oldBps, uint256 newBps);
    /// @dev Emitted when fee config is set or updated (setFeeRate/setFeeCollector/setRewardPoolShareBps). Use for tracking fee collector, fee rate, and reward pool share.
    event FeeConfigUpdated(address indexed feeCollector, uint256 feeBps, uint256 rewardsShareBps);
    /// @dev Emitted once when the factory is deployed. Tracks initial fee collector, fee rate, and reward pool share.
    event FactoryInitialized(address indexed feeCollector, uint256 feeBps, uint256 rewardsShareBps);
    event StakingDeployed(address indexed deployer, address indexed staking);
    event MixerDeployed(
        AintiVirusMixer indexed mixer,
        address indexed asset,
        uint256 indexed amount
    );
    event Deposit(
        address indexed asset,
        uint256 amount,
        uint256 protocolFee,
        uint256 extraFee,
        bytes32 indexed commitment,
        address indexed partnerAddress
    );
    event PartnerAdded(address indexed partner, uint256 extraFee);
    event PartnerRemoved(address indexed partner);
    event PartnerExtraFeeUpdated(address indexed partner, uint256 extraFee);
    event Withdrawal(address indexed asset, uint256 amount, address to, bytes32 nullifierHash);
    event GiftCardWithdrawal(
        address indexed asset,
        uint256 amount,
        address to,
        bytes32 indexed orderId,
        bytes32 nullifierHash
    );
    event GiftCardEnabledUpdated(address indexed asset, uint256 amount, bool enabled);
    event UnclaimedRewardsClaimed(address indexed asset, uint256 indexed seasonId, uint256 amount);

    error InvalidAsset();
    error MixerNotDeployed();
    error InvalidAmount();
    error MixerExists();
    error SeasonNotEnded();
    error UsersStaked();
    error NoRewards();
    error ETHAmountMismatch();
    error FeeRateExceedsMaximum();
    error ArraysLengthMismatch();
    error FeeExceedsAmount();
    error InvalidRelayer();
    error FeeMismatch();
    error RewardPoolShareExceedsMax();
    error FeeCollectorNotSet();
    error UnregisteredPartner();
    error VerifierNotSet();
    error HasherNotSet();
    error GiftCardWithdrawalsDisabled();
    error PaymentContractMissing();

    /**
     * @dev Deploy Staking contract and initialize as Payment Factory
     * Note: Mixer contracts will be deployed separately for each fixed amount
     * @param _verifier Address of the verifier contract
     * @param _hasher Address of the Poseidon hasher contract
     * @param _feeBps Fee rate (e.g., 250 for 0.25%)
     * @param _feeCollector Address that receives the fee collector share of deposit fees (rest goes to reward pool)
     * @param _rewardsShareBps Share of deposit fees to reward pool in basis points (e.g. 5000 = 50%)
     */
    constructor(
        IWETH _weth,
        address _verifier,
        address _hasher,
        uint256 _feeBps,
        address _feeCollector,
        uint256 _rewardsShareBps
    ) {
        if (_feeCollector == address(0)) revert FeeCollectorNotSet();
        if (_verifier == address(0)) revert VerifierNotSet();
        if (_hasher == address(0)) revert HasherNotSet();
        if (_rewardsShareBps > BPS_DENOMINATOR) revert RewardPoolShareExceedsMax();
        if (_feeBps > MAX_FEE_BPS) revert FeeRateExceedsMaximum();

        weth = _weth;
        verifier = _verifier;
        hasher = _hasher;
        feeBps = _feeBps;
        feeCollector = _feeCollector;
        rewardsShareBps = _rewardsShareBps;

        emit FactoryInitialized(feeCollector, feeBps, rewardsShareBps);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);

        // Deploy Staking contract
        staking = new AintiVirusStaking();

        emit StakingDeployed(msg.sender, address(staking));
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @dev Internal helper to transfer funds (If WETH, unwrap and send ETH)
     */
    function _safeTransfer(address _asset, address _to, uint256 _amount) internal {
        if (_asset == address(weth)) {
            weth.withdraw(_amount);
            payable(_to).sendValue(_amount);
        } else {
            IERC20(_asset).safeTransfer(_to, _amount);
        }
    }

    // ============ MIXER FUNCTIONS ============

    /**
     * @dev Deploy a new Mixer contract for a specific fixed amount
     * @param _asset The asset address
     * @param _amount The fixed amount for this Mixer instance
     * @return mixer The address of the deployed Mixer contract
     */
    function deployMixer(
        address _asset,
        uint256 _amount
    ) external onlyRole(OPERATOR_ROLE) returns (AintiVirusMixer mixer) {
        if (_asset == address(0)) revert InvalidAsset();
        if (address(mixers[_asset][_amount]) != address(0)) revert MixerExists();

        mixer = new AintiVirusMixer(verifier, hasher, address(this));

        mixers[_asset][_amount] = mixer;
        _assets.add(_asset);

        emit MixerDeployed(mixer, _asset, _amount);
    }

    /**
     * @dev Deposit with optional white-label partner (extra fee from mapping, no fee param)
     * @param _asset The asset address
     * @param _amount The deposit amount (must match the Mixer's fixed amount)
     * @param _commitment The commitment hash
     * @param _partner Registered white-label partner address; use address(0) for no partner
     */
    function deposit(
        address _asset,
        uint256 _amount,
        bytes32 _commitment,
        address _partner
    ) public nonReentrant {
        AintiVirusMixer mixer = mixers[_asset][_amount];
        if (address(mixer) == address(0)) revert MixerNotDeployed();

        uint256 fee = (_amount * feeBps) / BPS_DENOMINATOR;
        uint256 partnerFee = (_amount * partnersFee[_partner]) / BPS_DENOMINATOR;

        IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount + fee + partnerFee);

        mixer.deposit(_commitment);

        if (fee > 0) {
            uint256 toRewards = (fee * rewardsShareBps) / BPS_DENOMINATOR;
            uint256 toFeeCollector = fee - toRewards;
            if (toRewards > 0) staking.addRewards(_asset, toRewards);
            if (toFeeCollector > 0) _safeTransfer(_asset, feeCollector, toFeeCollector);
        }

        if (partnerFee > 0) {
            _safeTransfer(_asset, _partner, partnerFee);
        }

        emit Deposit(_asset, _amount, fee, partnerFee, _commitment, _partner);
    }

    /**
     * @dev Withdraw funds from mixer (Factory sends funds, Mixer validates state).
     * Supports relayer: when proof includes relayer and fee, only that relayer can call
     * and receives the fee; recipient receives (amount - fee). Otherwise full amount goes to recipient.
     * @param _proof The withdrawal proof (pubSignals: nullifierHash, recipient, root, fee, relayer)
     * @param _amount The withdrawal amount (fixed for this Mixer instance)
     * @param _asset The asset address
     */
    function withdraw(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        uint256 _fee,
        uint256 _amount,
        address _asset
    ) public override nonReentrant {
        AintiVirusMixer mixer = mixers[_asset][_amount];
        if (address(mixer) == address(0)) revert MixerNotDeployed();

        if (_fee != uint256(_proof.pubSignals[3])) revert FeeMismatch();

        (address recipient, address relayer, uint256 relayerFee) = mixer.withdraw(_proof);
        bytes32 nullifierHash = bytes32(_proof.pubSignals[0]);

        if (relayerFee > _amount) revert FeeExceedsAmount();
        if (relayer != address(0) && msg.sender != relayer) revert InvalidRelayer();
        if (relayer == address(0) && relayerFee > 0) revert FeeMismatch();

        _safeTransfer(_asset, recipient, _amount - relayerFee);

        if (relayerFee > 0) {
            _safeTransfer(_asset, relayer, relayerFee);
        }

        emit Withdrawal(_asset, _amount, recipient, nullifierHash);
    }

    /**
     * @dev Withdraw funds from mixer by gift card (Factory pays for order from its balance)
     * @param _proof The withdrawal proof to validate
     * @param _orderId The gift card order ID (generated off-chain using generateOrderId)
     * @param _amount The withdrawal amount (fixed for this Mixer instance)
     * @param _asset The asset address
     */
    function withdrawByGiftCard(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        bytes32 _orderId,
        uint256 _amount,
        address _asset
    ) public nonReentrant {
        IAintiVirusPayment _payment = payment;
        if (address(_payment) == address(0)) revert PaymentContractMissing();
        AintiVirusMixer mixer = mixers[_asset][_amount];
        if (address(mixer) == address(0)) revert MixerNotDeployed();
        if (!giftCardWithdrawEnabled[address(mixer)]) revert GiftCardWithdrawalsDisabled();

        (address recipient, , ) = mixer.withdraw(_proof);
        bytes32 nullifierHash = bytes32(_proof.pubSignals[0]);

        IERC20 asset = IERC20(_asset);

        asset.forceApprove(address(_payment), _amount);
        _payment.payWithRecipient(_orderId, _asset, recipient, _amount);
        asset.forceApprove(address(_payment), 0);

        emit GiftCardWithdrawal(_asset, _amount, recipient, _orderId, nullifierHash);
    }

    // ============ STAKING FUNCTIONS ============

    /**
     * @dev Stake funds (Factory holds funds, Staking manages state)
     * @param _asset The asset address
     * @param amount The amount to stake
     */
    function stake(address _asset, uint256 amount) public override nonReentrant {
        _stake(_asset, amount, msg.sender);
    }

    /**
     * @dev Stake funds on behalf of a beneficiary (e.g. via WETHGateway).
     * Tokens are transferred from msg.sender, stake is recorded for _staker.
     * @param _asset The asset address
     * @param amount The amount to stake
     * @param _staker The address that will own the stake
     */
    function stake(address _asset, uint256 amount, address _staker) public override nonReentrant {
        _stake(_asset, amount, _staker);
    }

    function _stake(address _asset, uint256 amount, address _staker) internal {
        if (amount == 0) revert InvalidAmount();
        if (!_assets.contains(_asset)) revert MixerNotDeployed();

        IERC20(_asset).safeTransferFrom(msg.sender, address(this), amount);

        staking.stake(_staker, _asset, amount);
    }

    /**
     * @dev Claim rewards (Factory sends funds, Staking validates state)
     * @param _asset The asset address
     * @param seasonId The season ID to claim rewards from
     * @return reward The reward amount claimed
     */
    function claim(address _asset, uint256 seasonId) public nonReentrant returns (uint256 reward) {
        if (!_assets.contains(_asset)) revert MixerNotDeployed();
        reward = staking.claim(msg.sender, _asset, seasonId);
        _safeTransfer(_asset, msg.sender, reward);
    }

    /**
     * @dev Unstake funds (Factory sends funds, Staking updates state)
     * @param _asset The asset address
     * @return releaseAmount The amount released
     */
    function unstake(address _asset) public nonReentrant returns (uint256 releaseAmount) {
        if (!_assets.contains(_asset)) revert MixerNotDeployed();
        releaseAmount = staking.unstake(msg.sender, _asset);
        _safeTransfer(_asset, msg.sender, releaseAmount);
    }

    // ============ ADMIN FUNCTIONS ============

    function updateNextSeasonDuration(uint256 _duration) external onlyRole(OPERATOR_ROLE) {
        staking.updateNextSeasonDuration(_duration);
    }

    /**
     * @dev Set payment contract address in Factory
     * New mixers will automatically get this payment contract set
     * @param _payment The payment contract address
     */
    function setPayment(IAintiVirusPayment _payment) external onlyRole(OPERATOR_ROLE) {
        if (address(_payment) == address(0)) revert InvalidAsset();
        payment = _payment;
    }

    /**
     * @dev Enable or disable gift card withdrawals for a specific mixer (managed by Factory)
     * @param _asset The asset address
     * @param _amount The mixer amount
     * @param _enabled True to enable, false to disable
     */
    function setMixerGiftCardEnabled(
        address _asset,
        uint256 _amount,
        bool _enabled
    ) external onlyRole(OPERATOR_ROLE) {
        AintiVirusMixer mixer = AintiVirusMixer(mixers[_asset][_amount]);
        if (address(mixer) == address(0)) revert MixerNotDeployed();

        giftCardWithdrawEnabled[address(mixer)] = _enabled;

        emit GiftCardEnabledUpdated(_asset, _amount, _enabled);
    }

    /**
     * @dev Batch enable or disable gift card withdrawals for multiple mixers (managed by Factory)
     * @param _assets Array of asset addresses
     * @param _amounts Array of mixer amounts (must match _assets length)
     * @param _enabled True to enable, false to disable
     */
    function batchSetMixerGiftCardEnabled(
        address[] calldata _assets,
        uint256[] calldata _amounts,
        bool _enabled
    ) external onlyRole(OPERATOR_ROLE) {
        if (_assets.length != _amounts.length) revert ArraysLengthMismatch();

        for (uint256 i = 0; i < _assets.length; i++) {
            AintiVirusMixer mixer = AintiVirusMixer(mixers[_assets[i]][_amounts[i]]);
            if (address(mixer) == address(0)) revert MixerNotDeployed();

            giftCardWithdrawEnabled[address(mixer)] = _enabled;

            emit GiftCardEnabledUpdated(_assets[i], _amounts[i], _enabled);
        }
    }

    function startNewSeason() external onlyRole(OPERATOR_ROLE) {
        staking.startNewSeason();
    }

    /**
     * @dev Admin function to claim unclaimed rewards for an asset/season when no users have staked
     * This prevents rewards from being locked forever if no one stakes for an asset
     * @param _asset The asset address
     * @param seasonId The season ID to claim unclaimed rewards from
     */
    function claimUnclaimedRewards(
        address _asset,
        uint256 seasonId
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (!_assets.contains(_asset)) revert MixerNotDeployed();

        uint256 currentSeasonId = staking.currentSeasonId();
        if (seasonId >= currentSeasonId) revert SeasonNotEnded();

        // Get season info
        (, , uint256 end, , uint256 totalStaked, uint256 totalReward, ) = staking.seasonAndTotals(
            seasonId,
            _asset
        );

        if (end >= block.timestamp) revert SeasonNotEnded();
        if (totalStaked > 0) revert UsersStaked();
        if (totalReward == 0) revert NoRewards();

        // Transfer unclaimed rewards to admin
        _safeTransfer(_asset, msg.sender, totalReward);

        emit UnclaimedRewardsClaimed(_asset, seasonId, totalReward);
    }

    // ============ SETTING FUNCTIONS ============

    /**
     * @dev Set the fee rate
     * @param _feeBps The new fee rate in basis points (e.g., 25 for 0.25%, max 500 = 5%)
     */
    function setFeeRate(uint256 _feeBps) external onlyRole(OPERATOR_ROLE) {
        if (_feeBps > MAX_FEE_BPS) revert FeeRateExceedsMaximum();
        emit FeeRateUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
        emit FeeConfigUpdated(feeCollector, feeBps, rewardsShareBps);
    }

    /**
     * @dev Set the fee collector that receives the fee collector share of deposit fees
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeCollector == address(0)) revert FeeCollectorNotSet();
        emit FeeCollectorUpdated(feeCollector, _feeCollector);
        feeCollector = _feeCollector;
        emit FeeConfigUpdated(feeCollector, feeBps, rewardsShareBps);
    }

    /**
     * @dev Set the share of deposit fees that go to the reward pool (rest to fee collector)
     * @param _rewardsShareBps Share in basis points (e.g. 5000 = 50%), max 10000
     */
    function setRewardPoolShareBps(uint256 _rewardsShareBps) external onlyRole(OPERATOR_ROLE) {
        if (_rewardsShareBps > BPS_DENOMINATOR) revert RewardPoolShareExceedsMax();
        emit RewardPoolShareUpdated(rewardsShareBps, _rewardsShareBps);
        rewardsShareBps = _rewardsShareBps;
        emit FeeConfigUpdated(feeCollector, feeBps, rewardsShareBps);
    }

    // ============ PARTNER FUNCTIONS ============

    /**
     * @dev Register a partner and set their extra fee
     * @param _partner Payout address that will receive the extra fee on deposits
     * @param _extraFee Extra fee amount (in wei or token units) sent to partner per deposit
     */
    function addPartner(address _partner, uint256 _extraFee) external onlyRole(OPERATOR_ROLE) {
        isPartner[_partner] = true;
        partnersFee[_partner] = _extraFee;
        emit PartnerAdded(_partner, _extraFee);
    }

    /**
     * @dev Update a registered partner's extra fee (admin only)
     * @param _partner Registered partner address
     * @param _extraFee New extra fee amount
     */
    function setPartnerExtraFee(
        address _partner,
        uint256 _extraFee
    ) external onlyRole(OPERATOR_ROLE) {
        if (!isPartner[_partner]) revert UnregisteredPartner();
        partnersFee[_partner] = _extraFee;
        emit PartnerExtraFeeUpdated(_partner, _extraFee);
    }

    /**
     * @dev Allow a registered partner to set their own extra fee
     * @param _extraFee New extra fee amount
     */
    function setMyExtraFee(uint256 _extraFee) external {
        if (!isPartner[msg.sender]) revert UnregisteredPartner();
        partnersFee[msg.sender] = _extraFee;
        emit PartnerExtraFeeUpdated(msg.sender, _extraFee);
    }

    /**
     * @dev Remove a partner (they can no longer receive extra fees)
     * @param _partner Partner address to remove
     */
    function removePartner(address _partner) external onlyRole(OPERATOR_ROLE) {
        delete isPartner[_partner];
        delete partnersFee[_partner];
        emit PartnerRemoved(_partner);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Calculate the total deposit amount including protocol fee and partner extra fee (for partners)
     * @param _amount The base deposit amount
     * @param _partnerAddress Partner address; use address(0) or unregistered for protocol fee only
     * @return The total amount (amount + protocol fee + partner extra fee, or 0 if partner not registered)
     */
    function calculateDepositAmount(
        uint256 _amount,
        address _partnerAddress
    ) public view returns (uint256) {
        uint256 fee = (_amount * feeBps) / BPS_DENOMINATOR;
        uint256 extraFee = (_amount * partnersFee[_partnerAddress]) / BPS_DENOMINATOR;
        return _amount + fee + extraFee;
    }

    function currentStakeSeasonId() public view returns (uint256) {
        return staking.currentSeasonId();
    }

    function assets() public view returns (address[] memory) {
        return _assets.values();
    }

    receive() external payable {}
}
