#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, token, Address, Env, String};

#[test]
fn test_create_auction() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
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
    );

    assert_eq!(auction.id, 1);
    assert_eq!(auction.highest_bid, 0);
    assert_eq!(auction.end_time, 4_600);
    assert_eq!(client.get_auction_count(), 1);
    assert_eq!(client.get_auction(&1).unwrap(), auction);
}

#[test]
fn test_place_bid_refunds_previous_bidder() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let bidder_one = Address::generate(&env);
    let bidder_two = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    token_admin_client.mint(&bidder_one, &1_000);
    token_admin_client.mint(&bidder_two, &1_000);

    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Website redesign"),
        &String::from_str(&env, "A scoped project listing"),
        &100,
        &3_600,
    );

    let first_bid = client.place_bid(&bidder_one, &1, &150);
    assert_eq!(first_bid.highest_bid, 150);
    assert_eq!(token_client.balance(&bidder_one), 850);
    assert_eq!(token_client.balance(&contract_id), 150);

    let second_bid = client.place_bid(&bidder_two, &1, &225);
    assert_eq!(second_bid.highest_bid, 225);
    assert_eq!(second_bid.highest_bidder.unwrap(), bidder_two);
    assert_eq!(token_client.balance(&bidder_one), 1_000);
    assert_eq!(token_client.balance(&bidder_two), 775);
    assert_eq!(token_client.balance(&contract_id), 225);
}

#[test]
fn test_settle_auction_transfers_winning_bid_to_seller() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    token_admin_client.mint(&bidder, &1_000);
    client.create_auction(
        &seller,
        &token_address,
        &1,
        &String::from_str(&env, "Launch campaign"),
        &String::from_str(&env, "Public project auction"),
        &100,
        &60,
    );
    client.place_bid(&bidder, &1, &400);

    env.ledger().with_mut(|li| li.timestamp = 1_061);
    let settled = client.settle_auction(&1);

    assert!(settled.settled);
    assert_eq!(token_client.balance(&seller), 400);
    assert_eq!(token_client.balance(&contract_id), 0);
}
