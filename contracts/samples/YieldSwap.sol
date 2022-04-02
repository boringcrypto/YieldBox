// SPDX-License-Identifier: GPL-3
// Uniswap V2 for YieldBox (https://github.com/Uniswap/v2-core)
pragma solidity 0.8.9;
import "../YieldBox.sol";

struct Pair {
    uint128 reserve0;
    uint128 reserve1;
    uint64 asset0;
    uint64 asset1;
    uint64 lpAssetId;
    uint256 kLast;
}

library Math {
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

contract YieldSwap {
    YieldBox public yieldBox;

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    uint256 public constant MINIMUM_LIQUIDITY = 10**3;

    Pair[] public pairs;
    mapping(uint256 => mapping(uint256 => uint256)) public pairLookup;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to);
    event Sync(uint112 reserve0, uint112 reserve1);

    function create(uint64 asset0, uint64 asset1) public returns (uint256 pairId) {
        if (asset0 > asset1) {
            (asset0, asset1) = (asset1, asset0);
        }

        uint64 lpAssetId = uint64(yieldBox.createToken("YieldBox LP Token", "YLP", 18, ""));
        pairId = pairs.length;
        pairLookup[asset0][asset1] = pairId;
        pairs.push(Pair(0, 0, asset0, asset1, lpAssetId, 0));
    }

    function mint(uint256 pairId, address to) external returns (uint256 liquidity) {
        Pair storage pair = pairs[pairId];

        uint256 balance0 = yieldBox.balanceOf(address(this), pair.asset0);
        uint256 balance1 = yieldBox.balanceOf(address(this), pair.asset1);
        uint256 amount0 = balance0 - pair.reserve0;
        uint256 amount1 = balance1 - pair.reserve1;

        uint256 _totalSupply = yieldBox.totalSupply(pair.lpAssetId);
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            yieldBox.mint(pair.lpAssetId, address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min((amount0 * _totalSupply) / pair.reserve0, (amount1 * _totalSupply) / pair.reserve1);
        }
        require(liquidity > 0, "YieldSwap: Not enough mint");
        yieldBox.mint(pair.lpAssetId, to, liquidity);

        pair.reserve0 = uint112(balance0);
        pair.reserve1 = uint112(balance1);
    }

    function burn(uint256 pairId, address to) external returns (uint256 share0, uint256 share1) {
        Pair storage pair = pairs[pairId];

        uint256 balance0 = yieldBox.balanceOf(address(this), pair.asset0);
        uint256 balance1 = yieldBox.balanceOf(address(this), pair.asset1);
        uint256 liquidity = yieldBox.balanceOf(address(this), pair.lpAssetId);

        uint256 _totalSupply = yieldBox.totalSupply(pair.lpAssetId);
        share0 = (liquidity * balance0) / _totalSupply; // using balances ensures pro-rata distribution
        share1 = (liquidity * balance1) / _totalSupply; // using balances ensures pro-rata distribution
        require(share0 > 0 && share1 > 0, "YieldSwap: Not enough");
        yieldBox.burn(pair.lpAssetId, address(this), liquidity);
        yieldBox.transfer(address(this), to, pair.asset0, share0);
        yieldBox.transfer(address(this), to, pair.asset1, share1);

        pair.reserve0 = uint112(yieldBox.balanceOf(address(this), pair.asset0));
        pair.reserve1 = uint112(yieldBox.balanceOf(address(this), pair.asset1));
    }

    function swap(
        uint256 pairId,
        uint256 share0Out,
        uint256 share1Out,
        address to
    ) external {
        Pair storage pair = pairs[pairId];

        require(share0Out > 0 || share1Out > 0, "YieldSwap: Output too low");
        require(share0Out < pair.reserve0 && share1Out < pair.reserve1, "YieldSwap: Liquidity too low");

        yieldBox.transfer(address(this), to, pair.asset0, share0Out);
        yieldBox.transfer(address(this), to, pair.asset1, share1Out);

        uint256 balance0 = yieldBox.balanceOf(address(this), pair.asset0);
        uint256 balance1 = yieldBox.balanceOf(address(this), pair.asset1);

        uint256 share0In = balance0 > pair.reserve0 - share0Out ? balance0 - (pair.reserve0 - share0Out) : 0;
        uint256 share1In = balance1 > pair.reserve1 - share1Out ? balance1 - (pair.reserve1 - share1Out) : 0;
        require(share0In > 0 || share1In > 0, "YieldSwap: No input");
        require(balance0 * balance1 >= pair.reserve0 * pair.reserve1, "YieldSwap: K");

        pair.reserve0 = uint112(balance0);
        pair.reserve1 = uint112(balance1);
    }

    // force balances to match reserves
    function skim(uint256 pairId, address to) external {
        Pair storage pair = pairs[pairId];

        yieldBox.transfer(address(this), to, pair.asset0, yieldBox.balanceOf(address(this), pair.asset0) - pair.reserve0);
        yieldBox.transfer(address(this), to, pair.asset1, yieldBox.balanceOf(address(this), pair.asset1) - pair.reserve1);
    }

    // force reserves to match balances
    function sync(uint256 pairId) external {
        Pair storage pair = pairs[pairId];

        pair.reserve0 = uint112(yieldBox.balanceOf(address(this), pair.asset0));
        pair.reserve1 = uint112(yieldBox.balanceOf(address(this), pair.asset1));
    }
}
