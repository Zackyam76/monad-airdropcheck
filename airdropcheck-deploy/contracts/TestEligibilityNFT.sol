// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Hanya untuk jaringan uji. Tidak bernilai.
contract AirdropCheckTestPass is ERC721, Ownable {
    uint256 private _nextId = 1;

    constructor() ERC721("AirdropCheck Test Pass", "ACTP") Ownable(msg.sender) {}

    function mint(address to) external onlyOwner {
        _safeMint(to, _nextId++);
    }
}