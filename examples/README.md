# AintiVirus SDK Examples

This directory contains example implementations for different use cases of the AintiVirus SDK hooks.

## Individual Hook Examples

### 1. `deposit-page.tsx`
Example page for depositing funds into the mixer.
- Uses `useDeposit` hook
- Only loads deposit-related code
- Generates secret and nullifier for privacy
- Shows transaction status

### 2. `stake-page.tsx`
Example page for staking and unstaking.
- Uses `useStake` hook
- Only loads staking-related code
- Supports both staking and unstaking operations
- Shows transaction status

### 3. `view-functions-page.tsx`
Example page for reading contract data.
- Uses `useView` hook
- Only loads view/read-only code
- Displays mixer information, fees, balances, and staking records
- No transactions, only reads

### 4. `admin-page.tsx`
Example page for admin operations.
- Uses `useAdmin` hook
- Only loads admin-related code
- Requires OPERATOR_ROLE or ADMIN_ROLE
- Functions: setFeeRate, setStakingSeasonPeriod, startStakeSeason, setVerifier, setHasher

### 5. `deploy-mixer-page.tsx`
Example page for deploying new mixer instances.
- Uses `useDeploy` hook
- Only loads deployment-related code
- Deploys mixers for specific asset modes and amounts
- Returns mixer address after deployment

## Usage

Each example is a standalone Next.js page component. To use them:

1. Copy the example file to your `pages` or `app` directory
2. Update the `FACTORY_ADDRESS` constant with your contract address
3. Ensure your Next.js app is configured with wagmi (see `README-NEXTJS.md`)
4. Import the hooks from `@aintivirus/sdk/hooks`

## Code Splitting Benefits

By using individual hooks instead of the unified `useAintiVirus` hook:

- ✅ **Smaller bundle size**: Only load what you need
- ✅ **Faster page loads**: Less JavaScript to parse
- ✅ **Better performance**: Tree-shaking removes unused code
- ✅ **Cleaner code**: Each page only imports relevant functionality

## Example Structure

```tsx
// ✅ Good - Only imports what's needed
import { useStake, ChainType } from "@aintivirus/sdk/hooks";

// ❌ Bad - Loads everything (deposit, withdraw, claim, etc.)
import { useAintiVirus } from "@aintivirus/sdk/hooks";
```

## Available Hooks

- `useDeposit` - For deposits only
- `useStake` - For staking/unstaking only
- `useClaim` - For claiming rewards only
- `useWithdraw` - For withdrawals only
- `useView` - For reading contract data only
- `useDeploy` - For deploying mixers only
- `useAdmin` - For admin operations only
- `useAintiVirus` - All-in-one hook (use when you need multiple functions)

See `README-HOOKS.md` for detailed documentation on each hook.

