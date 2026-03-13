// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BhuSetu Land Registry
 * @notice Immutable on-chain registry of verified land registrations.
 *         Only the designated registrar (deployer / gov backend) can record entries.
 */
contract LandRegistry {

    // ──────────────────────────────────────────────────────────────────────────
    // Types
    // ──────────────────────────────────────────────────────────────────────────

    struct Boundaries {
        string north;
        string south;
        string east;
        string west;
    }

    struct Location {
        string state;
        string district;
        string tehsil;
        string postOffice;
        string pincode;
        string plotNumber;
    }

    struct FeeSnapshot {
        uint256 processingFee;   // in rupees
        uint256 stampDuty;       // in rupees
        uint256 totalAmount;     // in rupees
    }

    /// @dev Struct used as the sole argument for `recordLand` to avoid stack-too-deep.
    struct RecordInput {
        string   bhuSetuId;       // e.g. "BHU-2026-00042"
        string   registrationId;  // DB primary key (cuid)
        uint16   regYear;
        uint32   regNumber;
        string   ownerName;
        string   ownerEmail;
        string   category;        // Residential, Commercial, etc.
        uint256  landAreaSqFt;
        bool     taxPaid;
        Boundaries boundaries;
        Location   location;
        FeeSnapshot fees;
        string[]   documentCids;  // IPFS CIDs
    }

    struct LandRecord {
        // Identity
        string  bhuSetuId;
        string  registrationId;
        uint16  regYear;
        uint32  regNumber;

        // Owner
        string  ownerName;
        string  ownerEmail;

        // Property
        string  category;
        uint256 landAreaSqFt;
        bool    taxPaid;

        // Sub-structs
        Boundaries  boundaries;
        Location    location;
        FeeSnapshot fees;

        // Documents
        string[] documentCids;

        // Verification metadata
        address verifiedBy;      // wallet of the backend / registrar
        uint256 verifiedAt;      // block.timestamp
    }

    // ──────────────────────────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────────────────────────

    address public immutable registrar;
    uint256 public recordCount;

    /// @dev bhuSetuId => LandRecord
    mapping(string => LandRecord) private records;

    /// @dev sequential index => bhuSetuId  (for enumeration)
    mapping(uint256 => string) public recordIndex;

    /// @dev duplicate guard
    mapping(string => bool) public exists;

    // ──────────────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────────────

    event LandRecorded(
        string  indexed bhuSetuId,
        string  registrationId,
        string  ownerName,
        uint256 landAreaSqFt,
        uint256 timestamp
    );

    // ──────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ──────────────────────────────────────────────────────────────────────────

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "LandRegistry: caller is not registrar");
        _;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────────────────────────────────

    constructor() {
        registrar = msg.sender;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Write (only registrar)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * @notice Record a verified land registration on-chain.
     * @param input  All registration fields packed in a single struct.
     */
    function recordLand(RecordInput calldata input) external onlyRegistrar {
        require(!exists[input.bhuSetuId], "LandRegistry: record already exists");
        require(bytes(input.bhuSetuId).length > 0, "LandRegistry: empty bhuSetuId");

        recordCount++;

        LandRecord storage r = records[input.bhuSetuId];
        r.bhuSetuId      = input.bhuSetuId;
        r.registrationId = input.registrationId;
        r.regYear        = input.regYear;
        r.regNumber      = input.regNumber;
        r.ownerName      = input.ownerName;
        r.ownerEmail     = input.ownerEmail;
        r.category       = input.category;
        r.landAreaSqFt   = input.landAreaSqFt;
        r.taxPaid        = input.taxPaid;
        r.boundaries     = input.boundaries;
        r.location       = input.location;
        r.fees           = input.fees;
        r.verifiedBy     = msg.sender;
        r.verifiedAt     = block.timestamp;

        for (uint256 i = 0; i < input.documentCids.length; i++) {
            r.documentCids.push(input.documentCids[i]);
        }

        recordIndex[recordCount] = input.bhuSetuId;
        exists[input.bhuSetuId]  = true;

        emit LandRecorded(
            input.bhuSetuId,
            input.registrationId,
            input.ownerName,
            input.landAreaSqFt,
            block.timestamp
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Read (public)
    // ──────────────────────────────────────────────────────────────────────────

    function getRecord(string calldata _bhuSetuId)
        external view returns (LandRecord memory)
    {
        require(exists[_bhuSetuId], "LandRegistry: record not found");
        return records[_bhuSetuId];
    }

    function getRecordByIndex(uint256 _index)
        external view returns (LandRecord memory)
    {
        require(_index >= 1 && _index <= recordCount, "LandRegistry: index out of range");
        return records[recordIndex[_index]];
    }
}