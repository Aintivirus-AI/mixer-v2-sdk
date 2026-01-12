/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aintivirus_factory.json`.
 */
export type AintivirusFactory = {
  "address": "4LXpWrr1BFYkffdxYNnV7LhMT4ETYt38amAGRQZg2WoJ",
  "metadata": {
    "name": "aintivirusFactory",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "claimSol",
      "docs": [
        "Claim SOL rewards – factory sends funds, staking validates state"
      ],
      "discriminator": [
        139,
        113,
        179,
        189,
        190,
        30,
        132,
        195
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
                "kind": "arg",
                "path": "seasonId"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "seasonId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimToken",
      "docs": [
        "Claim token rewards – factory sends funds, staking validates state"
      ],
      "discriminator": [
        116,
        206,
        27,
        191,
        166,
        19,
        0,
        73
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
                "kind": "arg",
                "path": "seasonId"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "stakerTokenAccount",
          "writable": true
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "seasonId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deployMixer",
      "docs": [
        "Deploy a new mixer instance for a specific mode and amount"
      ],
      "discriminator": [
        17,
        36,
        4,
        123,
        3,
        17,
        229,
        153
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
        {
          "name": "mixerPool",
          "writable": true
        },
        {
          "name": "mixerConfig",
          "writable": true
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "mixerProgram",
          "address": "CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu"
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
      "name": "deposit",
      "docs": [
        "Deposit into a mixer pool – funds stay in factory vaults, mixer manages only state (CPI)"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "mixerPool"
        },
        {
          "name": "mixerConfig"
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "commitmentChecker",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "optional": true
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "mixerProgram",
          "address": "CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu"
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
        },
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
      "name": "getMixer",
      "docs": [
        "Get mixer config address for a specific mode and amount"
      ],
      "discriminator": [
        228,
        253,
        58,
        52,
        160,
        239,
        122,
        191
      ],
      "accounts": [
        {
          "name": "mixerPool"
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
      ],
      "returns": "pubkey"
    },
    {
      "name": "initializeFactory",
      "docs": [
        "Initialize the factory and its main vaults"
      ],
      "discriminator": [
        179,
        64,
        75,
        250,
        39,
        254,
        240,
        178
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mint"
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeRate",
          "type": "u64"
        }
      ]
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
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setFeeRate",
      "docs": [
        "Set fee rate (admin function)"
      ],
      "discriminator": [
        53,
        243,
        137,
        65,
        8,
        140,
        158,
        6
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        }
      ],
      "args": [
        {
          "name": "newFeeRate",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setStakingSeasonPeriod",
      "docs": [
        "Set staking season period (admin function)"
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
          "name": "factory",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
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
      "name": "stakeSol",
      "docs": [
        "Stake SOL – factory holds funds, staking manages state"
      ],
      "discriminator": [
        200,
        38,
        157,
        155,
        245,
        57,
        236,
        168
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "stakerRecord",
          "writable": true
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stakeToken",
      "docs": [
        "Stake tokens – factory holds funds, staking manages state"
      ],
      "discriminator": [
        191,
        127,
        193,
        101,
        37,
        96,
        87,
        211
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "stakerRecord",
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startStakeSeason",
      "docs": [
        "Start a new stake season (admin function)"
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
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "factory"
          ]
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "nextStakeSeason",
          "writable": true
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
      "name": "unstakeSol",
      "docs": [
        "Unstake SOL – factory sends funds, staking updates state"
      ],
      "discriminator": [
        70,
        150,
        140,
        208,
        166,
        13,
        252,
        150
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unstakeToken",
      "docs": [
        "Unstake tokens – factory sends funds, staking updates state"
      ],
      "discriminator": [
        165,
        130,
        39,
        20,
        80,
        43,
        116,
        186
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "stakingProgram",
          "address": "EkgXQkBQaG58wdtWQ2WAZWFhVFNjwffq5V3Zwk36GYbJ"
        },
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
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
            ],
            "program": {
              "kind": "const",
              "value": [
                204,
                88,
                152,
                88,
                138,
                211,
                130,
                183,
                24,
                214,
                254,
                7,
                118,
                116,
                211,
                169,
                140,
                83,
                199,
                78,
                164,
                162,
                47,
                80,
                93,
                198,
                166,
                91,
                140,
                69,
                91,
                201
              ]
            }
          }
        },
        {
          "name": "staker",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw from a mixer pool – factory sends funds, mixer validates state (CPI)"
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "factory",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  97,
                  99,
                  116,
                  111,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vaultSol",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "mixerPool"
        },
        {
          "name": "mixerConfig"
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "nullifierHashChecker",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true,
          "optional": true
        },
        {
          "name": "mixerProgram",
          "address": "CGZ8t3ZgSnEkN5zbVsAJ21d5bu9vrsBvBh7xxnZZcrVu"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
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
        },
        {
          "name": "instructionData",
          "type": "bytes"
        },
        {
          "name": "nullifierHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "factory",
      "discriminator": [
        159,
        68,
        192,
        61,
        48,
        249,
        216,
        202
      ]
    },
    {
      "name": "mixerPool",
      "discriminator": [
        125,
        154,
        206,
        245,
        90,
        148,
        241,
        66
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
  "events": [
    {
      "name": "feeRateUpdated",
      "discriminator": [
        90,
        28,
        42,
        224,
        39,
        78,
        81,
        27
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
      "name": "mixerAlreadyExists",
      "msg": "Mixer already exists for this mode and amount"
    },
    {
      "code": 6002,
      "name": "mixerNotDeployed",
      "msg": "Mixer not deployed for this mode and amount"
    },
    {
      "code": 6003,
      "name": "insufficientSolDeposit",
      "msg": "Insufficient SOL deposit"
    },
    {
      "code": 6004,
      "name": "insufficientTokenBalance",
      "msg": "Insufficient token balance"
    },
    {
      "code": 6005,
      "name": "invalidAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6006,
      "name": "feeRateTooHigh",
      "msg": "Fee rate cannot exceed 5%"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "Unauthorized: Only operator can call this"
    },
    {
      "code": 6008,
      "name": "sameValue",
      "msg": "New value must not be same with current value"
    },
    {
      "code": 6009,
      "name": "invalidSeasonId",
      "msg": "Invalid season ID"
    },
    {
      "code": 6010,
      "name": "invalidRecipient",
      "msg": "Recipient address from proof does not match provided recipient account"
    },
    {
      "code": 6011,
      "name": "invalidVaultAccount",
      "msg": "Invalid vault account. Vault account does not match factory configuration"
    },
    {
      "code": 6012,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint. Only the factory's configured token can be used"
    },
    {
      "code": 6013,
      "name": "arithmeticError",
      "msg": "Arithmetic error"
    },
    {
      "code": 6014,
      "name": "invalidOwnerAccount",
      "msg": "Invalid owner account"
    }
  ],
  "types": [
    {
      "name": "factory",
      "docs": [
        "Global factory config (single instance)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "feeRate",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "stakingProgram",
            "type": "pubkey"
          },
          {
            "name": "vaultSol",
            "type": "pubkey"
          },
          {
            "name": "vaultTokenAccount",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "feeRateUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldFeeRate",
            "type": "u64"
          },
          {
            "name": "newFeeRate",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mixerPool",
      "docs": [
        "Mixer pool describing a fixed (mode, amount) route, mirroring mixers[mode][amount]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mode",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mixerProgram",
            "type": "pubkey"
          },
          {
            "name": "mixerConfig",
            "type": "pubkey"
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
