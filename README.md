# BoringBox

The BoringBox is a token and strategy vault to ease protocol development and add capitol efficiency to any protocol.

## Background

BentoBox is a token vault where the owner can add a strategy for each token to generate extra yield. The Sushi ops team became the owner
and had the ability to add strategies, but didn't do so until recently. Abracadabra also builds on top of the BentoBox and wanted certain
startegies turned on, but could not agree with the Sushi team. This caused them to launch their own 'DegenBox'. Since the BentoBox concept
benefits from a network effect, having multiple defeats the purpose. This points to a clear design flaw. There should be no ownership and
the strategies used should be picked by te user. This prompted the development of the BoringBox.

## Changes
- Completely permissionless design.
- Support any number of strategies per token. Each token + strategy is an 'asset'.
- Full automatic support for rebasing tokens. Protocols using BoringBox do not have to worry about rebasing.
- Full EIP-1155 support, all BoringBox balances are now EIP-1155 tokens.
- Removed skimming functionality (to support rebasing tokens).
- Removed flashloan support. This wasn't being used and wasn't as useful in the new design.

## Open design choices
- Add another level of approvals, similar to ERC20 approvals
- Support NFTs
- 

## Protocol Benefits
Anyone writing a token based protocol on top of BoringBox gets these benefits
- Seamless support for rebasing tokens
- No need to support ETH only WETH as just another token
- Uniform asset behaviour

## User Benefits
- Enter and change strategies for a minimal gas fee

## Licence

UNLICENCED
