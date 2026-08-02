#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn setup_env() -> (Env, Address, AuctionContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    (env, contract_id, client)
}

fn setup_token(env: &Env) -> (Address, token::Client<'static>, token::StellarAssetClient<'static>) {
    let admin = Address::generate(env);
    let token_address = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    let token_client = token::Client::new(env, &token_address);
    let admin_client = token::StellarAssetClient::new(env, &token_address);
    (token_address, token_client, admin_client)
}

// ---------------------------------------------------------------------------
// 1. Basic create auction
// ---------------------------------------------------------------------------

#[test]
fn test_create_auction() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let token = Address::generate(&env);

    let auction = client.create_auction(
        &seller,
        &token,
        &1,
        &String::from_str(&env, "Vintage synth"),
        &String::from_str(&env, "A rare analog instrument"),
        &100,
        &3_600,
        &None::<i128>,
        &None::<i128>,
    );

    assert_eq!(auction.id, 1);
    assert_eq!(auction.highest_bid, 0);
    assert_eq!(auction.end_time, 4_600);
    assert_eq!(auction.bid_count, 0);
    assert!(auction.buy_it_now_price.is_none());
    assert!(auction.reserve_price.is_none());
    assert_eq!(client.get_auction_count(), 1);
    assert_eq!(client.get_auction(&1).unwrap(), auction);
}

// ---------------------------------------------------------------------------
// 2. Create auction with buy‑it‑now price & reserve price
// ---------------------------------------------------------------------------

#[test]
fn test_create_auction_with_buy_it_now_and_reserve() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let token = Address::generate(&env);

    let auction = client.create_auction(
        &seller,
        &token,
        &1,
        &String::from_str(&env, "Art piece"),
        &String::from_str(&env, "Limited edition"),
        &100,
        &3_600,
        &Some(500),
        &Some(300),
    );

    assert_eq!(auction.buy_it_now_price, Some(500));
    assert_eq!(auction.reserve_price, Some(300));
}

// ---------------------------------------------------------------------------
// 3. Invalid buy‑it‑now price (must exceed starting bid)
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_create_auction_invalid_buy_now() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let token = Address::generate(&env);

    client.create_auction(
        &seller,
        &token,
        &1,
        &String::from_str(&env, "Junk"),
        &String::from_str(&env, "Fail test"),
        &100,
        &3_600,
        &Some(50), // less than starting bid → should panic
        &None::<i128>,
    );
}

// ---------------------------------------------------------------------------
// 4. Bid refunds previous bidder + 5 % increment enforced
// ---------------------------------------------------------------------------

#[test]
fn test_place_bid_refunds_previous_bidder() {
    let (env, contract_id, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder_one = Address::generate(&env);
    let bidder_two = Address::generate(&env);
    let (token_address, token_client, admin_client) = setup_token(&env);

    admin_client.mint(&bidder_one, &1_000);
    admin_client.mint(&bidder_two, &1_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Website redesign"),
        &String::from_str(&env, "A scoped project listing"),
        &100,
        &3_600,
        &None::<i128>,
        &None::<i128>,
    );

    // First bid – only needs to meet starting_bid.
    let first_bid = client.place_bid(&bidder_one, &1, &150);
    assert_eq!(first_bid.highest_bid, 150);
    assert_eq!(first_bid.bid_count, 1);
    assert_eq!(token_client.balance(&bidder_one), 850);
    assert_eq!(token_client.balance(&contract_id), 150);

    // Second bid must be >= 150 + 5% = 158 (rounds up).
    let second_bid = client.place_bid(&bidder_two, &1, &225);
    assert_eq!(second_bid.highest_bid, 225);
    assert_eq!(second_bid.bid_count, 2);
    assert_eq!(second_bid.highest_bidder.unwrap(), bidder_two);
    // Bidder one refunded.
    assert_eq!(token_client.balance(&bidder_one), 1_000);
    assert_eq!(token_client.balance(&bidder_two), 775);
    assert_eq!(token_client.balance(&contract_id), 225);
}

// ---------------------------------------------------------------------------
// 5. Bid below 5 % increment rejected
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_bid_below_minimum_increment_rejected() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder_one = Address::generate(&env);
    let bidder_two = Address::generate(&env);
    let (token_address, _tc, admin_client) = setup_token(&env);

    admin_client.mint(&bidder_one, &10_000);
    admin_client.mint(&bidder_two, &10_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Increment test"),
        &1_000,
        &3_600,
        &None::<i128>,
        &None::<i128>,
    );

    client.place_bid(&bidder_one, &1, &1_000);
    // Minimum next bid = 1_000 + 5% = 1_050. Bid of 1_020 should fail.
    client.place_bid(&bidder_two, &1, &1_020);
}

// ---------------------------------------------------------------------------
// 6. Anti‑sniping extends auction
// ---------------------------------------------------------------------------

#[test]
fn test_anti_sniping_extends_end_time() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let (token_address, _tc, admin_client) = setup_token(&env);

    admin_client.mint(&bidder, &10_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Snipe test"),
        &String::from_str(&env, "Anti-sniping"),
        &100,
        &600, // ends at timestamp 1_600
        &None::<i128>,
        &None::<i128>,
    );

    // Advance to 2 minutes before the end (timestamp 1_480).
    env.ledger().with_mut(|li| li.timestamp = 1_480);

    let bid = client.place_bid(&bidder, &1, &200);
    // End time should have been extended by 5 min from *now*.
    assert_eq!(bid.end_time, 1_480 + 300); // 1_780
}

