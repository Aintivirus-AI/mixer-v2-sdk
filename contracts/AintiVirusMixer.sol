// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {MerkleTreeWithHistory} from "./MerkleTreeWithHistory.sol";
import {IPoseidon} from "./interfaces/IPoseidon.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";

/**
 * @title AintiVirusMixer
 * @dev State-only contract for managing mixer commitments, nullifiers, and merkle tree
 * All fund transfers are handled by the Factory contract
 *
 * Note: Circuit pubSignals: [nullifierHash, recipient, root, fee, relayer]
 */
contract AintiVirusMixer is MerkleTreeWithHistory, ReentrancyGuard {
    IVerifier public immutable verifier;

    // Commitments
    mapping(bytes32 => bool) public commitments;

    // Nullifier mappings
    mapping(bytes32 => bool) public nullifierHashes;

    struct WithdrawalProof {
        uint[2] pA;
        uint[2][2] pB;
        uint[2] pC;
        uint[5] pubSignals; // [nullifierHash, recipient, root, fee, relayer]
    }

    address public immutable factory;
    bool public giftCardWithdrawEnabled; // Flag to enable/disable gift card withdrawals

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash);
    event GiftCardWithdrawal(address to, bytes32 orderId, bytes32 nullifierHash);
    event GiftCardEnabledUpdated(bool enabled);

    error OnlyFactory();
    error CommitmentAlreadySubmitted();
    error NullifierAlreadyUsed();
    error InvalidWithdrawProof();
    error UnknownMerkleRoot();
    error GiftCardWithdrawalsDisabled();

    constructor(
        address _verifier,
        address _hasher,
        address _factory
    ) MerkleTreeWithHistory(24, IPoseidon(_hasher)) {
        verifier = IVerifier(_verifier);
        factory = _factory;
        giftCardWithdrawEnabled = true; // Enable gift card withdrawals by default
    }

    /**
     * @dev State-only deposit function for Factory to call (no fund transfers)
     * @param _commitment The commitment hash to add to the merkle tree
     */
    function depositState(bytes32 _commitment) external nonReentrant {
        if (msg.sender != factory) revert OnlyFactory();
        if (commitments[_commitment]) revert CommitmentAlreadySubmitted();

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        emit Deposit(_commitment, insertedIndex, block.timestamp);
    }

    /**
     * @dev Internal function to validate withdrawal proof and extract recipient, relayer, fee
     * @param _proof The withdrawal proof to validate
     * @return recipient The recipient address (pubSignals[1])
     * @return relayer The relayer address (pubSignals[4]), or address(0) if no relayer
     * @return fee The fee amount the user is willing to pay the relayer (pubSignals[3])
     * @return nullifierHash The nullifier hash (pubSignals[0])
     */
    function _validateWithdrawProof(
        WithdrawalProof calldata _proof
    )
        internal
        view
        returns (address recipient, address relayer, uint256 fee, bytes32 nullifierHash)
    {
        nullifierHash = bytes32(_proof.pubSignals[0]);
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();

        if (!verifier.verifyProof(_proof.pA, _proof.pB, _proof.pC, _proof.pubSignals)) {
            revert InvalidWithdrawProof();
        }

        if (!isKnownRoot(bytes32(_proof.pubSignals[2]))) {
            revert UnknownMerkleRoot();
        }

        recipient = address(uint160(_proof.pubSignals[1]));
        fee = _proof.pubSignals[3];
        relayer = address(uint160(_proof.pubSignals[4]));
    }

    /**
     * @dev State-only withdraw validation function for Factory to call
     * @param _proof The withdrawal proof to validate
     * @return recipient The recipient address (gets amount - fee)
     * @return relayer The relayer address (gets fee), or address(0)
     * @return fee The fee amount for the relayer
     */
    function validateWithdraw(
        WithdrawalProof calldata _proof
    ) external nonReentrant returns (address recipient, address relayer, uint256 fee) {
        if (msg.sender != factory) revert OnlyFactory();

        bytes32 nullifierHash;
        (recipient, relayer, fee, nullifierHash) = _validateWithdrawProof(_proof);

        nullifierHashes[nullifierHash] = true;

        emit Withdrawal(recipient, nullifierHash);
    }

    /**
     * @dev Enable or disable gift card withdrawals (can only be called by factory)
     * @param _enabled True to enable, false to disable
     */
    function setGiftCardEnabled(bool _enabled) external {
        if (msg.sender != factory) revert OnlyFactory();
        giftCardWithdrawEnabled = _enabled;
        emit GiftCardEnabledUpdated(_enabled);
    }

    /**
     * @dev Withdraw by gift card - validates proof and marks nullifier
     * Payment contract interaction is handled by Factory
     * @param _proof The withdrawal proof to validate
     * @param _orderId The gift card order ID (generated off-chain using generateOrderId)
     * @return recipient The recipient address extracted from the proof
     */
    function withdrawByGiftCard(
        WithdrawalProof calldata _proof,
        bytes32 _orderId
    ) external nonReentrant returns (address recipient) {
        if (msg.sender != factory) revert OnlyFactory();
        if (!giftCardWithdrawEnabled) revert GiftCardWithdrawalsDisabled();

        bytes32 nullifierHash;
        (recipient, , , nullifierHash) = _validateWithdrawProof(_proof);

        // Mark nullifier as used
        nullifierHashes[nullifierHash] = true;

        emit GiftCardWithdrawal(recipient, _orderId, nullifierHash);
        emit Withdrawal(recipient, nullifierHash);
    }
}
