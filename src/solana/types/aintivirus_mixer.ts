/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aintivirus_mixer.json`.
 */
export type AintivirusMixer = {
  "address": "CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu",
  "metadata": {
    "name": "aintivirusMixer",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "depositState",
      "docs": [
        "State-only deposit function (called by factory/vault)",
        "Only manages merkle tree state, no fund transfers"
      ],
      "discriminator": [
        216,
        87,
        194,
        14,
        24,
        111,
        64,
        12
      ],
      "accounts": [
        {
          "name": "mixerConfig"
        },
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "commitmentChecker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "commitment"
              }
            ]
          }
        },
        {
          "name": "merkleTree",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  107,
                  108,
                  101,
                  95,
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mixerConfig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "getLastRoot",
      "docs": [
        "Get the last root from merkle tree"
      ],
      "discriminator": [
        136,
        48,
        63,
        201,
        37,
        13,
        204,
        43
      ],
      "accounts": [
        {
          "name": "merkleTree"
        }
      ],
      "args": [],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize a new mixer instance with fixed mode and amount",
        "Called by factory when deploying a new mixer pool"
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "mixerConfig",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMerkleTree",
      "docs": [
        "Initialize the merkle tree for this mixer instance"
      ],
      "discriminator": [
        67,
        143,
        80,
        157,
        177,
        227,
        11,
        238
      ],
      "accounts": [
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "merkleTree",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  107,
                  108,
                  101,
                  95,
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mixerConfig"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mixerConfig",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "levels",
          "type": "u8"
        }
      ]
    },
    {
      "name": "validateWithdraw",
      "docs": [
        "State-only withdraw validation function (called by factory/vault)",
        "Validates proof and returns recipient address, no fund transfers"
      ],
      "discriminator": [
        173,
        112,
        85,
        194,
        234,
        32,
        99,
        53
      ],
      "accounts": [
        {
          "name": "mixerConfig"
        },
        {
          "name": "vault",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "nullifierHashChecker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  117,
                  108,
                  108,
                  105,
                  102,
                  105,
                  101,
                  114,
                  95,
                  104,
                  97,
                  115,
                  104
                ]
              },
              {
                "kind": "arg",
                "path": "nullifierHashPrecomputed"
              }
            ]
          }
        },
        {
          "name": "merkleTree",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  114,
                  107,
                  108,
                  101,
                  95,
                  116,
                  114,
                  101,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "mixerConfig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "instructionData",
          "type": "bytes"
        },
        {
          "name": "nullifierHashPrecomputed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": "pubkey"
    }
  ],
  "accounts": [
    {
      "name": "commitmentAndNullifierHashExist",
      "discriminator": [
        41,
        117,
        172,
        132,
        137,
        159,
        136,
        150
      ]
    },
    {
      "name": "merkleTreeWithHistory",
      "discriminator": [
        116,
        166,
        248,
        38,
        103,
        144,
        29,
        71
      ]
    },
    {
      "name": "mixerConfig",
      "discriminator": [
        249,
        68,
        151,
        145,
        180,
        148,
        212,
        172
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMinimumDepositAmount",
      "msg": "Invalid deposit amount. Deposit amount under the mininum allowed"
    },
    {
      "code": 6001,
      "name": "needMaintainerRole",
      "msg": "Need Maintainer Role for this action"
    },
    {
      "code": 6002,
      "name": "verificationFailed",
      "msg": "Proof verification failed"
    },
    {
      "code": 6003,
      "name": "invalidProof",
      "msg": "Invalid proof"
    },
    {
      "code": 6004,
      "name": "invalidMode",
      "msg": "Invalid mixing mode"
    },
    {
      "code": 6005,
      "name": "failedToParsePublicInputs",
      "msg": "Failed to parse public inputs"
    },
    {
      "code": 6006,
      "name": "invalidEscrowVault",
      "msg": "Invalid escrow vault account"
    },
    {
      "code": 6007,
      "name": "invalidLevels",
      "msg": "Levels should be greater than 0 and less than 32"
    },
    {
      "code": 6008,
      "name": "treeFull",
      "msg": "Merkle tree is full. No more leaves can be added"
    },
    {
      "code": 6009,
      "name": "rootNotFound",
      "msg": "Root not found"
    },
    {
      "code": 6010,
      "name": "arithmeticError",
      "msg": "Arithmetic addition error"
    },
    {
      "code": 6011,
      "name": "nullifierHashNotMatched",
      "msg": "Nullifier hash not matched"
    },
    {
      "code": 6012,
      "name": "rootNotMatched",
      "msg": "Root is not matched"
    },
    {
      "code": 6013,
      "name": "missingAccount",
      "msg": "Missing Account"
    },
    {
      "code": 6014,
      "name": "noRewardsToClaim",
      "msg": "No rewards to claim"
    },
    {
      "code": 6015,
      "name": "stakeSeasonNotStarted",
      "msg": "Stake season has not started yet"
    },
    {
      "code": 6016,
      "name": "currentSeasonActive",
      "msg": "Current season is still active"
    },
    {
      "code": 6017,
      "name": "currentStakeSeasonExpired",
      "msg": "Current stake season has expired"
    },
    {
      "code": 6018,
      "name": "noStakedBalance",
      "msg": "No staked balance to unstake"
    },
    {
      "code": 6019,
      "name": "userAlreadyStaked",
      "msg": "User already staked"
    },
    {
      "code": 6020,
      "name": "cannotClaimForOlderSeason",
      "msg": "Cannot claim rewards for an older season"
    },
    {
      "code": 6021,
      "name": "invalidSeasonDataProvided",
      "msg": "Invalid season data provided"
    }
  ],
  "types": [
    {
      "name": "commitmentAndNullifierHashExist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "exist",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "merkleTreeWithHistory",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mixerConfig",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "levels",
            "type": "u8"
          },
          {
            "name": "currentRootIndex",
            "type": "u8"
          },
          {
            "name": "nextIndex",
            "type": "u32"
          },
          {
            "name": "filledSubtrees",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                24
              ]
            }
          },
          {
            "name": "roots",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                30
              ]
            }
          }
        ]
      }
    },
    {
      "name": "mixerConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "mode",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
