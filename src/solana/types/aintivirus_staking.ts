/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aintivirus_staking.json`.
 */
export type AintivirusStaking = {
  "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ",
  "metadata": {
    "name": "aintivirusStaking",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "addRewards",
      "docs": [
        "State-only function to add rewards to the current staking season",
        "Funds are held by the Factory, this only updates state"
      ],
      "discriminator": [
        88,
        186,
        25,
        227,
        38,
        137,
        81,
        23
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "staking.current_stake_season",
                "account": "staking"
              }
            ]
          }
        },
        {
          "name": "vault",
          "signer": true
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
      "name": "claimState",
      "docs": [
        "State-only claim function for Vault to call",
        "Returns the reward amount to be claimed"
      ],
      "discriminator": [
        36,
        201,
        187,
        105,
        53,
        12,
        80,
        36
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true
        },
        {
          "name": "stakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "seasonId"
              }
            ]
          }
        },
        {
          "name": "stakerRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "seasonClaimed",
          "writable": true
        },
        {
          "name": "staker",
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
          "name": "seasonId",
          "type": "u64"
        }
      ],
      "returns": "u64"
    },
    {
      "name": "getCurrentStakeSeason",
      "docs": [
        "Get the current stake season ID"
      ],
      "discriminator": [
        191,
        97,
        105,
        154,
        238,
        55,
        235,
        157
      ],
      "accounts": [
        {
          "name": "staking"
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "initializeFirstSeason",
      "docs": [
        "Initialize the first stake season (called after initialize_staking)"
      ],
      "discriminator": [
        247,
        113,
        37,
        46,
        212,
        195,
        83,
        251
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "const",
                "value": [
                  1,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeStaking",
      "docs": [
        "Initialize the staking program"
      ],
      "discriminator": [
        184,
        41,
        251,
        154,
        146,
        145,
        197,
        77
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setStakingSeasonPeriod",
      "docs": [
        "Set the staking season period (admin function)"
      ],
      "discriminator": [
        8,
        199,
        253,
        28,
        90,
        92,
        54,
        154
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true
        },
        {
          "name": "vault",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "period",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeState",
      "docs": [
        "State-only stake function for Vault to call"
      ],
      "discriminator": [
        100,
        204,
        175,
        75,
        61,
        111,
        3,
        100
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true
        },
        {
          "name": "stakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "staking.current_stake_season",
                "account": "staking"
              }
            ]
          }
        },
        {
          "name": "stakerRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
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
      "name": "startStakeSeason",
      "docs": [
        "Start a new stake season (called by vault when current season expires)"
      ],
      "discriminator": [
        206,
        139,
        170,
        171,
        72,
        36,
        232,
        138
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "currentStakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "staking.current_stake_season",
                "account": "staking"
              }
            ]
          }
        },
        {
          "name": "nextStakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "nextSeasonId"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nextSeasonId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unstakeState",
      "docs": [
        "State-only unstake function for Vault to call",
        "Returns the amount to be released"
      ],
      "discriminator": [
        142,
        204,
        80,
        168,
        91,
        60,
        47,
        2
      ],
      "accounts": [
        {
          "name": "staking",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stakeSeason",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  115,
                  101,
                  97,
                  115,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "staking.current_stake_season",
                "account": "staking"
              }
            ]
          }
        },
        {
          "name": "stakerRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114,
                  95,
                  114,
                  101,
                  99,
                  111,
                  114,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "staker"
              }
            ]
          }
        },
        {
          "name": "staker"
        },
        {
          "name": "vault",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "mode",
          "type": "u8"
        }
      ],
      "returns": "u64"
    }
  ],
  "accounts": [
    {
      "name": "seasonClaimed",
      "discriminator": [
        170,
        107,
        128,
        85,
        97,
        112,
        144,
        192
      ]
    },
    {
      "name": "stakeSeason",
      "discriminator": [
        248,
        16,
        246,
        183,
        42,
        157,
        19,
        231
      ]
    },
    {
      "name": "stakerRecord",
      "discriminator": [
        32,
        233,
        136,
        62,
        39,
        209,
        227,
        86
      ]
    },
    {
      "name": "staking",
      "discriminator": [
        242,
        134,
        183,
        223,
        18,
        13,
        184,
        23
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMode",
      "msg": "Invalid mode. Must be 0 (SOL) or 1 (TOKEN)"
    },
    {
      "code": 6001,
      "name": "onlyVaultCanCall",
      "msg": "Only vault can call this function"
    },
    {
      "code": 6002,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "currentStakeSeasonExpired",
      "msg": "Current staking season has expired"
    },
    {
      "code": 6004,
      "name": "userAlreadyStakedSol",
      "msg": "User already staked SOL"
    },
    {
      "code": 6005,
      "name": "userAlreadyStakedToken",
      "msg": "User already staked Token"
    },
    {
      "code": 6006,
      "name": "stakeSeasonNotStarted",
      "msg": "Season is not started yet"
    },
    {
      "code": 6007,
      "name": "currentSeasonActive",
      "msg": "Current season is still active"
    },
    {
      "code": 6008,
      "name": "userNotStakedInSeason",
      "msg": "User has not staked in this season"
    },
    {
      "code": 6009,
      "name": "noRewardsToClaim",
      "msg": "No reward to claim"
    },
    {
      "code": 6010,
      "name": "alreadyClaimedThisSeason",
      "msg": "User already claimed this season's rewards"
    },
    {
      "code": 6011,
      "name": "noStakedBalance",
      "msg": "No staked balance to unstake"
    },
    {
      "code": 6012,
      "name": "sameValue",
      "msg": "New value must not be same with current value"
    },
    {
      "code": 6013,
      "name": "invalidSeasonId",
      "msg": "Invalid season ID"
    },
    {
      "code": 6014,
      "name": "arithmeticError",
      "msg": "Arithmetic error"
    }
  ],
  "types": [
    {
      "name": "seasonClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "claimed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "stakeSeason",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seasonId",
            "type": "u64"
          },
          {
            "name": "startTimestamp",
            "type": "i64"
          },
          {
            "name": "endTimestamp",
            "type": "i64"
          },
          {
            "name": "stakingSeasonPeriod",
            "type": "u64"
          },
          {
            "name": "totalStakedSolAmount",
            "type": "u64"
          },
          {
            "name": "totalStakedTokenAmount",
            "type": "u64"
          },
          {
            "name": "totalRewardSolAmount",
            "type": "u64"
          },
          {
            "name": "totalRewardTokenAmount",
            "type": "u64"
          },
          {
            "name": "totalSolWeightValue",
            "type": "u64"
          },
          {
            "name": "totalTokenWeightValue",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stakerRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "solStakedSeasonId",
            "type": "u64"
          },
          {
            "name": "tokenStakedSeasonId",
            "type": "u64"
          },
          {
            "name": "solStakedTimestamp",
            "type": "i64"
          },
          {
            "name": "tokenStakedTimestamp",
            "type": "i64"
          },
          {
            "name": "stakedSolAmount",
            "type": "u64"
          },
          {
            "name": "stakedTokenAmount",
            "type": "u64"
          },
          {
            "name": "solWeightValue",
            "type": "u64"
          },
          {
            "name": "tokenWeightValue",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "staking",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "stakingSeasonPeriod",
            "type": "u64"
          },
          {
            "name": "currentStakeSeason",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
