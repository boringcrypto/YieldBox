certoraRun spec/harness/YieldBoxHarness.sol spec/harness/DummyERC20A.sol spec/harness/DummyERC20B.sol spec/harness/DummyWeth.sol spec/harness/CompoundStrategyHarness.sol spec/harness/Owner.sol spec/harness/Borrower.sol spec/harness/Receiver.sol spec/compound/CErc20.sol \
    --link Borrower:yieldBox=YieldBoxHarness CompoundStrategyHarness:token=DummyERC20A CompoundStrategyHarness:owner=Owner CompoundStrategyHarness:yieldbox=YieldBoxHarness CompoundStrategyHarness:cToken=CErc20 CompoundStrategyHarness:compToken=DummyERC20B CErc20:underlying=DummyERC20A \
	--settings -copyLoopUnroll=4,-b=4,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond \
	--verify YieldBoxHarness:spec/yieldBoxCompoundStrategy.spec \
	--solc_map YieldBoxHarness=solc6.12,DummyWeth=solc6.12,Borrower=solc6.12,CompoundStrategyHarness=solc6.12,CErc20=solc5.17,DummyERC20A=solc6.12,Owner=solc6.12,Receiver=solc6.12,DummyERC20B=solc6.12 --path $PWD \
	--cache yieldBox \
	--staging production \
	--msg "YieldBox with compound strategy April 18"