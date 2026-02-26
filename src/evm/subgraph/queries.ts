export const QUERIES = {
  protocol: `
    query GetProtocol($id: ID!) {
      protocol(id: $id) {
        id
        feeRate
        factoryAddress
        stakingAddress
        feeCollector
        rewardPoolShareBps
        nextSeasonDuration
        currentSeasonId
        totalDeposited
        totalWithdrawn
        depositCount
        withdrawalCount
        totalStaked
        totalClaimed
        totalStakedAllTime
        totalRewardsAddedAllTime
        updatedBlockNumber
        updatedBlockTimestamp
        updatedTransactionHash
      }
    }
  `,

  protocolData: `
    query GetProtocolData {
      protocols(first: 1, orderBy: updatedBlockTimestamp, orderDirection: desc) {
        id
        feeRate
        factoryAddress
        stakingAddress
        feeCollector
        rewardPoolShareBps
        nextSeasonDuration
        currentSeasonId
        totalDeposited
        totalWithdrawn
        depositCount
        withdrawalCount
        totalStaked
        totalClaimed
        totalStakedAllTime
        totalRewardsAddedAllTime
        updatedBlockNumber
        updatedBlockTimestamp
        updatedTransactionHash
      }
    }
  `,

  mixerPools: `
    query GetMixerPools(
      $first: Int!,
      $skip: Int!,
      $where: MixerPool_filter,
      $orderBy: MixerPool_orderBy!,
      $orderDirection: OrderDirection!
    ) {
      mixerPools(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: $orderBy,
        orderDirection: $orderDirection
      ) {
        id
        asset
        amount
        address
        deployedBlockNumber
        deployedBlockTimestamp
        deployedTransactionHash
        totalDeposited
        totalWithdrawn
        depositCount
        withdrawalCount
      }
    }
  `,

  mixerPoolById: `
    query GetMixerPool($id: ID!) {
      mixerPool(id: $id) {
        id
        asset
        amount
        address
        deployedBlockNumber
        deployedBlockTimestamp
        deployedTransactionHash
        totalDeposited
        totalWithdrawn
        depositCount
        withdrawalCount
      }
    }
  `,

  deposits: `
    query GetDeposits(
      $first: Int!,
      $skip: Int!,
      $where: Deposit_filter,
      $orderBy: Deposit_orderBy!,
      $orderDirection: OrderDirection!
    ) {
      deposits(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: $orderBy,
        orderDirection: $orderDirection
      ) {
        id
        pool { id }
        commitment
        protocolFee
        extraFee
        partnerAddress
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  withdrawals: `
    query GetWithdrawals(
      $first: Int!,
      $skip: Int!,
      $where: Withdrawal_filter,
      $orderBy: Withdrawal_orderBy!,
      $orderDirection: OrderDirection!
    ) {
      withdrawals(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: $orderBy,
        orderDirection: $orderDirection
      ) {
        id
        pool { id }
        to
        nullifierHash
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  season: `
    query GetSeason($id: ID!) {
      season(id: $id) {
        id
        seasonId
        start
        end
        duration
        totalStaked
        totalReward
        assets {
          id
          asset
          duration
          totalStaked
          totalReward
          totalWeight
        }
      }
    }
  `,

  seasonWithParticipants: `
    query GetSeasonParticipants($seasonId: ID!) {
      season(id: $seasonId) {
        id
        seasonId
        totalStaked
        totalReward
        start
        end
        participants {
          staker
          totalStaked
        }
      }
    }
  `,

  allSeasons: `
    query GetAllSeasons {
      seasons(first: 100, orderBy: seasonId, orderDirection: desc) {
        id
        seasonId
        totalStaked
        totalReward
        start
        end
      }
    }
  `,

  seasonByAsset: `
    query GetSeasonByAsset($seasonId: ID!) {
      season(id: $seasonId) {
        id
        seasonId
        totalStaked
        totalReward
        assets {
          asset
          totalStaked
          totalReward
        }
      }
    }
  `,

  seasonAssets: `
    query GetSeasonAssets(
      $first: Int!,
      $skip: Int!,
      $where: SeasonAsset_filter,
      $orderDirection: OrderDirection!
    ) {
      seasonAssets(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: id,
        orderDirection: $orderDirection
      ) {
        id
        asset
        duration
        totalStaked
        totalReward
        totalWeight
      }
    }
  `,

  stakedEvents: `
    query GetStakedEvents(
      $first: Int!,
      $skip: Int!,
      $where: Staked_filter,
      $orderDirection: OrderDirection!
    ) {
      stakeds(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: blockTimestamp,
        orderDirection: $orderDirection
      ) {
        id
        staker
        seasonAsset { id }
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  unstakedEvents: `
    query GetUnstakedEvents(
      $first: Int!,
      $skip: Int!,
      $where: Unstaked_filter,
      $orderDirection: OrderDirection!
    ) {
      unstakeds(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: blockTimestamp,
        orderDirection: $orderDirection
      ) {
        id
        staker
        seasonAsset { id }
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  claimedEvents: `
    query GetClaimedEvents(
      $first: Int!,
      $skip: Int!,
      $where: Claimed_filter,
      $orderDirection: OrderDirection!
    ) {
      claimeds(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: blockTimestamp,
        orderDirection: $orderDirection
      ) {
        id
        staker
        seasonAsset { id }
        amount
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,

  paymentStats: `
    query GetPaymentStats($id: ID!) {
      paymentStats(id: $id) {
        id
        contractAddress
        treasuryWallet
        totalVolume
        paymentCount
        updatedBlockNumber
        updatedBlockTimestamp
        updatedTransactionHash
      }
    }
  `,

  paymentProcessedList: `
    query GetPaymentProcessedList(
      $first: Int!,
      $skip: Int!,
      $where: PaymentProcessed_filter,
      $orderBy: PaymentProcessed_orderBy!,
      $orderDirection: OrderDirection!
    ) {
      paymentProcesseds(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: $orderBy,
        orderDirection: $orderDirection
      ) {
        id
        orderId
        buyer
        token
        amount
        timestamp
        blockNumber
        blockTimestamp
        transactionHash
        isNativeETH
      }
    }
  `,

  tokenUpdatedList: `
    query GetTokenUpdatedList(
      $first: Int!,
      $skip: Int!,
      $where: TokenUpdated_filter,
      $orderBy: TokenUpdated_orderBy!,
      $orderDirection: OrderDirection!
    ) {
      tokenUpdateds(
        first: $first,
        skip: $skip,
        where: $where,
        orderBy: $orderBy,
        orderDirection: $orderDirection
      ) {
        id
        token
        allowed
        blockNumber
        blockTimestamp
        transactionHash
      }
    }
  `,
} as const;
