// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IAintiVirusPayment
 * @dev Interface for AintiVirusPayment contract
 */
interface IAintiVirusPayment {
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
    ) external;
}
