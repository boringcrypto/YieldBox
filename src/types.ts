import { BigNumber } from "@ethersproject/bignumber"

type Block = {
    owner: number,
    lastPrice: number,
    url: number,
    description: number,
    pixels: number
}

type PollInfo = {
    updates_: BigNumber;
    addresses_: BigNumber;
    text_: BigNumber;
    data_: BigNumber;
    balance: BigNumber;
    supply: BigNumber;
    mlm_: {
      upline: number;
      earnings1: number;
      earnings2: number;
      earnings3: number;
      tier1: number;
      tier2: number;
      tier3: number;
    };
    upline_: string;
}

export {
    Block,
    PollInfo
}