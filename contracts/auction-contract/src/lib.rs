#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, Map, String, Symbol,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const AUCTIONS_KEY: Symbol = symbol_short!("AUCTS");
const COUNT_KEY: Symbol = symbol_short!("COUNT");
const TREASURY_KEY: Symbol = symbol_short!("TREASURY");

// ---------------------------------------------------------------------------
// Constants – tuneable knobs
// ---------------------------------------------------------------------------

/// Minimum percentage increase required over the current highest bid (5%).
const MIN_BID_INCREMENT_BPS: i128 = 500; // basis‑points (500 = 5%)

/// If a bid lands within this many seconds of the deadline the auction is
/// extended by `ANTI_SNIPE_EXTENSION_SECS`.
const ANTI_SNIPE_WINDOW_SECS: u64 = 300; // 5 minutes

/// How many seconds are added when the anti‑sniping rule fires.
const ANTI_SNIPE_EXTENSION_SECS: u64 = 300; // 5 minutes

/// Platform fee in basis‑points deducted from the winning bid on settlement.
const PLATFORM_FEE_BPS: i128 = 200; // 2%

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    pub id: u32,
    pub seller: Address,
    pub title: String,
    pub description: String,
    pub starting_bid: i128,
    pub highest_bid: i128,
    pub highest_bidder: Option<Address>,
    pub token: Address,
    pub end_time: u64,
    pub settled: bool,
    /// Optional instant‑purchase price. If a bid meets or exceeds this value
    /// the auction is settled immediately.
    pub buy_it_now_price: Option<i128>,
    /// Optional minimum hidden/public reserve price that must be met by auction end.
    pub reserve_price: Option<i128>,
    /// Total number of bids placed on this auction.
    pub bid_count: u32,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AuctionError {
    InvalidDuration = 1,
    InvalidBid = 2,
    AuctionMissing = 3,
    AuctionClosed = 4,
    AuctionStillLive = 5,
    AlreadySettled = 6,
    NoBids = 7,
    BidTooLow = 8,
    InvalidBuyNowPrice = 9,
    TreasuryNotSet = 10,
    Unauthorized = 11,
    CannotCancelWithBids = 12,
    InvalidReservePrice = 13,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    // -----------------------------------------------------------------------
    // Admin helpers
    // -----------------------------------------------------------------------

    /// Set or update the platform treasury address that receives fees on
    /// settlement. In production this should be guarded by an admin key;
    /// for the demo anyone can call it.
    pub fn set_treasury(env: Env, treasury: Address) {
        treasury.require_auth();
        env.storage().instance().set(&TREASURY_KEY, &treasury);
    }

    /// Retrieve the current treasury address (if configured).
    pub fn get_treasury(env: Env) -> Option<Address> {
        env.storage().instance().get(&TREASURY_KEY)
    }

    // -----------------------------------------------------------------------
    // Auction lifecycle
    // -----------------------------------------------------------------------

    pub fn create_auction(
        env: Env,
        seller: Address,
        token: Address,
        id: u32,
        title: String,
        description: String,
        starting_bid: i128,
        duration_seconds: u64,
        buy_it_now_price: Option<i128>,
        reserve_price: Option<i128>,
    ) -> Auction {
        seller.require_auth();

        if duration_seconds == 0 {
            panic_with_error!(&env, AuctionError::InvalidDuration);
        }

        if starting_bid <= 0 {
            panic_with_error!(&env, AuctionError::InvalidBid);
        }

        if let Some(res_price) = reserve_price {
            if res_price < starting_bid {
                panic_with_error!(&env, AuctionError::InvalidReservePrice);
            }
        }

        // buy_it_now_price must be greater than the starting bid and reserve price when set.
        if let Some(bin_price) = buy_it_now_price {
            if bin_price <= starting_bid {
                panic_with_error!(&env, AuctionError::InvalidBuyNowPrice);
            }
            if let Some(res_price) = reserve_price {
                if bin_price < res_price {
                    panic_with_error!(&env, AuctionError::InvalidBuyNowPrice);
                }
            }
        }

        let mut auctions = read_auctions(&env);
        let end_time = env.ledger().timestamp() + duration_seconds;
        let auction = Auction {
            id,
            seller,
            title,
            description,
            starting_bid,
            highest_bid: 0,
            highest_bidder: None,
            token,
            end_time,
            settled: false,
            buy_it_now_price,
            reserve_price,
            bid_count: 0,
        };

        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        let count: u32 = env.storage().instance().get(&COUNT_KEY).unwrap_or(0);
        if id > count {
            env.storage().instance().set(&COUNT_KEY, &id);
        }

        env.events()
            .publish((symbol_short!("listed"), id), auction.seller.clone());
        auction
    }

    pub fn get_auction(env: Env, id: u32) -> Option<Auction> {
        read_auctions(&env).get(id)
    }

    pub fn get_auction_count(env: Env) -> u32 {
        env.storage().instance().get(&COUNT_KEY).unwrap_or(0)
    }

    pub fn cancel_auction(env: Env, seller: Address, id: u32) -> Auction {
        seller.require_auth();

        let mut auctions = read_auctions(&env);
        let mut auction = auctions
            .get(id)
            .unwrap_or_else(|| panic_with_error!(&env, AuctionError::AuctionMissing));

        if auction.seller != seller {
            panic_with_error!(&env, AuctionError::Unauthorized);
        }

        if auction.settled {
            panic_with_error!(&env, AuctionError::AlreadySettled);
        }

        if auction.bid_count > 0 || auction.highest_bidder.is_some() {
            panic_with_error!(&env, AuctionError::CannotCancelWithBids);
        }

        auction.settled = true;
        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        env.events()
            .publish((symbol_short!("cancel"), id), seller);
        auction
    }

    pub fn place_bid(env: Env, bidder: Address, id: u32, amount: i128) -> Auction {
        bidder.require_auth();

        let mut auctions = read_auctions(&env);
        let mut auction = auctions
            .get(id)
            .unwrap_or_else(|| panic_with_error!(&env, AuctionError::AuctionMissing));

        if auction.settled || env.ledger().timestamp() >= auction.end_time {
            panic_with_error!(&env, AuctionError::AuctionClosed);
        }

        // --- Minimum bid with 5 % increment ---
        let minimum_bid = if auction.highest_bid > 0 {
            // highest_bid + 5 % (rounded up via integer math)
            auction.highest_bid + (auction.highest_bid * MIN_BID_INCREMENT_BPS + 9_999) / 10_000
        } else {
            auction.starting_bid
        };

        if amount < minimum_bid {
            panic_with_error!(&env, AuctionError::BidTooLow);
        }

        // Transfer tokens from the new bidder into the contract escrow.
        let token_client = token::Client::new(&env, &auction.token);
        token_client.transfer(&bidder, &env.current_contract_address(), &amount);

        // Refund the previous highest bidder.
        if let Some(previous_bidder) = auction.highest_bidder.clone() {
            token_client.transfer(
                &env.current_contract_address(),
                &previous_bidder,
                &auction.highest_bid,
            );
        }

        auction.highest_bid = amount;
        auction.highest_bidder = Some(bidder.clone());
        auction.bid_count += 1;

        // --- Anti‑sniping ---
        let now = env.ledger().timestamp();
        let remaining = auction.end_time.saturating_sub(now);
        if remaining < ANTI_SNIPE_WINDOW_SECS {
            auction.end_time = now + ANTI_SNIPE_EXTENSION_SECS;
        }

        // --- Buy‑It‑Now ---
        let is_buy_now = match auction.buy_it_now_price {
            Some(bin) if amount >= bin => true,
            _ => false,
        };

        if is_buy_now {
            // Immediately settle: transfer funds to seller (minus platform fee).
            settle_funds(&env, &auction);
            auction.settled = true;
        }

        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        if is_buy_now {
            env.events()
                .publish((symbol_short!("buynow"), id), bidder);
        } else {
            env.events()
                .publish((symbol_short!("bid"), id), (bidder, amount));
        }

        auction
    }

    pub fn settle_auction(env: Env, id: u32) -> Auction {
        let mut auctions = read_auctions(&env);
        let mut auction = auctions
            .get(id)
            .unwrap_or_else(|| panic_with_error!(&env, AuctionError::AuctionMissing));

        if auction.settled {
            panic_with_error!(&env, AuctionError::AlreadySettled);
        }

        if env.ledger().timestamp() < auction.end_time {
            panic_with_error!(&env, AuctionError::AuctionStillLive);
        }

        if auction.highest_bidder.is_none() {
            panic_with_error!(&env, AuctionError::NoBids);
        }

        // Check if Reserve Price was met (if set)
        let reserve_met = match auction.reserve_price {
            Some(res_price) => auction.highest_bid >= res_price,
            None => true,
        };

        if reserve_met {
            // Transfer funds to seller (with platform fee split)
            settle_funds(&env, &auction);
        } else {
            // Reserve price not met: refund the highest bidder in full
            let token_client = token::Client::new(&env, &auction.token);
            if let Some(ref bidder) = auction.highest_bidder {
                token_client.transfer(
                    &env.current_contract_address(),
                    bidder,
                    &auction.highest_bid,
                );
            }
        }

        auction.settled = true;
        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        if reserve_met {
            env.events()
                .publish((symbol_short!("settled"), id), auction.highest_bidder.clone());
        } else {
            env.events()
                .publish((symbol_short!("unmet"), id), auction.highest_bidder.clone());
        }

        auction
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn read_auctions(env: &Env) -> Map<u32, Auction> {
    env.storage()
        .instance()
        .get(&AUCTIONS_KEY)
        .unwrap_or(Map::new(env))
}

/// Transfer the escrowed `highest_bid` to the seller minus a platform fee.
/// If a treasury address is configured the fee goes there; otherwise the
/// full amount goes to the seller (no‑op fee).
fn settle_funds(env: &Env, auction: &Auction) {
    let token_client = token::Client::new(env, &auction.token);

    let treasury: Option<Address> = env.storage().instance().get(&TREASURY_KEY);

    match treasury {
        Some(treasury_addr) => {
            let fee = (auction.highest_bid * PLATFORM_FEE_BPS) / 10_000;
            let seller_amount = auction.highest_bid - fee;

            if fee > 0 {
                token_client.transfer(
                    &env.current_contract_address(),
                    &treasury_addr,
                    &fee,
                );
            }
            token_client.transfer(
                &env.current_contract_address(),
                &auction.seller,
                &seller_amount,
            );
        }
        None => {
            // No treasury configured – full amount to seller.
            token_client.transfer(
                &env.current_contract_address(),
                &auction.seller,
                &auction.highest_bid,
            );
        }
    }
}

#[cfg(test)]
mod test;
