#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, Map, String, Symbol,
};

const AUCTIONS_KEY: Symbol = symbol_short!("AUCTS");
const COUNT_KEY: Symbol = symbol_short!("COUNT");

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
}

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
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    pub fn create_auction(
        env: Env,
        seller: Address,
        token: Address,
        id: u32,
        title: String,
        description: String,
        starting_bid: i128,
        duration_seconds: u64,
    ) -> Auction {
        seller.require_auth();

        if duration_seconds == 0 {
            panic_with_error!(&env, AuctionError::InvalidDuration);
        }

        if starting_bid <= 0 {
            panic_with_error!(&env, AuctionError::InvalidBid);
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
        };

        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        let count: u32 = env.storage().instance().get(&COUNT_KEY).unwrap_or(0);
        if id > count {
            env.storage().instance().set(&COUNT_KEY, &id);
        }

        env.events().publish((symbol_short!("listed"), id), auction.seller.clone());
        auction
    }

    pub fn get_auction(env: Env, id: u32) -> Option<Auction> {
        read_auctions(&env).get(id)
    }

    pub fn get_auction_count(env: Env) -> u32 {
        env.storage().instance().get(&COUNT_KEY).unwrap_or(0)
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

        let minimum_bid = if auction.highest_bid > 0 {
            auction.highest_bid + 1
        } else {
            auction.starting_bid
        };

        if amount < minimum_bid {
            panic_with_error!(&env, AuctionError::InvalidBid);
        }

        let token_client = token::Client::new(&env, &auction.token);
        token_client.transfer(&bidder, &env.current_contract_address(), &amount);

        if let Some(previous_bidder) = auction.highest_bidder.clone() {
            token_client.transfer(
                &env.current_contract_address(),
                &previous_bidder,
                &auction.highest_bid,
            );
        }

        auction.highest_bid = amount;
        auction.highest_bidder = Some(bidder.clone());
        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        env.events().publish((symbol_short!("bid"), id), (bidder, amount));
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

        let token_client = token::Client::new(&env, &auction.token);
        token_client.transfer(
            &env.current_contract_address(),
            &auction.seller,
            &auction.highest_bid,
        );

        auction.settled = true;
        auctions.set(id, auction.clone());
        env.storage().instance().set(&AUCTIONS_KEY, &auctions);

        env.events()
            .publish((symbol_short!("settled"), id), auction.highest_bidder.clone());
        auction
    }
}

fn read_auctions(env: &Env) -> Map<u32, Auction> {
    env.storage()
        .instance()
        .get(&AUCTIONS_KEY)
        .unwrap_or(Map::new(env))
}

#[cfg(test)]
mod test;
