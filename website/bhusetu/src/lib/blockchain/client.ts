import { ethers } from "ethers"
import { LAND_REGISTRY_ABI } from "./abi"

// ─── Environment ────────────────────────────────────────────────────────────
const RPC_URL           = process.env.BLOCKCHAIN_RPC_URL           || "http://127.0.0.1:8545"
const PRIVATE_KEY       = process.env.BLOCKCHAIN_PRIVATE_KEY       || ""
const CONTRACT_ADDRESS  = process.env.BLOCKCHAIN_CONTRACT_ADDRESS  || ""

if (!PRIVATE_KEY) {
    console.warn("[blockchain] BLOCKCHAIN_PRIVATE_KEY is not set — on-chain writes will fail")
}
if (!CONTRACT_ADDRESS) {
    console.warn("[blockchain] BLOCKCHAIN_CONTRACT_ADDRESS is not set — contract calls will fail")
}

// ─── Singleton provider / signer ────────────────────────────────────────────
let _provider: ethers.JsonRpcProvider | null = null
let _signer:   ethers.Wallet | null = null

function getProvider(): ethers.JsonRpcProvider {
    if (!_provider) {
        _provider = new ethers.JsonRpcProvider(RPC_URL)
    }
    return _provider
}

function getSigner(): ethers.Wallet {
    if (!_signer) {
        _signer = new ethers.Wallet(PRIVATE_KEY, getProvider())
    }
    return _signer
}

function getContract(): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESS, LAND_REGISTRY_ABI, getSigner())
}

function getReadContract(): ethers.Contract {
    return new ethers.Contract(CONTRACT_ADDRESS, LAND_REGISTRY_ABI, getProvider())
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecordLandInput {
    bhuSetuId:       string
    registrationId:  string
    regYear:         number
    regNumber:       number
    ownerName:       string
    ownerEmail:      string
    category:        string
    landAreaSqFt:    number
    taxPaid:         boolean
    boundaries: {
        north: string
        south: string
        east:  string
        west:  string
    }
    location: {
        state:      string
        district:   string
        tehsil:     string
        postOffice: string
        pincode:    string
        plotNumber: string
    }
    fees: {
        processingFee: number
        stampDuty:     number
        totalAmount:   number
    }
    documentCids: string[]
}

export interface BlockchainResult {
    success:     boolean
    txHash?:     string
    blockNumber? : number
    error?:      string
}

// ─── Write: record land on-chain ────────────────────────────────────────────

export async function recordLandOnChain(input: RecordLandInput): Promise<BlockchainResult> {
    try {
        const contract = getContract()

        const structInput = {
            bhuSetuId:      input.bhuSetuId,
            registrationId: input.registrationId,
            regYear:        input.regYear,
            regNumber:      input.regNumber,
            ownerName:      input.ownerName,
            ownerEmail:     input.ownerEmail,
            category:       input.category,
            landAreaSqFt:   BigInt(Math.round(input.landAreaSqFt)),
            taxPaid:        input.taxPaid,
            boundaries: {
                north: input.boundaries.north,
                south: input.boundaries.south,
                east:  input.boundaries.east,
                west:  input.boundaries.west,
            },
            location: {
                state:      input.location.state,
                district:   input.location.district,
                tehsil:     input.location.tehsil,
                postOffice: input.location.postOffice,
                pincode:    input.location.pincode,
                plotNumber: input.location.plotNumber,
            },
            fees: {
                processingFee: BigInt(input.fees.processingFee),
                stampDuty:     BigInt(input.fees.stampDuty),
                totalAmount:   BigInt(input.fees.totalAmount),
            },
            documentCids: input.documentCids,
        }

        const tx = await contract.recordLand(structInput)
        const receipt = await tx.wait()

        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        }
    } catch (err: any) {
        console.error("[blockchain] recordLandOnChain failed:", err)
        return {
            success: false,
            error: err.reason || err.message || "Unknown blockchain error",
        }
    }
}

// ─── Read: fetch a record by bhuSetuId (for verification / display) ─────────

export async function getRecordFromChain(bhuSetuId: string) {
    try {
        const contract = getReadContract()
        const exists = await contract.exists(bhuSetuId)
        if (!exists) return null

        const record = await contract.getRecord(bhuSetuId)
        return {
            bhuSetuId:      record.bhuSetuId,
            registrationId: record.registrationId,
            regYear:        Number(record.regYear),
            regNumber:      Number(record.regNumber),
            ownerName:      record.ownerName,
            ownerEmail:     record.ownerEmail,
            category:       record.category,
            landAreaSqFt:   Number(record.landAreaSqFt),
            taxPaid:        record.taxPaid,
            verifiedBy:     record.verifiedBy,
            verifiedAt:     Number(record.verifiedAt),
        }
    } catch (err: any) {
        console.error("[blockchain] getRecordFromChain failed:", err)
        return null
    }
}