// ---------------------------------------------------------------------------
// 7. Buy‑It‑Now instantly settles the auction
// ---------------------------------------------------------------------------

#[test]
fn test_buy_it_now_settles_immediately() {
    let (env, contract_id, client) = setup_env();
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let (token_address, token_client, admin_client) = setup_token(&env);

    admin_client.mint(&buyer, &10_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Instant sale"),
        &String::from_str(&env, "BIN test"),
        &100,
        &3_600,
        &Some(500),
        &None::<i128>,
    );

    let result = client.place_bid(&buyer, &1, &500);
    assert!(result.settled);
    assert_eq!(result.highest_bid, 500);
    // Seller receives full amount (no treasury configured).
    assert_eq!(token_client.balance(&seller), 500);
    assert_eq!(token_client.balance(&contract_id), 0);
}

// ---------------------------------------------------------------------------
// 8. Settle with platform fee (treasury configured)
// ---------------------------------------------------------------------------

#[test]
fn test_settle_with_platform_fee() {
    let (env, contract_id, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let treasury = Address::generate(&env);
    let (token_address, token_client, admin_client) = setup_token(&env);

    admin_client.mint(&bidder, &10_000);

    // Configure treasury.
    client.set_treasury(&treasury);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Fee test"),
        &String::from_str(&env, "2% fee"),
        &100,
        &60,
        &None::<i128>,
        &None::<i128>,
    );
    client.place_bid(&bidder, &1, &1_000);

    // Anti‑sniping extends end_time to 1_000 + 300 = 1_300.
    env.ledger().with_mut(|li| li.timestamp = 1_301);
    let settled = client.settle_auction(&1);

    assert!(settled.settled);

    // 2 % of 1_000 = 20 → treasury gets 20, seller gets 980.
    assert_eq!(token_client.balance(&treasury), 20);
    assert_eq!(token_client.balance(&seller), 980);
    assert_eq!(token_client.balance(&contract_id), 0);
}

// ---------------------------------------------------------------------------
// 9. Seller cancel auction before bids
// ---------------------------------------------------------------------------

#[test]
fn test_cancel_auction_success() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let token = Address::generate(&env);

    client.create_auction(
        &seller,
        &token,
        &1,
        &String::from_str(&env, "Cancelable"),
        &String::from_str(&env, "No bids yet"),
        &100,
        &3_600,
        &None::<i128>,
        &None::<i128>,
    );

    let cancelled = client.cancel_auction(&seller, &1);
    assert!(cancelled.settled);
}

// ---------------------------------------------------------------------------
// 10. Seller cancel auction after bids placed is rejected
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_cancel_auction_with_bids_rejected() {
    let (env, _cid, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let (token_address, _tc, admin_client) = setup_token(&env);

    admin_client.mint(&bidder, &1_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Cannot cancel"),
        &String::from_str(&env, "Has bids"),
        &100,
        &3_600,
        &None::<i128>,
        &None::<i128>,
    );

    client.place_bid(&bidder, &1, &150);
    client.cancel_auction(&seller, &1); // Should panic Error 12
}

// ---------------------------------------------------------------------------
// 11. Settle with reserve price met
// ---------------------------------------------------------------------------

#[test]
fn test_settle_reserve_price_met() {
    let (env, contract_id, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let (token_address, token_client, admin_client) = setup_token(&env);

    admin_client.mint(&bidder, &10_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Reserve Met"),
        &String::from_str(&env, "Reserve 500"),
        &100,
        &60,
        &None::<i128>,
        &Some(500),
    );

    client.place_bid(&bidder, &1, &600);

    env.ledger().with_mut(|li| li.timestamp = 1_301);
    let settled = client.settle_auction(&1);

    assert!(settled.settled);
    assert_eq!(token_client.balance(&seller), 600);
    assert_eq!(token_client.balance(&contract_id), 0);
}

// ---------------------------------------------------------------------------
// 12. Settle with reserve price NOT met → bidder refunded
// ---------------------------------------------------------------------------

#[test]
fn test_settle_reserve_price_not_met() {
    let (env, contract_id, client) = setup_env();
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let (token_address, token_client, admin_client) = setup_token(&env);

    admin_client.mint(&bidder, &10_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Reserve Unmet"),
        &String::from_str(&env, "Reserve 1000"),
        &100,
        &60,
        &None::<i128>,
        &Some(1_000),
    );

    // Bid of 400 is below reserve of 1_000.
    client.place_bid(&bidder, &1, &400);

    env.ledger().with_mut(|li| li.timestamp = 1_301);
    let settled = client.settle_auction(&1);

    assert!(settled.settled);
    // Seller gets 0 because reserve wasn't met.
    assert_eq!(token_client.balance(&seller), 0);
    // Bidder refunded their 400.
    assert_eq!(token_client.balance(&bidder), 10_000);
    assert_eq!(token_client.balance(&contract_id), 0);
}
