// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AintivirusPayment
 * @dev Payment contract that tracks on-chain payments with allowed tokens or ETH
 */
contract AintivirusPayment is ReentrancyGuard, AccessControl, Pausable {
    // Errors (inlined to avoid external errors import)
    error InvalidAmount();
    error InvalidToken();
    error OrderAlreadyPaid();
    error TokenTransferFailed();
    error ETHTransferFailed();
    error InvalidAddress();
    error ETHAlwaysAllowed();
    error CannotRemoveETH();
    error TokenNotInAllowList();
    error TokenAlreadyAllowed();

    // Constants
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // State variables
    address public treasuryWallet;
    uint256 public totalVolume;
    uint256 public paymentCount;

    // Token allow list: token address => is allowed
    mapping(address => bool) public allowedTokens;

    // Payment records: orderId => PaymentRecord
    mapping(bytes32 => PaymentRecord) public payments;

    // User payment history
    mapping(address => bytes32[]) public userPayments;

    struct PaymentRecord {
        bytes32 orderId;
        address buyer;
        address paymentToken; // Token address used for payment (ETH_ADDRESS for ETH)
        uint256 amount;
        uint256 paidAt;
        bool isPaid;
    }

    // Events
    event PaymentProcessed(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed paymentToken,
        uint256 amount,
        uint256 timestamp
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    constructor(address _treasuryWallet) {
        if (_treasuryWallet == address(0)) revert InvalidAddress();
        treasuryWallet = _treasuryWallet;

        // ETH is always allowed
        allowedTokens[ETH_ADDRESS] = true;

        // Grant DEFAULT_ADMIN_ROLE to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // Modifiers
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert InvalidAddress();
        _;
    }

    function updateTreasury(
        address _newTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) validAddress(_newTreasury) {
        address oldTreasury = treasuryWallet;
        treasuryWallet = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Add a token to the allow list
     * @param _token The token address to add
     */
    function addAllowedToken(
        address _token
    ) external onlyRole(DEFAULT_ADMIN_ROLE) validAddress(_token) {
        if (_token == ETH_ADDRESS) revert ETHAlwaysAllowed();
        if (allowedTokens[_token]) revert TokenAlreadyAllowed();
        allowedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    /**
     * @dev Remove a token from the allow list
     * @param _token The token address to remove
     */
    function removeAllowedToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == ETH_ADDRESS) revert CannotRemoveETH();
        if (!allowedTokens[_token]) revert TokenNotInAllowList();
        allowedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    /**
     * @dev Check if a token is allowed for payments
     * @param _token The token address to check
     * @return True if token is allowed
     */
    function isTokenAllowed(address _token) external view returns (bool) {
        return allowedTokens[_token];
    }

    /**
     * @dev Internal function to record payment and update statistics
     * @param _orderId The unique order ID
     * @param _buyer The buyer/recipient address
     * @param _token The payment token address
     * @param _amount The payment amount
     */
    function _recordPayment(
        bytes32 _orderId,
        address _buyer,
        address _token,
        uint256 _amount
    ) internal {
        uint256 timestamp = block.timestamp;

        // Record payment on-chain
        payments[_orderId] = PaymentRecord({
            orderId: _orderId,
            buyer: _buyer,
            paymentToken: _token,
            amount: _amount,
            paidAt: timestamp,
            isPaid: true
        });

        // Add to user payment history
        userPayments[_buyer].push(_orderId);

        // Update statistics (safe to use unchecked)
        unchecked {
            totalVolume += _amount;
            paymentCount++;
        }

        emit PaymentProcessed(_orderId, _buyer, _token, _amount, timestamp);
    }

    /**
     * @dev Process payment with recipient address using ERC20 token or ETH
     * @param _orderId The unique order ID generated off-chain
     * @param _token The token address to use for payment (ETH_ADDRESS for ETH)
     * @param _recipient The recipient address (ETH or SOL address)
     * @param _amount The payment amount in tokens
     */
    function payWithRecipient(
        bytes32 _orderId,
        address _token,
        address _recipient,
        uint256 _amount
    ) external payable whenNotPaused nonReentrant validAddress(_recipient) {
        if (_amount == 0) revert InvalidAmount();
        if (payments[_orderId].isPaid) revert OrderAlreadyPaid();

        if (_token == ETH_ADDRESS) {
            if (msg.value != _amount) revert InvalidAmount();
            address treasury = treasuryWallet; // Cache storage read
            (bool success, ) = payable(treasury).call{value: _amount}("");
            if (!success) revert ETHTransferFailed();
        } else {
            if (!allowedTokens[_token]) revert InvalidToken();
            if (!IERC20(_token).transferFrom(msg.sender, treasuryWallet, _amount)) {
                revert TokenTransferFailed();
            }
        }

        _recordPayment(_orderId, _recipient, _token, _amount);
    }

    // View functions
    function getPayment(bytes32 _orderId) external view returns (PaymentRecord memory) {
        return payments[_orderId];
    }

    function isOrderPaid(bytes32 _orderId) external view returns (bool) {
        return payments[_orderId].isPaid;
    }

    function getPaymentAmount(bytes32 _orderId) external view returns (uint256) {
        return payments[_orderId].amount;
    }

    function getPaymentToken(bytes32 _orderId) external view returns (address) {
        return payments[_orderId].paymentToken;
    }

    function getUserPayments(address _user) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }

    function getUserPaymentDetails(address _user) external view returns (PaymentRecord[] memory) {
        bytes32[] memory paymentIds = userPayments[_user];
        PaymentRecord[] memory userPaymentRecords = new PaymentRecord[](paymentIds.length);

        for (uint256 i = 0; i < paymentIds.length; i++) {
            userPaymentRecords[i] = payments[paymentIds[i]];
        }

        return userPaymentRecords;
    }

    function getStatistics()
        external
        view
        returns (uint256 _totalVolume, uint256 _paymentCount, address _treasury)
    {
        return (totalVolume, paymentCount, treasuryWallet);
    }

    // Receive ETH
    receive() external payable {}
}
