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
    struct WithdrawalProof {
        uint[2] pA;
        uint[2][2] pB;
        uint[2] pC;
        uint[5] pubSignals; // [nullifierHash, recipient, root, fee, relayer]
    }

    IVerifier public immutable verifier;
    address public immutable factory;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifierHashes;

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash);

    error OnlyFactory();
    error CommitmentAlreadySubmitted();
    error NullifierAlreadyUsed();
    error InvalidWithdrawProof();
    error UnknownMerkleRoot();

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    constructor(
        address _verifier,
        address _hasher,
        address _factory
    ) MerkleTreeWithHistory(24, IPoseidon(_hasher)) {
        verifier = IVerifier(_verifier);
        factory = _factory;
    }

    /**
     * @dev State-only deposit function for Factory to call (no fund transfers)
     * @param _commitment The commitment hash to add to the merkle tree
     */
    function deposit(bytes32 _commitment) external nonReentrant onlyFactory {
        if (commitments[_commitment]) revert CommitmentAlreadySubmitted();

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        emit Deposit(_commitment, insertedIndex, block.timestamp);
    }

    /**
     * @dev State-only withdraw validation function for Factory to call
     * @param _proof The withdrawal proof to validate
     * @return recipient The recipient address (gets amount - fee)
     * @return relayer The relayer address (gets fee), or address(0)
     * @return fee The fee amount for the relayer
     */
    function withdraw(
        WithdrawalProof calldata _proof
    ) external nonReentrant onlyFactory returns (address recipient, address relayer, uint256 fee) {
        bytes32 nullifierHash = bytes32(_proof.pubSignals[0]);

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

        nullifierHashes[nullifierHash] = true;

        emit Withdrawal(recipient, nullifierHash);
    }
}
