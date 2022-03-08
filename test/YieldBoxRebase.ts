import chai, { expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { YieldBoxRebaseMock, YieldBoxRebaseMock__factory } from "../typechain-types"
chai.use(solidity)

describe("YieldBoxRebase", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let rebase: YieldBoxRebaseMock

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address
        rebase = await new YieldBoxRebaseMock__factory(deployer).deploy()
        await rebase.deployed()
    })

    it("Deploy YieldBoxRebaseMock", async function () {
        expect((await rebase.deployTransaction.wait()).status).equals(1)
    })

    it("performs basic deposit and withdraw", async function () {
        await rebase.deposit(100000000, 0)
        expect(await rebase.toAmount(100000000, false)).equals(1)
        expect(await rebase.toShare(1, false)).equals(100000000)
        await rebase.deposit(0, 1)
        expect(await rebase.totalAmount()).equals(2)
        expect(await rebase.totalShares()).equals(200000000)

        await rebase.withdraw(100000000, 0)
        await rebase.withdraw(0, 1)
        expect(await rebase.toAmount(100000000, false)).equals(1)
        expect(await rebase.toShare(1, false)).equals(100000000)
        expect(await rebase.totalAmount()).equals(0)
        expect(await rebase.totalShares()).equals(0)
    })

    it("handles gain", async function () {
        await rebase.deposit(0, 1000)

        await rebase.gain(1000) // Amount doubles, shares stay same (of course)

        expect(await rebase.totalAmount()).equals(2000)
        expect(await rebase.totalShares()).equals(100000000000)

        expect(await rebase.toAmount(100000000000, false)).equals(1999)
        expect(await rebase.toAmount(100000000000, true)).equals(2000)

        expect(await rebase.toShare(1000, false)).equals(50024987506)

        await rebase.withdraw(100000000000, 0)
        expect(await rebase.toAmount(100000000000, false)).equals(2000)
        expect(await rebase.toAmount(100000000000, true)).equals(2000)
        expect(await rebase.toShare(1000, false)).equals(50000000000)
        expect(await rebase.totalAmount()).equals(1)
        expect(await rebase.totalShares()).equals(0)
    })

    it("handles rounding", async function () {
        await rebase.deposit(0, 1000)
        expect(await rebase.toAmount(100000000000, false)).equals(1000)
        expect(await rebase.toAmount(100000000000, true)).equals(1000)

        expect(await rebase.toShare(1000, false)).equals(100000000000)
        expect(await rebase.toShare(1000, true)).equals(100000000000)

        await rebase.gain(1)

        expect(await rebase.toAmount(100000000000, false)).equals(1000)
        expect(await rebase.toAmount(100000000000, true)).equals(1001)

        expect(await rebase.toShare(1000, false)).equals(99900199600)
        expect(await rebase.toShare(1000, true)).equals(99900199601)
    })

    it("withstand cheap minipulation attacks", async function () {
        // Let's assume WBTC with 8 decimals
        for (let i = 0; i < 10; i++) {
            // Deposit the minimum
            await rebase.deposit(0, 1)

            // We add 1 WBTC for this attack
            await rebase.gain(100000000)

            // We withdraw fully
            await rebase.withdraw(await rebase.totalShares(), 0)
        }

        // The attacker has lost 9.5 WBTC
        expect(await rebase.totalAmount()).equals(950000008)
        expect(await rebase.totalShares()).equals(0)

        // Now a user deposits 0.1 WBTC
        await rebase.deposit(0, 10000000)

        // If the user withdraws, they will receive 9999994 sat... a rounding loss of 6 sat
        expect(await rebase.toAmount(await rebase.totalShares(), false)).equals(9999994)

        // The user withdraws
        await rebase.withdraw(await rebase.totalShares(), 0)

        // Now a user deposits 9 sat
        await rebase.deposit(0, 9)

        // But receives no shares at all. This is the maximum loss. At deposit of 10 sat, the user will receive 9 sat back due to rounding.
        expect(await rebase.toAmount(await rebase.totalShares(), false)).equals(0)
    })
})
