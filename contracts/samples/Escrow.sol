// solhint-disable

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "../YieldBox.sol";

struct Offer {
    address owner;
    uint256 assetFrom;
    uint256 assetTo;
    uint256 shareFrom;
    uint256 shareTo;
    bool closed;
}

contract Escrow {
    YieldBox public yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    Offer[] public offers;

    function make(
        uint256 assetFrom,
        uint256 assetTo,
        uint256 shareFrom,
        uint256 shareTo
    ) public {
        offers.push(Offer(msg.sender, assetFrom, assetTo, shareFrom, shareTo, false));
    }

    function take(uint256 offerId) public {
        Offer memory offer = offers[offerId];
        yieldBox.transfer(msg.sender, offer.owner, offer.assetFrom, offer.shareFrom);
        yieldBox.transfer(offer.owner, msg.sender, offer.assetTo, offer.shareTo);
        offers[offerId].closed = true;
    }

    function cancel(uint256 offerId) public {
        require(offers[offerId].owner == msg.sender);
        offers[offerId].closed = true;
    }
}
