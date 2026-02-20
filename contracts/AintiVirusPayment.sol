// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AintiVirusPayment
 * @dev Payment contract that tracks on-chain payments with allowed tokens
 */
contract AintiVirusPayment is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    struct PaymentRecord {
        bytes32 orderId;
        address buyer;
        address token;
        uint256 amount;
        uint256 paidAt;
    }

    address public treasury;

    mapping(address token => bool) public allowedTokens;
    mapping(bytes32 orderId => PaymentRecord) public payments;
    mapping(address user => bytes32[] orderIds) public paymentsOf;

    event PaymentProcessed(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokenUpdated(address indexed token, bool allowed);

    error InvalidAmount();
    error InvalidToken();
    error OrderAlreadyPaid();
    error InvalidAddress();

    constructor(address _treasury) {
        if (_treasury == address(0)) revert InvalidAddress();
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function payWithRecipient(
        bytes32 _orderId,
        address _token,
        address _buyer,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        if (_buyer == address(0)) revert InvalidAddress();
        if (!allowedTokens[_token]) revert InvalidToken();
        if (_amount == 0) revert InvalidAmount();
        if (payments[_orderId].paidAt != 0) revert OrderAlreadyPaid();

        IERC20(_token).safeTransferFrom(msg.sender, treasury, _amount);

        payments[_orderId] = PaymentRecord({
            orderId: _orderId,
            buyer: _buyer,
            token: _token,
            amount: _amount,
            paidAt: block.timestamp
        });

        paymentsOf[_buyer].push(_orderId);

        emit PaymentProcessed(_orderId, _buyer, _token, _amount, block.timestamp);
    }

    function getPayment(bytes32 _orderId) external view returns (PaymentRecord memory) {
        return payments[_orderId];
    }

    function paymentDetailsOf(
        address _user
    ) external view returns (PaymentRecord[] memory records) {
        bytes32[] memory paymentIds = paymentsOf[_user];
        uint256 _len = paymentIds.length;

        records = new PaymentRecord[](_len);

        for (uint256 i; i < _len; i++) {
            records[i] = payments[paymentIds[i]];
        }
    }

    function updateTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    function updateAllowedToken(
        address _token,
        bool _allowed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == address(0)) revert InvalidAddress();
        emit TokenUpdated(_token, _allowed);
        allowedTokens[_token] = _allowed;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
