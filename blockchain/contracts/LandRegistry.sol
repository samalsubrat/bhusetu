// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistry {

    struct Land {
        uint256 landId;
        string location;
        string documentHash;
        address owner;
        string ownerDetails;
        uint256 timestamp;
        bool verified;
    }

    uint256 public landCount;
    mapping(uint256 => Land) public lands;

    event LandRegistered(uint256 landId, address owner);

    function registerLand(
        string memory _location,
        string memory _documentHash,
        address _owner,
        string memory _ownerDetails
    ) public {
        landCount++;

        lands[landCount] = Land({
            landId: landCount,
            location: _location,
            documentHash: _documentHash,
            owner: _owner,
            ownerDetails: _ownerDetails,
            timestamp: block.timestamp,
            verified: true
        });

        emit LandRegistered(landCount, _owner);
    }

    function getLand(uint256 _landId) public view returns (Land memory) {
        return lands[_landId];
    }
}