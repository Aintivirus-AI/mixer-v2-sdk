// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifier} from "contracts/interfaces/IVerifier.sol";

contract VerifierMock is IVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[5] calldata _pubSignals
    ) public view returns (bool) {
        return true;
    }
}
