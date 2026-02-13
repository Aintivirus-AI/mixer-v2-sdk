// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAintiVirusFactory} from "./interfaces/IAintiVirusFactory.sol";
import {AintiVirusMixer} from "./AintiVirusMixer.sol";
import {AintiVirusStaking} from "./AintiVirusStaking.sol";
import {IAintiVirusStaking} from "./interfaces/IAintiVirusStaking.sol";
import {IAintiVirusPayment} from "./interfaces/IAintiVirusPayment.sol";


contract AintiVirusFactory is IAintiVirusFactory, ReentrancyGuard, AccessControl {
    using Address for address;
    using Address for address payable;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 internal constant FEE_PRECISION = 100_000;
    uint256 internal constant BPS_MAX = 10_000; // 100% in basis points

    address public immutable verifier;
    address public immutable hasher;
    IAintiVirusStaking public immutable staking;
    address public paymentContract; // Payment contract address

    uint256 public feeRate;
    address public adminWallet; // Receives (100% - rewardPoolShareBps) of deposit fees
    uint256 public rewardPoolShareBps; // Share of deposit fees to reward pool (e.g. 5000 = 50%)
    mapping(address asset => mapping(uint256 amount => address)) public mixers;
    EnumerableSet.AddressSet internal _assets;

    // White-label partner registry: only registered partners can receive extra fee
    mapping(address => bool) public isWhiteLabelPartner;
    mapping(address => uint256) public partnerExtraFee;

    // ============ EVENTS ============

    event FeeRateUpdated(uint256 oldFeeRate, uint256 newFeeRate);
    event AdminWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event RewardPoolShareUpdated(uint256 oldBps, uint256 newBps);
    event StakingDeployed(address indexed deployer, address indexed staking);
    event MixerDeployed(address indexed mixer, address indexed asset, uint256 indexed amount);
    event Deposit(address indexed asset, uint256 amount, uint256 fee, bytes32 indexed commitment);
    event WhiteLabelDeposit(
        address indexed asset,
        uint256 amount,
        uint256 protocolFee,
        uint256 extraFee,
        bytes32 indexed commitment,
        address indexed partnerAddress
    );
    event WhiteLabelPartnerAdded(address indexed partner, uint256 extraFee);
    event WhiteLabelPartnerRemoved(address indexed partner);
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
    error AdminWalletNotSet();
    error UnregisteredPartner();
    /**
     * @dev Deploy Staking contract and initialize as Payment Factory
     * Note: Mixer contracts will be deployed separately for each fixed amount
     * @param _verifier Address of the verifier contract
     * @param _hasher Address of the Poseidon hasher contract
     * @param _feeRate Fee rate (e.g., 250 for 0.25%)
     * @param _adminWallet Address that receives the admin share of deposit fees (rest goes to reward pool)
     * @param _rewardPoolShareBps Share of deposit fees to reward pool in basis points (e.g. 5000 = 50%)
     */
    constructor(
        address _verifier,
        address _hasher,
        uint256 _feeRate,
        address _adminWallet,
        uint256 _rewardPoolShareBps
    ) {
        verifier = _verifier;
        hasher = _hasher;
        feeRate = _feeRate;
        adminWallet = _adminWallet;
        if (_rewardPoolShareBps > BPS_MAX) revert RewardPoolShareExceedsMax();
        rewardPoolShareBps = _rewardPoolShareBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);

        // Deploy Staking contract
        AintiVirusStaking stakingContract = new AintiVirusStaking();
        staking = IAintiVirusStaking(address(stakingContract));

        emit StakingDeployed(msg.sender, address(stakingContract));
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @dev Internal helper to transfer funds (ETH or ERC20)
     */
    function _sendAssets(address _asset, address _to, uint256 _amount) internal {
        if (isETH(_asset)) {
            payable(_to).sendValue(_amount);
        } else {
            IERC20(_asset).safeTransfer(_to, _amount);
        }
    }

    // ============ MIXER FUNCTIONS ============

    /**
     * @dev Deploy a new Mixer contract for a specific fixed amount
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param _amount The fixed amount for this Mixer instance
     * @return mixerAddress The address of the deployed Mixer contract
     */
    function deployMixer(
        address _asset,
        uint256 _amount
    ) external onlyRole(OPERATOR_ROLE) returns (address mixerAddress) {
        if (_asset == address(0)) revert InvalidAsset();
        if (mixers[_asset][_amount] != address(0)) revert MixerExists();

        AintiVirusMixer mixerContract = new AintiVirusMixer(verifier, hasher, address(this));

        mixerAddress = address(mixerContract);
        mixers[_asset][_amount] = mixerAddress;
        _assets.add(_asset); // do not revert on duplicate adds

        emit MixerDeployed(mixerAddress, _asset, _amount);
    }

    /**
     * @dev Deposit funds into the mixer (Factory holds funds, Mixer manages state)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param _amount The deposit amount (must match the Mixer's fixed amount)
     * @param _commitment The commitment hash
     */
    function deposit(
        address _asset,
        uint256 _amount,
        bytes32 _commitment
    ) public payable nonReentrant {
        address mixerAddress = mixers[_asset][_amount];
        if (mixerAddress == address(0)) revert MixerNotDeployed();

        uint256 fee = (_amount * feeRate) / FEE_PRECISION;

        if (isETH(_asset)) {
            if (msg.value != _amount + fee) revert ETHAmountMismatch();
        } else {
            IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount + fee);
        }

        // Delegate state management to Mixer (commitments, merkle tree)
        AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
        mixerContract.depositState(_commitment);

        // Split fee: reward pool share to staking, admin share to admin wallet
        if (fee > 0) {
            uint256 toRewardPool = (fee * rewardPoolShareBps) / BPS_MAX;
            uint256 toAdmin = fee - toRewardPool;
            if (toRewardPool > 0) {
                staking.addRewards(_asset, toRewardPool);
            }
            if (toAdmin > 0) {
                if (adminWallet == address(0)) revert AdminWalletNotSet();
                _sendAssets(_asset, adminWallet, toAdmin);
            }
        }

        emit Deposit(_asset, _amount, fee, _commitment);
    }

    /**
     * @dev Deposit with optional white-label partner (extra fee from mapping, no fee param)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param _amount The deposit amount (must match the Mixer's fixed amount)
     * @param _commitment The commitment hash
     * @param _partnerAddress Registered white-label partner address; use address(0) for no partner
     */
    function deposit(
        address _asset,
        uint256 _amount,
        bytes32 _commitment,
        address _partnerAddress
    ) public payable nonReentrant {
        address mixerAddress = mixers[_asset][_amount];
        if (mixerAddress == address(0)) revert MixerNotDeployed();

        uint256 fee = (_amount * feeRate) / FEE_PRECISION;
        if (_partnerAddress != address(0) && !isWhiteLabelPartner[_partnerAddress]) revert UnregisteredPartner();
        uint256 extraFee = _partnerAddress == address(0) ? 0 : partnerExtraFee[_partnerAddress];

        if (_partnerAddress != address(0) && extraFee > 0) {
            if (isETH(_asset)) {
                if (msg.value != _amount + fee + extraFee) revert ETHAmountMismatch();
            } else {
                IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount + fee + extraFee);
            }
        } else {
            if (isETH(_asset)) {
                if (msg.value != _amount + fee) revert ETHAmountMismatch();
            } else {
                IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount + fee);
            }
        }

        // Delegate state management to Mixer (commitments, merkle tree)
        AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
        mixerContract.depositState(_commitment);

        // Split protocol fee: reward pool share to staking, admin share to admin wallet
        if (fee > 0) {
            uint256 toRewardPool = (fee * rewardPoolShareBps) / BPS_MAX;
            uint256 toAdmin = fee - toRewardPool;
            if (toRewardPool > 0) {
                staking.addRewards(_asset, toRewardPool);
            }
            if (toAdmin > 0) {
                if (adminWallet == address(0)) revert AdminWalletNotSet();
                _sendAssets(_asset, adminWallet, toAdmin);
            }
        }

        // Send extra fee to white-label partner
        if (extraFee > 0) {
            _sendAssets(_asset, _partnerAddress, extraFee);
        }

        emit Deposit(_asset, _amount, fee, _commitment);
        if (extraFee > 0) {
            emit WhiteLabelDeposit(_asset, _amount, fee, extraFee, _commitment, _partnerAddress);
        }
    }

    /**
     * @dev Withdraw funds from mixer (Factory sends funds, Mixer validates state).
     * Supports relayer: when proof includes relayer and fee, only that relayer can call
     * and receives the fee; recipient receives (amount - fee). Otherwise full amount goes to recipient.
     * @param _proof The withdrawal proof (pubSignals: nullifierHash, recipient, root, fee, relayer)
     * @param _fee Fee amount; must equal _proof.pubSignals[3] (signal data)
     * @param _amount The withdrawal amount (fixed for this Mixer instance)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     */
    function withdraw(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        uint256 _fee,
        uint256 _amount,
        address _asset
    ) public override nonReentrant {
        address mixerAddress = mixers[_asset][_amount];
        if (mixerAddress == address(0)) revert MixerNotDeployed();

        // Fee must match proof public signal (pubSignals[3])
        if (_fee != uint256(_proof.pubSignals[3])) revert FeeMismatch();

        AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
        (address recipient, address relayer, uint256 fee) = mixerContract.validateWithdraw(_proof);

        if (fee != _fee) revert FeeMismatch();
        if (_fee > _amount) revert FeeExceedsAmount();

        if (relayer != address(0) && _fee > 0) {
            // Relayer flow: only the designated relayer can execute and receive the fee
            if (msg.sender != relayer) revert InvalidRelayer();
            _sendAssets(_asset, recipient, _amount - _fee);
            _sendAssets(_asset, payable(relayer), _fee);
        } else {
            // Direct withdrawal: full amount to recipient (fee must be 0)
            if (_fee != 0) revert FeeExceedsAmount();
            _sendAssets(_asset, payable(recipient), _amount);
        }

        emit Withdrawal(_asset, _amount, recipient, bytes32(_proof.pubSignals[0]));
    }

    /**
     * @dev Withdraw funds from mixer by gift card (Factory pays for order from its balance)
     * @param _proof The withdrawal proof to validate
     * @param _orderId The gift card order ID (generated off-chain using generateOrderId)
     * @param _amount The withdrawal amount (fixed for this Mixer instance)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     */
    function withdrawByGiftCard(
        AintiVirusMixer.WithdrawalProof calldata _proof,
        bytes32 _orderId,
        uint256 _amount,
        address _asset
    ) public nonReentrant {
        if (paymentContract == address(0)) revert InvalidAsset();

        // Validate and get mixer address
        address mixerAddress = mixers[_asset][_amount];
        if (mixerAddress == address(0)) revert MixerNotDeployed();

        // Validate proof and mark nullifier in Mixer
        AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
        address payable recipient = payable(mixerContract.withdrawByGiftCard(_proof, _orderId));

        // Factory pays for the order from its own balance
        if (isETH(_asset)) {
            IAintiVirusPayment(paymentContract).payWithRecipient{value: _amount}(
                _orderId,
                _asset,
                recipient,
                _amount
            );
        } else {
            // For tokens, Factory needs to approve payment contract first
            // Then transfer will happen from Factory's balance via payWithRecipient
            IERC20(_asset).forceApprove(paymentContract, _amount);
            IAintiVirusPayment(paymentContract).payWithRecipient(
                _orderId,
                _asset,
                recipient,
                _amount
            );
            // Reset approval to zero for security
            IERC20(_asset).forceApprove(paymentContract, 0);
        }

        emit GiftCardWithdrawal(
            _asset,
            _amount,
            recipient,
            _orderId,
            bytes32(_proof.pubSignals[0])
        );
    }

    // ============ STAKING FUNCTIONS ============

    /**
     * @dev Stake funds (Factory holds funds, Staking manages state)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param amount The amount to stake
     */
    function stake(address _asset, uint256 amount) public payable override nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (!_assets.contains(_asset)) revert MixerNotDeployed();

        if (isETH(_asset)) {
            if (msg.value != amount) revert ETHAmountMismatch();
        } else {
            IERC20(_asset).safeTransferFrom(msg.sender, address(this), amount);
        }

        staking.stake(msg.sender, _asset, amount);
    }

    /**
     * @dev Claim rewards (Factory sends funds, Staking validates state)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @param seasonId The season ID to claim rewards from
     * @return reward The reward amount claimed
     */
    function claim(address _asset, uint256 seasonId) public nonReentrant returns (uint256 reward) {
        if (!_assets.contains(_asset)) revert MixerNotDeployed();
        reward = staking.claim(msg.sender, _asset, seasonId);
        _sendAssets(_asset, msg.sender, reward);
    }

    /**
     * @dev Unstake funds (Factory sends funds, Staking updates state)
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
     * @return releaseAmount The amount released
     */
    function unstake(address _asset) public nonReentrant returns (uint256 releaseAmount) {
        if (!_assets.contains(_asset)) revert MixerNotDeployed();
        releaseAmount = staking.unstake(msg.sender, _asset);
        _sendAssets(_asset, msg.sender, releaseAmount);
    }

    // ============ ADMIN FUNCTIONS ============

    function updateNextSeasonDuration(uint256 _duration) external onlyRole(OPERATOR_ROLE) {
        staking.updateNextSeasonDuration(_duration);
    }

    /**
     * @dev Set payment contract address in Factory
     * New mixers will automatically get this payment contract set
     * @param _paymentContract The payment contract address
     */
    function setPaymentContract(address _paymentContract) external onlyRole(OPERATOR_ROLE) {
        if (_paymentContract == address(0)) revert InvalidAsset();
        paymentContract = _paymentContract;
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
        address mixerAddress = mixers[_asset][_amount];
        if (mixerAddress == address(0)) revert MixerNotDeployed();

        AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
        mixerContract.setGiftCardEnabled(_enabled);
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
            address mixerAddress = mixers[_assets[i]][_amounts[i]];
            if (mixerAddress == address(0)) revert MixerNotDeployed();
            
            AintiVirusMixer mixerContract = AintiVirusMixer(mixerAddress);
            mixerContract.setGiftCardEnabled(_enabled);
            emit GiftCardEnabledUpdated(_assets[i], _amounts[i], _enabled);
        }
    }

    function startNewSeason() external onlyRole(OPERATOR_ROLE) {
        staking.startNewSeason();
    }

    /**
     * @dev Admin function to claim unclaimed rewards for an asset/season when no users have staked
     * This prevents rewards from being locked forever if no one stakes for an asset
     * @param _asset The asset address (ETH_ADDRESS for ETH, token address for tokens)
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
        _sendAssets(_asset, msg.sender, totalReward);

        emit UnclaimedRewardsClaimed(_asset, seasonId, totalReward);
    }

    // ============ SETTING FUNCTIONS ============

    /**
     * @dev Set the fee rate
     * @param _feeRate The new fee rate in basis points (e.g., 250 for 0.25%)
     */
    function setFeeRate(uint256 _feeRate) external onlyRole(OPERATOR_ROLE) {
        if (_feeRate > 5000) revert FeeRateExceedsMaximum();
        uint256 oldFeeRate = feeRate;
        feeRate = _feeRate;
        emit FeeRateUpdated(oldFeeRate, _feeRate);
    }

    /**
     * @dev Set the admin wallet that receives the admin share of deposit fees
     * @param _adminWallet New admin wallet address
     */
    function setAdminWallet(address _adminWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldWallet = adminWallet;
        adminWallet = _adminWallet;
        emit AdminWalletUpdated(oldWallet, _adminWallet);
    }

    /**
     * @dev Set the share of deposit fees that go to the reward pool (rest to admin wallet)
     * @param _rewardPoolShareBps Share in basis points (e.g. 5000 = 50%), max 10000
     */
    function setRewardPoolShareBps(uint256 _rewardPoolShareBps) external onlyRole(OPERATOR_ROLE) {
        if (_rewardPoolShareBps > BPS_MAX) revert RewardPoolShareExceedsMax();
        uint256 oldBps = rewardPoolShareBps;
        rewardPoolShareBps = _rewardPoolShareBps;
        emit RewardPoolShareUpdated(oldBps, _rewardPoolShareBps);
    }

    // ============ WHITE-LABEL PARTNER FUNCTIONS ============

    /**
     * @dev Register a white-label partner and set their extra fee
     * @param _partner Payout address that will receive the extra fee on deposits
     * @param _extraFee Extra fee amount (in wei or token units) sent to partner per deposit
     */
    function addWhiteLabelPartner(address _partner, uint256 _extraFee) external onlyRole(OPERATOR_ROLE) {
        isWhiteLabelPartner[_partner] = true;
        partnerExtraFee[_partner] = _extraFee;
        emit WhiteLabelPartnerAdded(_partner, _extraFee);
    }

    /**
     * @dev Update a registered partner's extra fee (admin only)
     * @param _partner Registered partner address
     * @param _extraFee New extra fee amount
     */
    function setPartnerExtraFee(address _partner, uint256 _extraFee) external onlyRole(OPERATOR_ROLE) {
        if (!isWhiteLabelPartner[_partner]) revert UnregisteredPartner();
        partnerExtraFee[_partner] = _extraFee;
        emit PartnerExtraFeeUpdated(_partner, _extraFee);
    }

    /**
     * @dev Allow a registered partner to set their own extra fee
     * @param _extraFee New extra fee amount
     */
    function setMyExtraFee(uint256 _extraFee) external {
        if (!isWhiteLabelPartner[msg.sender]) revert UnregisteredPartner();
        partnerExtraFee[msg.sender] = _extraFee;
        emit PartnerExtraFeeUpdated(msg.sender, _extraFee);
    }

    /**
     * @dev Remove a white-label partner (they can no longer receive extra fees)
     * @param _partner Partner address to remove
     */
    function removeWhiteLabelPartner(address _partner) external onlyRole(OPERATOR_ROLE) {
        isWhiteLabelPartner[_partner] = false;
        partnerExtraFee[_partner] = 0;
        emit WhiteLabelPartnerRemoved(_partner);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Calculate the total deposit amount including protocol fees
     * @param _amount The base deposit amount
     * @return The total amount including protocol fees
     */
    function calculateDepositAmount(uint256 _amount) public view returns (uint256) {
        uint256 fee = (_amount * feeRate) / FEE_PRECISION;
        return fee + _amount;
    }

    /**
     * @dev Calculate the total deposit amount including protocol fee and partner extra fee (for white-label)
     * @param _amount The base deposit amount
     * @param _partnerAddress White-label partner address; use address(0) or unregistered for protocol fee only
     * @return The total amount (amount + protocol fee + partner extra fee, or 0 if partner not registered)
     */
    function calculateTotalDepositAmount(uint256 _amount, address _partnerAddress) public view returns (uint256) {
        uint256 fee = (_amount * feeRate) / FEE_PRECISION;
        uint256 extraFee = _partnerAddress == address(0) ? 0 : partnerExtraFee[_partnerAddress];
        return _amount + fee + extraFee;
    }

    /**
     * @dev Check if an address represents ETH
     * @param _asset The asset address to check
     * @return True if the address is the ETH address constant
     */
    function isETH(address _asset) public pure returns (bool) {
        return _asset == ETH_ADDRESS;
    }

    function currentStakeSeasonId() public view returns (uint256) {
        return staking.currentSeasonId();
    }

    function assets() public view returns (address[] memory) {
        return _assets.values();
    }

    receive() external payable {}
}
