              {unlockError && <p className="text-xs text-rose-400 mb-3">{unlockError}</p>}
              <button onClick={handleUnlock} disabled={loading || !unlockPassword} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mb-4">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</> : 'Unlock Wallet'}
              </button>
              <button onClick={handleDeleteWallet} className="w-full text-xs text-rose-400 py-2 text-center">Reset & Delete Wallet</button>
            </div>
          </div>
        )}

        {/* WALLET DASHBOARD */}
        {stage === 'wallet' && walletData && (
          <div className="pt-2">
            {/* Chain Selector Header */}
            <div className="relative mb-4">
              <button onClick={() => setShowChainDropdown(!showChainDropdown)} className="w-full bg-[#1e2026] border border-[#2b2f36] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#0b0e11] flex items-center justify-center text-xs font-bold text-[#f0b90b]">
                    {chain.symbol.slice(0, 3)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-[#848e9c]">Network</p>
                    <p className="text-sm font-bold">{chain.name}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#848e9c]" />
              </button>
              {showChainDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2026] border border-[#2b2f36] rounded-xl z-20 overflow-hidden shadow-xl">
                  {SUPPORTED_CHAINS.map(c => (
                    <button key={c.id} onClick={() => { setSelectedChain(c.id); setShowChainDropdown(false); }} className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#2b2f36] ${selectedChain === c.id ? 'bg-[#2b2f36] text-[#f0b90b]' : 'text-[#eaecef]'}`}>
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-[#848e9c]">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#1e2026] to-[#16181d] border border-[#2b2f36] rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#848e9c]">Total Balance</span>
                <button onClick={() => loadBalances(walletData.address, selectedChain)} disabled={balanceLoading}>
                  <RefreshCw className={`w-4 h-4 text-[#848e9c] ${balanceLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-3xl font-black mb-1">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2b2f36]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#848e9c]">{shortenAddress(walletData.address, 6)}</span>
                  <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)}>
                    {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#848e9c]" />}
                  </button>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">Self-Custody</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <button onClick={() => { setReceiveSymbol(chain.symbol); setModal('receive'); }} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <ArrowDownToLine className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Receive</span>
              </button>
              <button onClick={() => { setSendSymbol(chain.symbol); setSendTokenAddress(undefined); setSendDecimals(chain.decimals); setModal('send'); }} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <ArrowUpFromLine className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Send</span>
              </button>
              <button onClick={() => setModal('swap')} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <RefreshCw className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">Swap</span>
              </button>
              <button onClick={() => setModal('history')} className="flex flex-col items-center justify-center bg-[#1e2026] hover:bg-[#2b2f36] border border-[#2b2f36] rounded-2xl py-3.5">
                <History className="w-5 h-5 text-[#f0b90b] mb-1.5" />
                <span className="text-xs font-semibold">History</span>
              </button>
            </div>

            {/* Assets List */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#848e9c]">Assets</p>
              <button onClick={() => setModal('dapp')} className="text-xs text-[#f0b90b] font-semibold">DApp Browser</button>
            </div>

            {balanceError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 text-xs text-rose-400">
                {balanceError}
              </div>
            )}

            <div className="space-y-2">
              {allAssets.map((asset, idx) => (
                <div key={idx} className="bg-[#1e2026] border border-[#2b2f36] rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0b0e11] flex items-center justify-center font-bold text-[#f0b90b]">
                      {asset.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{asset.symbol}</p>
                      <p className="text-xs text-[#848e9c]">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{parseFloat(asset.balance).toFixed(4)}</p>
                    <p className="text-xs text-[#848e9c]">
                      {asset.balanceUsd !== null ? `$${asset.balanceUsd.toFixed(2)}` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {decryptedMnemonic && (
              <div className="mt-6 p-4 bg-[#1e2026] border border-[#2b2f36] rounded-2xl">
                <p className="text-xs font-bold text-amber-400 mb-1">Seed Phrase Unlocked</p>
                <p className="text-xs font-mono text-[#848e9c] break-all select-all">{decryptedMnemonic}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal === 'receive' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 flex flex-col items-center relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-1">Receive {receiveSymbol}</h3>
            <p className="text-xs text-[#848e9c] mb-6 text-center">Scan QR code or copy address to receive funds on {chain.name}</p>
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-md">
              <QRCodeSVG value={walletData.address} size={180} />
            </div>
            <div className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-[#848e9c] truncate mr-2">{walletData.address}</span>
              <button onClick={() => copyToClipboard(walletData.address, setCopiedAddr)} className="flex-shrink-0 text-xs text-[#f0b90b] font-bold">
                {copiedAddr ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button onClick={() => setModal(null)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm">Done</button>
          </div>
        </div>
      )}

      {modal === 'send' && walletData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-4">Send {sendSymbol}</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs text-[#848e9c] block mb-1">Recipient Address</label>
                <div className="flex gap-2">
                  <input type="text" value={sendToAddress} onChange={e => setSendToAddress(e.target.value)} placeholder="0x... or ENS address" className="flex-1 bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2.5 text-xs text-[#eaecef] outline-none font-mono" />
                  <button onClick={() => setScanMode(true)} className="bg-[#0b0e11] border border-[#2b2f36] px-3 rounded-xl"><ScanLine className="w-4 h-4 text-[#f0b90b]" /></button>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#848e9c] block mb-1">Amount</label>
                <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-3 py-2.5 text-xs text-[#eaecef] outline-none" />
              </div>
              <div>
                <label className="text-xs text-[#848e9c] block mb-1">Fee Option</label>
                <div className="grid grid-cols-3 gap-2">
                  {FEE_OPTIONS.map((opt, i) => (
                    <button key={opt.label} onClick={() => setSelectedFee(i)} className={`py-2 rounded-xl text-xs font-semibold border ${selectedFee === i ? 'bg-[#f0b90b]/10 border-[#f0b90b] text-[#f0b90b]' : 'bg-[#0b0e11] border-[#2b2f36] text-[#848e9c]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {gasEstimate && (
                <div className="text-[11px] text-[#848e9c] flex justify-between bg-[#0b0e11] p-2.5 rounded-xl border border-[#2b2f36]">
                  <span>Est. Network Fee:</span>
                  <span className="text-[#eaecef] font-medium">${gasEstimate.gasCost}</span>
                </div>
              )}
            </div>

            {sendError && <p className="text-xs text-rose-400 mb-3">{sendError}</p>}
            <button onClick={handleSend} disabled={sending || !sendToAddress || !sendAmount} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Broadcasting...</> : 'Send Transaction'}
            </button>
          </div>
        </div>
      )}

      {modal === 'history' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-md p-6 relative max-h-[80vh] flex flex-col">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-4">Transaction History</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {txHistory.length === 0 ? (
                <p className="text-xs text-[#848e9c] text-center py-8">No recent transactions found.</p>
              ) : (
                txHistory.map(tx => (
                  <div key={tx.hash} className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#eaecef] capitalize">{tx.type} {tx.symbol}</p>
                      <p className="text-[10px] text-[#848e9c]">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">{tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.symbol}</p>
                      <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-[10px] text-[#f0b90b] flex items-center gap-1 justify-end">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {modal === 'swap' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative text-center">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-2">Token Swap</h3>
            <p className="text-xs text-[#848e9c] mb-6">Built-in decentralized exchange routing is currently initializing for this network.</p>
            <button onClick={() => setModal(null)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm">Got It</button>
          </div>
        </div>
      )}

      {modal === 'dapp' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2026] border border-[#2b2f36] rounded-3xl w-full max-w-sm p-6 relative text-center">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-[#848e9c]"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold mb-2">Web3 DApp Browser</h3>
            <p className="text-xs text-[#848e9c] mb-6">Connect securely to decentralized applications with your self-custody key.</p>
            <button onClick={() => setModal(null)} className="w-full bg-[#f0b90b] text-black font-bold py-3 rounded-xl text-sm">Close</button>
          </div>
        </div>
      )}

      {showBiometric && (
        <BiometricConfirmModal
          onConfirm={executeSend}
          onCancel={() => setShowBiometric(false)}
        />
      )}
    </div>
  );
                        }
              
