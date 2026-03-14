// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPriceOracle} from "../../src/interfaces/IPriceOracle.sol";

contract MockOracle is IPriceOracle {
    mapping(address => uint256) public prices;

    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
        emit PriceUpdated(asset, price, block.timestamp);
    }

    function getPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
}
