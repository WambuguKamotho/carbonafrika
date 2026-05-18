// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RetirementCertificate
 * @notice NFT (ERC-721) minted when a buyer retires carbon credits.
 *         Each NFT is permanent proof that X tonnes of CO₂ were offset
 *         via a specific CarbonAfrika project. Non-transferable after mint.
 */
contract RetirementCertificate is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId = 1;

    struct Certificate {
        uint256 projectId;
        uint256 tonnes;        // whole tonnes
        string projectTitle;
        address retiredBy;
        uint256 retiredAt;
    }

    mapping(uint256 => Certificate) public certificates;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed retiredBy,
        uint256 indexed projectId,
        uint256 tonnes
    );

    constructor(address admin) ERC721("CarbonAfrika Retirement Certificate", "CARC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function mintCertificate(
        address to,
        uint256 projectId,
        uint256 tonnes,
        string calldata projectTitle
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        certificates[tokenId] = Certificate({
            projectId: projectId,
            tonnes: tonnes,
            projectTitle: projectTitle,
            retiredBy: to,
            retiredAt: block.timestamp
        });

        emit CertificateMinted(tokenId, to, projectId, tonnes);
        return tokenId;
    }

    // Non-transferable: certificates are soul-bound after mint
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)) but block transfers
        require(from == address(0), "Certificates are non-transferable");
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Certificate memory cert = certificates[tokenId];
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(abi.encodePacked(
                '{"name":"CarbonAfrika Retirement Certificate #', _toString(tokenId), '",',
                '"description":"Proof of ', _toString(cert.tonnes), ' tonnes of CO2 retired via ', cert.projectTitle, '",',
                '"attributes":[',
                '{"trait_type":"Project","value":"', cert.projectTitle, '"},',
                '{"trait_type":"Tonnes Retired","value":', _toString(cert.tonnes), '},',
                '{"trait_type":"Retired At","value":', _toString(cert.retiredAt), '}',
                ']}'
            ))
        ));
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) { digits--; buffer[digits] = bytes1(uint8(48 + uint256(value % 10))); value /= 10; }
        return string(buffer);
    }

    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 i; uint256 j;
        for (i = 0; i < data.length - 2; i += 3) {
            result[j++] = TABLE[(uint8(data[i]) >> 2) & 0x3F];
            result[j++] = TABLE[((uint8(data[i]) & 0x3) << 4) | ((uint8(data[i+1]) & 0xF0) >> 4)];
            result[j++] = TABLE[((uint8(data[i+1]) & 0xF) << 2) | ((uint8(data[i+2]) & 0xC0) >> 6)];
            result[j++] = TABLE[uint8(data[i+2]) & 0x3F];
        }
        if (data.length % 3 == 1) {
            result[j++] = TABLE[(uint8(data[i]) >> 2) & 0x3F];
            result[j++] = TABLE[(uint8(data[i]) & 0x3) << 4];
            result[j++] = "="; result[j++] = "=";
        } else if (data.length % 3 == 2) {
            result[j++] = TABLE[(uint8(data[i]) >> 2) & 0x3F];
            result[j++] = TABLE[((uint8(data[i]) & 0x3) << 4) | ((uint8(data[i+1]) & 0xF0) >> 4)];
            result[j++] = TABLE[(uint8(data[i+1]) & 0xF) << 2];
            result[j++] = "=";
        }
        return string(result);
    }
}
