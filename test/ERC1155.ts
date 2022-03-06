import chai, { assert, expect } from "chai"
import { solidity } from "ethereum-waffle"
import { ethers } from "hardhat"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import {
    ERC1155BrokenReceiverMock__factory,
    ERC1155Mock,
    ERC1155Mock__factory,
    ERC1155ReceiverMock__factory,
    ERC1155RevertingReceiverMock__factory,
} from "../typechain-types"
chai.use(solidity)

describe("ERC1155", () => {
    let deployer: SignerWithAddress, alice: SignerWithAddress, bob: SignerWithAddress, carol: SignerWithAddress
    let Deployer: string, Alice: string, Bob: string, Carol: string
    const Zero = ethers.constants.AddressZero
    let erc1155: ERC1155Mock

    beforeEach(async () => {
        ;({ deployer, alice, bob, carol } = await ethers.getNamedSigners())
        Deployer = deployer.address
        Alice = alice.address
        Bob = bob.address
        Carol = carol.address
        erc1155 = await new ERC1155Mock__factory(deployer).deploy()
        await erc1155.deployed()
    })

    it("Deploy ERC1155", async function () {
        assert.equal((await erc1155.deployTransaction.wait()).status, 1)
    })

    describe("Minting", () => {
        it("cannot mint to the zero address", async function () {
            await expect(erc1155.mint(Zero, 12, 10000)).to.be.revertedWith("No 0 address")
        })
    })

    describe("Burning", () => {
        it("cannot burn from the zero address", async function () {
            await expect(erc1155.burn(Zero, 12, 10000)).to.be.revertedWith("No 0 address")
        })
    })

    describe("URI", () => {
        it("can be called", async function () {
            expect(await erc1155.uri(12)).equals("")
        })
    })

    // Smart contracts implementing the ERC-1155 standard MUST implement the ERC-165 supportsInterface function and MUST return the constant value true if 0xd9b67a26 is passed through the interfaceID argument.
    describe("ERC-165 supportsInterface", () => {
        it("should gave correct basic ERC-165 responses", async function () {
            assert.isFalse(await erc1155.supportsInterface("0xffffffff", { gasLimit: 30000 })) // Must be false
            assert.isFalse(await erc1155.supportsInterface("0xabcdef12", { gasLimit: 30000 })) // Not implemented, so false
            assert.isFalse(await erc1155.supportsInterface("0x00000000", { gasLimit: 30000 })) // Not implemented, so false
        })

        it("should support the interface for EIP-1155", async function () {
            assert.isTrue(await erc1155.supportsInterface("0xd9b67a26", { gasLimit: 30000 })) // EIP-165
        })
    })

    describe("event TransferSingle", () => {
        // Either `TransferSingle` or `TransferBatch` MUST emit when tokens are transferred, including zero value transfers as well as minting or burning (see "Safe Transfer Rules" section of the standard).
        // The `_operator` argument MUST be the address of an account/contract that is approved to make the transfer (SHOULD be msg.sender).
        // The `_from` argument MUST be the address of the holder whose balance is decreased.
        // The `_to` argument MUST be the address of the recipient whose balance is increased.
        // The `_id` argument MUST be the token type being transferred.
        // The `_value` argument MUST be the number of tokens the holder balance is decreased by and match what the recipient balance is increased by.
        it("TransferSingle emitted on _transferSingle", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.transferSingle(Alice, Bob, 12, 1234))
                .to.emit(erc1155, "TransferSingle")
                .withArgs(Deployer, Alice, Bob, 12, 1234)
        })

        // When minting/creating tokens, the `_from` argument MUST be set to `0x0` (i.e. zero address).
        it("TransferSingle emitted on _mint", async function () {
            await expect(erc1155.mint(Alice, 12, 1234)).to.emit(erc1155, "TransferSingle").withArgs(Deployer, Zero, Alice, 12, 1234)
        })

        // When burning/destroying tokens, the `_to` argument MUST be set to `0x0` (i.e. zero address).
        it("TransferSingle emitted on _burn", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.burn(Alice, 12, 1234)).to.emit(erc1155, "TransferSingle").withArgs(Deployer, Alice, Zero, 12, 1234)
        })
    })

    describe("event TransferBatch", () => {
        // @dev Either `TransferSingle` or `TransferBatch` MUST emit when tokens are transferred, including zero value transfers as well as minting or burning (see "Safe Transfer Rules" section of the standard).
        // The `_operator` argument MUST be the address of an account/contract that is approved to make the transfer (SHOULD be msg.sender).
        // The `_from` argument MUST be the address of the holder whose balance is decreased.
        // The `_to` argument MUST be the address of the recipient whose balance is increased.
        // The `_ids` argument MUST be the list of tokens being transferred.
        // The `_values` argument MUST be the list of number of tokens (matching the list and order of tokens specified in _ids) the holder balance is decreased by and match what the recipient balance is increased by.
        it("TransferBatch emitted on _transferBatch", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 5000)
            await expect(erc1155.transferBatch(Alice, Bob, [42, 12], [600, 1234]))
                .to.emit(erc1155, "TransferBatch")
                .withArgs(Deployer, Alice, Bob, [42, 12], [600, 1234])
        })
        // When minting/creating tokens, the `_from` argument MUST be set to `0x0` (i.e. zero address).
        // When burning/destroying tokens, the `_to` argument MUST be set to `0x0` (i.e. zero address).

        // _mintBatch and _burnBatch aren't implemented, don't seem super useful
    })

    describe("event ApprovalForAll", () => {
        // @dev MUST emit when approval for a second party/operator address to manage all tokens for an owner address is enabled or disabled (absence of an event assumes disabled).
        it("ApprovalForAll emitted on setApprovalForAll (set to true)", async function () {
            await expect(erc1155.connect(alice).setApprovalForAll(Bob, true)).to.emit(erc1155, "ApprovalForAll").withArgs(Alice, Bob, true)
        })

        it("ApprovalForAll emitted on setApprovalForAll (set to false)", async function () {
            await expect(erc1155.connect(alice).setApprovalForAll(Bob, false)).to.emit(erc1155, "ApprovalForAll").withArgs(Alice, Bob, false)
        })
    })

    describe("event URI", () => {
        // @dev MUST emit when the URI is updated for a token ID.
        // URIs are defined in RFC 3986.
        // The URI MUST point to a JSON file that conforms to the "ERC-1155 Metadata URI JSON Schema".
        // Not applicable here, should be tested for parent contracts
    })

    describe("function safeTransferFrom", () => {
        // @notice Transfers `_value` amount of an `_id` from the `_from` address to the `_to` address specified (with safety call).
        it("Can transfer", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.connect(alice).safeTransferFrom(Alice, Bob, 12, 250, "0x1234"))
                .to.emit(erc1155, "TransferSingle")
                .withArgs(Alice, Alice, Bob, 12, 250)

            expect(await erc1155.balanceOf(Alice, 12)).equals(9750)
            expect(await erc1155.balanceOf(Bob, 12)).equals(250)
        })

        // @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        it("Can transfer if approved", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await expect(erc1155.connect(bob).safeTransferFrom(Alice, Carol, 12, 250, "0x1234"))
                .to.emit(erc1155, "TransferSingle")
                .withArgs(Bob, Alice, Carol, 12, 250)

            expect(await erc1155.balanceOf(Alice, 12)).equals(9750)
            expect(await erc1155.balanceOf(Carol, 12)).equals(250)
        })

        it("Cannot transfer if not onwed or approved", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await erc1155.connect(alice).setApprovalForAll(Bob, false)
            await expect(erc1155.connect(bob).safeTransferFrom(Alice, Carol, 12, 250, "0x1234")).to.be.revertedWith("Transfer not allowed")

            expect(await erc1155.balanceOf(Alice, 12)).equals(10000)
            expect(await erc1155.balanceOf(Carol, 12)).equals(0)
        })

        // MUST revert if `_to` is the zero address.
        it("Cannot transfer to the zero address", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.connect(alice).safeTransferFrom(Alice, Zero, 12, 250, "0x1234")).to.be.revertedWith("No 0 address")
        })

        // MUST revert if balance of holder for token `_id` is lower than the `_value` sent.
        it("Cannot transfer more than balance", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.connect(alice).safeTransferFrom(Alice, Bob, 12, 10001, "0x1234")).to.be.revertedWith("panic code 0x11")
        })

        // MUST revert on any other error.
        // MUST emit the `TransferSingle` event to reflect the balance change (see "Safe Transfer Rules" section of the standard).
        // Already tested

        // After the above conditions are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call `onERC1155Received` on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        it("Can transfer to contract and calls onERC1155Received with correct info", async function () {
            const Receiver = await new ERC1155ReceiverMock__factory(deployer).deploy()
            await Receiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await expect(erc1155.connect(bob).safeTransferFrom(Alice, Receiver.address, 12, 250, "0x1234"))
                .to.emit(erc1155, "TransferSingle")
                .withArgs(Bob, Alice, Receiver.address, 12, 250)

            expect(await Receiver.sender()).equals(erc1155.address)
            expect(await Receiver.operator()).equals(Bob)
            expect(await Receiver.from()).equals(Alice)
            expect(await Receiver.id()).equals(12)
            expect(await Receiver.value()).equals(250)
            expect(await Receiver.data()).equals("0x1234")
        })

        // @param _from    Source address
        // @param _to      Target address
        // @param _id      ID of the token type
        // @param _value   Transfer amount
        // @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
    })

    describe("function safeBatchTransferFrom", () => {
        // @notice Transfers `_values` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        it("Can transfer", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Bob, [12, 42], [250, 123], "0x1234"))
                .to.emit(erc1155, "TransferBatch")
                .withArgs(Alice, Alice, Bob, [12, 42], [250, 123])

            expect((await erc1155.balanceOfBatch([Alice, Alice, Bob, Bob], [12, 42, 12, 42])).map((b) => b.toNumber())).eql([9750, 0, 250, 123])
        })

        // @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        it("Can transfer if approved", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await expect(erc1155.connect(bob).safeBatchTransferFrom(Alice, Carol, [12, 42], [250, 123], "0x1234"))
                .to.emit(erc1155, "TransferBatch")
                .withArgs(Bob, Alice, Carol, [12, 42], [250, 123])

            expect((await erc1155.balanceOfBatch([Alice, Alice, Carol, Carol], [12, 42, 12, 42])).map((b) => b.toNumber())).eql([
                9750, 0, 250, 123,
            ])
        })

        it("Cannot transfer if not approved", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await erc1155.connect(alice).setApprovalForAll(Bob, false)
            await expect(erc1155.connect(bob).safeBatchTransferFrom(Alice, Carol, [12, 42], [250, 123], "0x1234")).to.be.revertedWith(
                "Transfer not allowed"
            )

            expect((await erc1155.balanceOfBatch([Alice, Alice, Carol, Carol], [12, 42, 12, 42])).map((b) => b.toNumber())).eql([
                10000, 123, 0, 0,
            ])
        })

        // MUST revert if `_to` is the zero address.
        it("Cannot transfer if to is zero", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Zero, [12, 42], [250, 123], "0x1234")).to.be.revertedWith(
                "No 0 address"
            )

            expect((await erc1155.balanceOfBatch([Alice, Alice], [12, 42])).map((b) => b.toNumber())).eql([10000, 123])
        })

        // MUST revert if length of `_ids` is not the same as length of `_values`.
        it("Cannot transfer if length of ids and values don't match", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Zero, [12, 42], [250], "0x1234")).to.be.revertedWith(
                "ERC1155: Length mismatch"
            )
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Zero, [12], [250, 123], "0x1234")).to.be.revertedWith(
                "ERC1155: Length mismatch"
            )

            expect((await erc1155.balanceOfBatch([Alice, Alice], [12, 42])).map((b) => b.toNumber())).eql([10000, 123])
        })

        // MUST revert if any of the balance(s) of the holder(s) for token(s) in `_ids` is lower than the respective amount(s) in `_values` sent to the recipient.
        it("Cannot transfer more than the balance", async function () {
            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Bob, [12, 42], [10001, 123], "0x1234")).to.be.revertedWith(
                "panic code 0x11"
            )
            await expect(erc1155.connect(alice).safeBatchTransferFrom(Alice, Bob, [12, 42], [10000, 124], "0x1234")).to.be.revertedWith(
                "panic code 0x11"
            )
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            await expect(erc1155.connect(bob).safeBatchTransferFrom(Alice, Bob, [12, 42], [10001, 123], "0x1234")).to.be.revertedWith(
                "panic code 0x11"
            )
            await expect(erc1155.connect(bob).safeBatchTransferFrom(Alice, Bob, [12, 42], [10000, 124], "0x1234")).to.be.revertedWith(
                "panic code 0x11"
            )

            expect((await erc1155.balanceOfBatch([Alice, Alice], [12, 42])).map((b) => b.toNumber())).eql([10000, 123])
        })

        // MUST revert on any other error.
        // MUST emit `TransferSingle` or `TransferBatch` event(s) such that all the balance changes are reflected (see "Safe Transfer Rules" section of the standard).
        // Balance changes and events MUST follow the ordering of the arrays (_ids[0]/_values[0] before _ids[1]/_values[1], etc).

        // After the above conditions for the transfer(s) in the batch are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call the relevant `ERC1155TokenReceiver` hook(s) on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        it("Can transfer to contract and calls onERC1155BatchReceived with correct info", async function () {
            const Receiver = await new ERC1155ReceiverMock__factory(deployer).deploy()
            await Receiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await erc1155.connect(alice).setApprovalForAll(Bob, true)

            await expect(erc1155.connect(bob).safeBatchTransferFrom(Alice, Receiver.address, [12, 42], [250, 123], "0x1234"))
                .to.emit(erc1155, "TransferBatch")
                .withArgs(Bob, Alice, Receiver.address, [12, 42], [250, 123])

            expect(await Receiver.sender()).equals(erc1155.address)
            expect(await Receiver.operator()).equals(Bob)
            expect(await Receiver.from()).equals(Alice)
            expect(await Receiver.ids(0)).equals(12)
            expect(await Receiver.ids(1)).equals(42)
            expect(await Receiver.values(0)).equals(250)
            expect(await Receiver.values(1)).equals(123)
            expect(await Receiver.data()).equals("0x1234")
        })

        // @param _from    Source address
        // @param _to      Target address
        // @param _ids     IDs of each token type (order and length must match _values array)
        // @param _values  Transfer amounts per token type (order and length must match _ids array)
        // @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    })

    describe("function balanceOf", () => {
        // @notice Get the balance of an account's tokens.
        // @param _owner  The address of the token holder
        // @param _id     ID of the token
        // @return        The _owner's balance of the token type requested
        it("shows the correct balance", async function () {
            expect(await erc1155.balanceOf(Alice, 0)).equals(0)
            expect(await erc1155.balanceOf(Alice, 12)).equals(0)
            expect(await erc1155.balanceOf(Alice, 42)).equals(0)
            await erc1155.mint(Alice, 12, 10000)
            expect(await erc1155.balanceOf(Alice, 0)).equals(0)
            expect(await erc1155.balanceOf(Alice, 12)).equals(10000)
            expect(await erc1155.balanceOf(Alice, 42)).equals(0)
            await erc1155.mint(Alice, 500, 10000)
            expect(await erc1155.balanceOf(Alice, 0)).equals(0)
            expect(await erc1155.balanceOf(Alice, 12)).equals(10000)
            expect(await erc1155.balanceOf(Alice, 42)).equals(0)
            await erc1155.mint(Alice, 42, 1000)
            expect(await erc1155.balanceOf(Alice, 0)).equals(0)
            expect(await erc1155.balanceOf(Alice, 12)).equals(10000)
            expect(await erc1155.balanceOf(Alice, 42)).equals(1000)
        })
    })

    describe("function balanceOfBatch", () => {
        // @notice Get the balance of multiple account/token pairs
        // @param _owners The addresses of the token holders
        // @param _ids    ID of the tokens
        // @return        The _owner's balance of the token types requested (i.e. balance for each (owner, id) pair)
        it("shows the correct balances", async function () {
            expect((await erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42, 12])).map((b) => b.toNumber())).eql([
                0, 0, 0, 0, 0,
            ])
            await erc1155.mint(Alice, 12, 10000)
            expect((await erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42, 12])).map((b) => b.toNumber())).eql([
                0, 0, 0, 0, 10000,
            ])
            await erc1155.mint(Bob, 12, 5000)
            expect((await erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42, 12])).map((b) => b.toNumber())).eql([
                0, 5000, 0, 0, 10000,
            ])
            await erc1155.mint(Alice, 500, 10000)
            expect((await erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42, 12])).map((b) => b.toNumber())).eql([
                0, 5000, 0, 0, 10000,
            ])
            await erc1155.mint(Alice, 42, 1000)
            expect((await erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42, 12])).map((b) => b.toNumber())).eql([
                0, 5000, 0, 1000, 10000,
            ])
            expect((await erc1155.balanceOfBatch([Alice], [12])).map((b) => b.toNumber())).eql([10000])
            expect((await erc1155.balanceOfBatch([], [])).map((b) => b.toNumber())).eql([])
        })

        it("shows the correct balances for single or zero items", async function () {
            await erc1155.mint(Alice, 12, 10000)
            expect((await erc1155.balanceOfBatch([Alice], [12])).map((b) => b.toNumber())).eql([10000])
            expect((await erc1155.balanceOfBatch([], [])).map((b) => b.toNumber())).eql([])
        })

        it("only works if length of users and ids match", async function () {
            await expect(erc1155.balanceOfBatch([Alice, Bob, Carol, Alice], [0, 12, 12, 42, 12])).to.be.revertedWith("ERC1155: Length mismatch")
            await expect(erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [0, 12, 12, 42])).to.be.revertedWith(
                "ERC1155: Length mismatch"
            )
            await expect(erc1155.balanceOfBatch([Alice, Bob, Carol, Alice, Alice], [])).to.be.revertedWith("ERC1155: Length mismatch")
            await expect(erc1155.balanceOfBatch([], [0, 12, 12, 42])).to.be.revertedWith("ERC1155: Length mismatch")
        })
    })

    describe("function setApprovalForAll and isApprovedForAll", () => {
        // @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
        it("sets the approval correctly", async function () {
            expect(await erc1155.isApprovedForAll(Alice, Bob)).is.false
            expect(await erc1155.isApprovedForAll(Alice, Carol)).is.false
            expect(await erc1155.isApprovedForAll(Bob, Alice)).is.false
            await erc1155.connect(alice).setApprovalForAll(Bob, true)
            expect(await erc1155.isApprovedForAll(Alice, Bob)).is.true
            expect(await erc1155.isApprovedForAll(Alice, Carol)).is.false
            expect(await erc1155.isApprovedForAll(Bob, Alice)).is.false
            await erc1155.connect(alice).setApprovalForAll(Bob, false)
            expect(await erc1155.isApprovedForAll(Alice, Bob)).is.false
            expect(await erc1155.isApprovedForAll(Alice, Carol)).is.false
            expect(await erc1155.isApprovedForAll(Bob, Alice)).is.false
        })

        // @dev MUST emit the ApprovalForAll event on success.
        it("emits the ApprovalForAll event", async function () {
            await expect(erc1155.connect(alice).setApprovalForAll(Bob, true)).to.emit(erc1155, "ApprovalForAll").withArgs(Alice, Bob, true)
        })
        // @param _operator  Address to add to the set of authorized operators
        // @param _approved  True if the operator is approved, false to revoke approval

        // @notice Queries the approval status of an operator for a given owner.
        // @param _owner     The owner of the tokens
        // @param _operator  Address of authorized operator
        // @return           True if the operator is approved, false if not
    })

    // Safe Transfer Rules
    // To be more explicit about how the standard safeTransferFrom and safeBatchTransferFrom functions MUST operate with respect to the ERC1155TokenReceiver hook functions, a list of scenarios and rules follows.

    //  Scenarios
    // Scenario#1 : The recipient is not a contract.
    // onERC1155Received and onERC1155BatchReceived MUST NOT be called on an EOA (Externally Owned Account).

    // Scenario#2 : The transaction is not a mint/transfer of a token.
    // onERC1155Received and onERC1155BatchReceived MUST NOT be called outside of a mint or transfer process.

    // Scenario#3 : The receiver does not implement the necessary ERC1155TokenReceiver interface function(s).
    // The transfer MUST be reverted with the one caveat below.
    // If the token(s) being sent are part of a hybrid implementation of another standard, that particular standard’s rules on sending to a contract MAY now be followed instead. See “Backwards Compatibility” section.

    describe("Safe Transfer Rules Scenario #4", () => {
        // Scenario#4 : The receiver implements the necessary ERC1155TokenReceiver interface function(s) but returns an unknown value.
        // The transfer MUST be reverted.
        it("Cannot transfer to a receiver that returns the wrong magic code", async function () {
            const BrokenReceiver = await new ERC1155BrokenReceiverMock__factory(deployer).deploy()
            await BrokenReceiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.connect(alice).safeTransferFrom(Alice, BrokenReceiver.address, 12, 250, "0x1234")).to.be.revertedWith(
                "Wrong return value"
            )
        })

        it("Cannot transfer to a batch receiver that returns the wrong magic code", async function () {
            const BrokenReceiver = await new ERC1155BrokenReceiverMock__factory(deployer).deploy()
            await BrokenReceiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(
                erc1155.connect(alice).safeBatchTransferFrom(Alice, BrokenReceiver.address, [12, 42], [250, 123], "0x1234")
            ).to.be.revertedWith("Wrong return value")
        })
    })

    describe("Safe Transfer Rules Scenario #5", () => {
        // Scenario#5 : The receiver implements the necessary ERC1155TokenReceiver interface function(s) but throws an error.
        // The transfer MUST be reverted.
        it("Cannot transfer to a receiver that reverts", async function () {
            const RevertingReceiver = await new ERC1155RevertingReceiverMock__factory(deployer).deploy()
            await RevertingReceiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await expect(erc1155.connect(alice).safeTransferFrom(Alice, RevertingReceiver.address, 12, 250, "0x1234")).to.be.revertedWith("Oops")
        })

        it("Cannot transfer to a batch receiver that reverts", async function () {
            const RevertingReceiver = await new ERC1155RevertingReceiverMock__factory(deployer).deploy()
            await RevertingReceiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await expect(
                erc1155.connect(alice).safeBatchTransferFrom(Alice, RevertingReceiver.address, [12, 42], [250, 123], "0x1234")
            ).to.be.revertedWith("Oops")
        })
    })

    describe("Safe Transfer Rules Scenario #6 and #7", () => {
        // Scenario#6 : The receiver implements the ERC1155TokenReceiver interface and is the recipient of one and only one balance change (e.g. safeTransferFrom called).
        // The balances for the transfer MUST have been updated before the ERC1155TokenReceiver hook is called on a recipient contract.
        it("transfers balances before calling onERC1155Received", async function () {
            const Receiver = await new ERC1155ReceiverMock__factory(deployer).deploy()
            await Receiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.connect(alice).safeTransferFrom(Alice, Receiver.address, 12, 250, "0x1234")
            expect(await Receiver.fromBalance()).equals(9750)
        })

        it("transfers balances before calling onERC1155BatchReceived", async function () {
            const Receiver = await new ERC1155ReceiverMock__factory(deployer).deploy()
            await Receiver.deployed()

            await erc1155.mint(Alice, 12, 10000)
            await erc1155.mint(Alice, 42, 123)
            await erc1155.connect(alice).safeBatchTransferFrom(Alice, Receiver.address, [12, 42], [250, 123], "0x1234")
            expect(await Receiver.fromBalance()).equals(9750)
        })

        // The transfer event MUST have been emitted to reflect the balance changes before the ERC1155TokenReceiver hook is called on the recipient contract.
        // Can't be tested
        // One of onERC1155Received or onERC1155BatchReceived MUST be called on the recipient contract.
        // The onERC1155Received hook SHOULD be called on the recipient contract and its rules followed.
        // See “onERC1155Received rules” for further rules that MUST be followed.
        // The onERC1155BatchReceived hook MAY be called on the recipient contract and its rules followed.
        // See “onERC1155BatchReceived rules” for further rules that MUST be followed.

        // Scenario#7 : The receiver implements the ERC1155TokenReceiver interface and is the recipient of more than one balance change (e.g. safeBatchTransferFrom called).
        // All balance transfers that are referenced in a call to an ERC1155TokenReceiver hook MUST be updated before the ERC1155TokenReceiver hook is called on the recipient contract.
        // All transfer events MUST have been emitted to reflect current balance changes before an ERC1155TokenReceiver hook is called on the recipient contract.
        // onERC1155Received or onERC1155BatchReceived MUST be called on the recipient as many times as necessary such that every balance change for the recipient in the scenario is accounted for.
        // The return magic value for every hook call MUST be checked and acted upon as per “onERC1155Received rules” and “onERC1155BatchReceived rules”.
        // The onERC1155BatchReceived hook SHOULD be called on the recipient contract and its rules followed.
        // See “onERC1155BatchReceived rules” for further rules that MUST be followed.
        // The onERC1155Received hook MAY be called on the recipient contract and its rules followed.
        // See “onERC1155Received rules” for further rules that MUST be followed.
    })

    // Scenario#8 : You are the creator of a contract that implements the ERC1155TokenReceiver interface and you forward the token(s) onto another address in one or both of onERC1155Received and onERC1155BatchReceived.
    // Forwarding should be considered acceptance and then initiating a new safeTransferFrom or safeBatchTransferFrom in a new context.
    // The prescribed keccak256 acceptance value magic for the receiver hook being called MUST be returned after forwarding is successful.
    // The _data argument MAY be re-purposed for the new context.
    // If forwarding fails the transaction MAY be reverted.
    // If the contract logic wishes to keep the ownership of the token(s) itself in this case it MAY do so.

    // Scenario#9 : You are transferring tokens via a non-standard API call i.e. an implementation specific API and NOT safeTransferFrom or safeBatchTransferFrom.
    // In this scenario all balance updates and events output rules are the same as if a standard transfer function had been called.
    // i.e. an external viewer MUST still be able to query the balance via a standard function and it MUST be identical to the balance as determined by TransferSingle and TransferBatch events alone.
    // If the receiver is a contract the ERC1155TokenReceiver hooks still need to be called on it and the return values respected the same as if a standard transfer function had been called.
    // However while the safeTransferFrom or safeBatchTransferFrom functions MUST revert if a receiving contract does not implement the ERC1155TokenReceiver interface, a non-standard function MAY proceed with the transfer.
    // See “Implementation specific transfer API rules”.
})
