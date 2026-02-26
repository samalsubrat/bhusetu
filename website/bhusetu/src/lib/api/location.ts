interface PostOffice {
    Name: string
    BranchType: string
    DeliveryStatus: string
    Circle: string
    District: string
    Division: string
    Region: string
    Block: string
    State: string
    Country: string
    Pincode: string
}

interface PincodeResponse {
    Message: string
    Status: "Success" | "Error" | "404"
    PostOffice: PostOffice[] | null
}

export type { PostOffice, PincodeResponse }

export async function fetchByPincode(pincode: string): Promise<PincodeResponse> {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    if (!res.ok) throw new Error("Failed to fetch pincode data")
    const data: PincodeResponse[] = await res.json()
    return data[0]
}
