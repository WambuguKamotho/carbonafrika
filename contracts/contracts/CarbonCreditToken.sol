// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title CarbonCreditToken
 * @notice ERC-1155 semi-fungible token where each token ID = one verified project.
 *         Amount = tonnes of CO₂ sequestered (in wei: 1e18 = 1 tonne).
 *         Minter role is granted to the CarbonAfrika backend (deployer wallet).
 */
contract CarbonCreditToken is ERC1155, AccessControl, ERC1155Supply {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    string public name = "CarbonAfrika Credit";
    string public symbol = "CAC";

    // projectId -> metadata URI
    mapping(uint256 => string) private _tokenURIs;

    event CreditsMinted(address indexed to, uint256 indexed projectId, uint256 amount, bytes32 txRef);
    event CreditsRetired(address indexed from, uint256 indexed tokenId, uint256 amount);

    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
    }

    function mint(
        address to,
        uint256 projectId,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(MINTER_ROLE) {
        _mint(to, projectId, amount, data);
        emit CreditsMinted(to, projectId, amount, keccak256(data));
    }

    function burn(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(BURNER_ROLE) {
        _burn(from, tokenId, amount);
        emit CreditsRetired(from, tokenId, amount);
    }

    function setTokenURI(uint256 tokenId, string calldata uri_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenURIs[tokenId] = uri_;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}
