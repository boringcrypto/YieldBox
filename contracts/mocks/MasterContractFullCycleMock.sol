// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.9;

import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "../YieldBox.sol";

contract MasterContractFullCycleMock is IMasterContract {
    YieldBox public immutable yieldBox;
    address public deployer;
    address public token;
    address public erc1155;
    IStrategy public tokenStrategy;
    IStrategy public erc1155Strategy;
    IStrategy public ethStrategy;
    IStrategy private constant ZERO = IStrategy(address(0));

    constructor(YieldBox _yieldBox) {
        yieldBox = _yieldBox;
    }

    function init(bytes calldata data) external payable override {
        (deployer, token, erc1155, tokenStrategy, erc1155Strategy, ethStrategy) = abi.decode(
            data,
            (address, address, address, IStrategy, IStrategy, IStrategy)
        );
        return;
    }

    function run() public payable {
        yieldBox.deposit(TokenType.ERC20, token, ZERO, 0, deployer, deployer, 1000, 0);
        yieldBox.deposit(TokenType.ERC20, token, ZERO, 0, deployer, deployer, 0, 1000_00000000);
        yieldBox.withdraw(2, deployer, deployer, 1000, 0);
        yieldBox.withdraw(2, deployer, deployer, 0, 1000_00000000);

        yieldBox.deposit(TokenType.ERC1155, erc1155, ZERO, 42, deployer, deployer, 1000, 0);
        yieldBox.deposit(TokenType.ERC1155, erc1155, ZERO, 42, deployer, deployer, 0, 1000_00000000);
        yieldBox.withdraw(3, deployer, deployer, 1000, 0);
        yieldBox.withdraw(3, deployer, deployer, 0, 1000_00000000);

        yieldBox.depositETH{ value: 1000 }(ZERO, deployer, 1000);
        yieldBox.withdraw(4, deployer, deployer, 1000, 0);

        yieldBox.deposit(TokenType.ERC20, token, tokenStrategy, 0, deployer, deployer, 1000, 0);
        yieldBox.deposit(TokenType.ERC20, token, tokenStrategy, 0, deployer, deployer, 0, 1000_00000000);
        yieldBox.withdraw(5, deployer, deployer, 1000, 0);
        yieldBox.withdraw(5, deployer, deployer, 0, 1000_00000000);

        yieldBox.deposit(TokenType.ERC1155, erc1155, erc1155Strategy, 42, deployer, deployer, 1000, 0);
        yieldBox.deposit(TokenType.ERC1155, erc1155, erc1155Strategy, 42, deployer, deployer, 0, 1000_00000000);
        yieldBox.withdraw(6, deployer, deployer, 1000, 0);
        yieldBox.withdraw(6, deployer, deployer, 0, 1000_00000000);

        yieldBox.depositETH{ value: 1000 }(ethStrategy, deployer, 1000);
        yieldBox.withdraw(7, deployer, deployer, 1000, 0);
    }
}
