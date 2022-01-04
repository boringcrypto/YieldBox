// SPDX-License-Identifier: GPL-3.0
// Use MIT if possible?
pragma solidity ^0.8.0;
// https://swcregistry.io/docs/SWC-103
// Also, 0.8 might still have unknown issues... stay with 0.6.12 until 0.8 has matured enough.

interface IERC165 {
        /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of tokens in ``owner``'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be have been allowed to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Returns the account approved for `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function getApproved(uint256 tokenId) external view returns (address operator);

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the caller.
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(address operator, bool _approved) external;

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;
}

// What's the point of this?
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// This is unused?
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _transferOwnership(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**

Gammify Auction Contract:
Bids : Time Expiry / Only Withdrawable if Time is out on bid or auction is cancelled
Auctions: No Timeout / optional escrow for a "buy it now" sale

Small Fee goes to treasuy (not set yet)
Optimized To prevent front running
*/

contract GammifyAuction is Ownable {

    /*****************EVENTS********************/
    event NewAuctionCreated(
        address seller,
        address tokenContract,
        uint startPrice,
        uint tokenId,
        uint buyItNow
    );

    event CancelledAuction(
        address seller,
        address tokenContract,
        uint tokenId
    );

    event AuctionSuccess(
        address token,
        address seller,
        address winner,
        uint id,
        uint price
    );

    event NewBid(
        address token,
        address bidder,
        uint tokenId,
        uint amountEther,
        uint timetoExpiry
    );

    /********************DATA STRUCTS**********************/

    struct Auction {
        address seller;
        address tokenContract;
        address highestBidder;
        uint tokenId;
        uint startPrice;
        uint highestBid;
        uint buyItNow;
        bool open; //prevent malicious auction resets
        uint auctionId;
    }

    struct ActiveAuctions {
        address token;
        uint id;
    }

    /*****************STATE VARIABLES*********************/

    ActiveAuctions[] public activeAuctions;
    mapping (address => ActiveAuctions[]) public userAuctions;
    uint internal closedAuctions;

    mapping (address => mapping (uint256 => Auction)) public auctions;
    mapping (address => mapping (uint256 => uint256)) internal bidCreation;
    mapping (address => mapping (uint256 => uint256)) public timetoBidExpiry;
    mapping (address => uint) public withdrawls;

    uint internal counter = 0;


    /****************MODIFIERS*********************/
    modifier onlySeller(address token, uint id) {
        require(
            auctions[token][id].seller == msg.sender
        );
        _;
    }

    modifier onlyBidder(address token, uint id) {
        require(
            auctions[token][id].highestBidder == msg.sender
        );
        _;
    }

    /*******************EXTERNAL FUNCTIONS***************/
    function createAuction(address token, uint id, uint startPrice, uint buyNow) 
        public {

        address seller = msg.sender;
        require(_owns(token, id, seller), "Non-valid Owner");
        require(!auctions[token][id].open, "Auction already opened");

        Auction memory newAuction = Auction(
            seller,
            token,
            seller, //set seller to highest bidder
            id,
            startPrice,
            uint(0),
            buyNow,
            true,
            counter
        );

        ActiveAuctions memory newActiveAuction = ActiveAuctions(
            token,
            id
        );

        activeAuctions.push(newActiveAuction);
        userAuctions[msg.sender].push(newActiveAuction);

        _createAuction(newAuction, token, id);
        emit NewAuctionCreated(msg.sender, token, startPrice, id, buyNow);
        counter += 1;

        /*requires approval to transfer or else transaction fails*/
        if (buyNow > 0) {
            _escrow(seller, token, id);
        }
    }

    function bid(address token, uint id, uint expiry) 
        external payable {
            
        require(msg.value > 0, "Cannot bid 0 ether");
        require(msg.value > auctions[token][id].startPrice, "Below Start Price");

        emit NewBid(
            token,
            msg.sender,
            id,
            msg.value,
            expiry
        );

        _bid(
            msg.value, 
            msg.sender, 
            token, 
            id, 
            expiry //seconds
        );
    }

    function getAuctions() 
        external view
        returns (ActiveAuctions[] memory) {

            /*Deleted array elements leave "holes" in array, res keeps track of our index in aucs*/
            uint res = 0;

            ActiveAuctions[] memory aucs = new ActiveAuctions[](activeAuctions.length - closedAuctions);

            for (uint i = 0; i < activeAuctions.length; i++) {
                if (activeAuctions[i].token != address(0)) {
                    aucs[res] = activeAuctions[i];
                    res += 1;
                }
            }

            return aucs;
    }

    function getUserAuctions(address user) 
        external view 
        returns (ActiveAuctions[] memory) {

            ActiveAuctions[] memory aucs = new ActiveAuctions[](userAuctions[user].length);

            for (uint i = 0; i < userAuctions[user].length; i++) {
               aucs[i] = userAuctions[user][i];
            }

            return aucs;

    }


    function cancelAuction(address token, uint id) 
        external onlySeller(token, id) {
            emit CancelledAuction(msg.sender, token, id);
            _cancelAuction(token, id);

    }


    function acceptBid(address token, uint id, address winner) 
        external onlySeller(token, id) {

            /*Prevents Front Running attack*/
            require(winner == auctions[token][id].highestBidder, "Preventing FrontRun");
            emit AuctionSuccess(token, auctions[token][id].seller, winner, id, auctions[token][id].highestBid);
            _closeAuction(token, id);
    }

    function withdrawl() public returns (bool) {

        uint preventRe;
        preventRe = withdrawls[msg.sender];
        withdrawls[msg.sender] = 0;

        payable(msg.sender).transfer(preventRe);
        return true;

    }

    function closeBidandWithdrawl(address token, uint id) 
        external
        onlyBidder(token, id) {

            require(_expired(token, id), "token not expired");
            withdrawl();

    }


    /************************INTERNAL*****************************/
    
    function _escrow(address from, address token, uint id) 
        internal returns (bool) {

            IERC721 nft = IERC721(token);
            nft.safeTransferFrom(from, address(this), id);
            return true;

    }


    function _transfer(address token, address to, uint id) internal {
        IERC721 nft = IERC721(token);
        nft.safeTransferFrom(address(this), to, id);
    }


    function _bid(uint value, address bidder, address token, uint id, uint expiry) internal {

        if (value <= auctions[token][id].highestBid) {
                revert("Underbid");
        }

        bidCreation[token][id] = block.timestamp;
        timetoBidExpiry[token][id] = expiry;

        withdrawls[auctions[token][id].highestBidder] += auctions[token][id].highestBid;
        auctions[token][id].highestBidder = bidder;
        auctions[token][id].highestBid = value;

        if (auctions[token][id].buyItNow > 0) {
            if (value >= auctions[token][id].buyItNow) {
               _closeAuction(token, id);
            }
        }
    }

    
    function _createAuction(Auction memory auction, address token, uint id) internal {
        auctions[token][id] = auction;
    }


    function _cancelAuction(address token, uint id) internal {
        
        withdrawls[auctions[token][id].highestBidder] += auctions[token][id].highestBid;
        address seller = auctions[token][id].seller;


        closedAuctions += 1;
        delete activeAuctions[auctions[token][id].auctionId];
        delete auctions[token][id];

        if (auctions[token][id].buyItNow > 0) {
            _transfer(token, seller, id);
        }
    }


    function _closeAuction(address token, uint id) internal {

        if (_expired(token, id)) {
            revert("Bid Expired!");
        }

        address bidder = auctions[token][id].highestBidder;
        uint buyNow = auctions[token][id].buyItNow;
        withdrawls[auctions[token][id].seller] += auctions[token][id].highestBid;

        emit AuctionSuccess(
            token,
            msg.sender,
            auctions[token][id].highestBidder,
            id,
            auctions[token][id].highestBid
        );

        closedAuctions += 1;
        delete activeAuctions[auctions[token][id].auctionId];
        delete auctions[token][id];

        if (buyNow == 0) {
            _escrow(msg.sender, token, id);
        }

        _transfer(token, bidder, id);
        // treasury fee logic here

    }


    function _owns(address token, uint id, address who) internal view returns (bool) {

        IERC721 nft = IERC721(token);
        return (nft.ownerOf(id) == who);

    }

    function _expired(address token, uint id) 
        internal
        returns (bool) {

            uint bidAmount;
            address bidder;
            

            /*TimeStamp comparison is generally frowned upon however for this use case, a few seconds of manipulation should matter much, front running is also prevented already*/
            if (block.timestamp - bidCreation[token][id] >= timetoBidExpiry[token][id]) {
                bidAmount = auctions[token][id].highestBid;
                bidder = auctions[token][id].highestBidder;

                auctions[token][id].highestBidder = auctions[token][id].seller;
                auctions[token][id].highestBid = 0;

                withdrawls[bidder] += bidAmount;
                return true;
            } else {
                return false;
            }

    }


    function onERC721Received(address, address, uint256, bytes memory) public pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

}
