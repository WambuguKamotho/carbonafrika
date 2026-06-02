// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ProjectRegistry
 * @notice On-chain registry of verified carbon offset projects.
 *         Stores immutable project metadata hashes for transparency.
 */
contract ProjectRegistry is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    enum ProjectStatus { Pending, Verified, Rejected }

    struct Project {
        uint256 id;
        address owner;
        string metadataIpfsHash;  // IPFS CID of full project data
        ProjectStatus status;
        uint256 verifiedTons;
        uint256 registeredAt;
        uint256 verifiedAt;
    }

    uint256 private _nextProjectId = 1;
    mapping(uint256 => Project) public projects;
    mapping(address => uint256[]) public ownerProjects;

    event ProjectRegistered(uint256 indexed id, address indexed owner, string metadataHash);
    event ProjectVerified(uint256 indexed id, uint256 carbonTons);
    event ProjectRejected(uint256 indexed id, string reason);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    function registerProject(
        address owner,
        string calldata metadataIpfsHash
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256) {
        uint256 id = _nextProjectId++;
        projects[id] = Project({
            id: id,
            owner: owner,
            metadataIpfsHash: metadataIpfsHash,
            status: ProjectStatus.Pending,
            verifiedTons: 0,
            registeredAt: block.timestamp,
            verifiedAt: 0
        });
        ownerProjects[owner].push(id);
        emit ProjectRegistered(id, owner, metadataIpfsHash);
        return id;
    }

    function verifyProject(
        uint256 projectId,
        uint256 carbonTons
    ) external onlyRole(REGISTRAR_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project not found");
        require(p.status == ProjectStatus.Pending, "Not pending");
        p.status = ProjectStatus.Verified;
        p.verifiedTons = carbonTons;
        p.verifiedAt = block.timestamp;
        emit ProjectVerified(projectId, carbonTons);
    }

    function rejectProject(
        uint256 projectId,
        string calldata reason
    ) external onlyRole(REGISTRAR_ROLE) {
        Project storage p = projects[projectId];
        require(p.id != 0, "Project not found");
        p.status = ProjectStatus.Rejected;
        emit ProjectRejected(projectId, reason);
    }

    function getOwnerProjects(address owner) external view returns (uint256[] memory) {
        return ownerProjects[owner];
    }
}
