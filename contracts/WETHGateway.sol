// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IWETH} from "./interfaces/IWETH.sol";
import {IAintiVirusFactory} from "./interfaces/IAintiVirusFactory.sol";
import {IAintiVirusPayment} from "./interfaces/IAintiVirusPayment.sol";

contract WETHGateway is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;

    IAintiVirusFactory internal immutable factory;
    IWETH public immutable weth;

    error ETHAmountMismatch();

    constructor(IAintiVirusFactory factory_, IWETH weth_) {
        factory = factory_;
        weth = weth_;
    }

    function deposit(uint256 _amount, bytes32 _commitment) external payable {
        uint256 _amountAndFee = factory.calculateDepositAmount(_amount, address(0));

        if (msg.value != _amountAndFee) revert ETHAmountMismatch();

        weth.deposit{value: msg.value}();

        weth.forceApprove(address(factory), _amountAndFee);
        factory.deposit(address(weth), _amount, _commitment, address(0));
    }

    function deposit(uint256 _amount, bytes32 _commitment, address _partner) external payable {
        uint256 _amountAndFee = factory.calculateDepositAmount(_amount, _partner);

        if (msg.value != _amountAndFee) revert ETHAmountMismatch();

        weth.deposit{value: msg.value}();

        weth.forceApprove(address(factory), _amountAndFee);
        factory.deposit(address(weth), _amount, _commitment, _partner);
    }

    function stake() external payable {
        weth.deposit{value: msg.value}();
        weth.forceApprove(address(factory), msg.value);
        factory.stake(address(weth), msg.value, msg.sender);
    }

    function payWithRecipient(
        bytes32 _orderId,
        address _token,
        address _recipient
    ) external payable {
        weth.deposit{value: msg.value}();
        weth.forceApprove(address(factory), msg.value);
        IAintiVirusPayment payment = IAintiVirusPayment(factory.payment());
        payment.payWithRecipient(_orderId, _token, _recipient, msg.value);
    }
}
