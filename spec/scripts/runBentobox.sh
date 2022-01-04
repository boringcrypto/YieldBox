certoraRun spec/harness/YieldBoxHarness.sol spec/harness/DummyERC20A.sol spec/harness/DummyWeth.sol spec/harness/SymbolicStrategy.sol spec/harness/Owner.sol  spec/harness/Borrower.sol \
    --link  SymbolicStrategy:receiver=YieldBoxHarness Borrower:yieldBox=YieldBoxHarness \
	--settings -copyLoopUnroll=4,-b=4,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond,-ciMode=true \
	--verify YieldBoxHarness:spec/yieldbox.spec \
	--cache yieldBox \
	--msg "YieldBox" 