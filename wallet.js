import abi from './abi.json' assert { type: 'json' };

let web3;
let contract;
let userAccount;

const contractAddress = "0xF5aEA51f7fAaABe16Fd3c14Da9Fa90e223D41404";
export async function initWeb3() {
  if (window.ethereum) {
    try {
      web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      userAccount = accounts[0];
      contract = new web3.eth.Contract(abi, contractAddress);
      updateUI();
    } catch (e) {
      console.error("Web3 initialization error:", e);
      document.getElementById("status").innerText = "⚠️ Failed to connect: " + e.message;
    }
  } else {
    document.getElementById("status").innerText = "⚠️ MetaMask not found!";
  }
}

export async function connectAndDeposit() {
  if (!web3 || !contract) return;

  const ethAmount = document.getElementById("ethAmount").value;
  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    document.getElementById("status").innerText = "⚠️ Enter a valid ETH amount";
    return;
  }

  try {
    const value = web3.utils.toWei(ethAmount, "ether");
    document.getElementById("status").innerText = "⏳ Sending transaction...";
    await contract.methods.deposit().send({ from: userAccount, value });
    document.getElementById("status").innerText = "✅ Deposit successful!";
    updateUI();
  } catch (e) {
    console.error("Deposit error:", e);
    document.getElementById("status").innerText = "⚠️ Deposit failed: " + e.message;
  }
}

export async function withdrawWinnings() {
  if (!contract || !userAccount) return;

  try {
    document.getElementById("status").innerText = "⏳ Processing withdrawal...";
    await contract.methods.withdrawIfWinner().send({ from: userAccount });
    document.getElementById("status").innerText = "✅ Withdrawal successful!";
    updateUI();
  } catch (e) {
    console.error("Withdrawal error:", e);
    document.getElementById("status").innerText = "⚠️ Withdrawal failed: " + e.message;
  }
}

export async function requestDraw() {
  if (!contract || !userAccount) return;

  try {
    document.getElementById("status").innerText = "⏳ Requesting draw...";
    await contract.methods.requestDraw().send({ from: userAccount });
    document.getElementById("status").innerText = "✅ Draw requested!";
    updateUI();
  } catch (e) {
    console.error("Draw error:", e);
    document.getElementById("status").innerText = "⚠️ Draw request failed: " + e.message;
  }
}

async function updateUI() {
  if (!contract || !userAccount) return;

  try {
    const deposit = await contract.methods.userDeposits(userAccount).call();
    document.getElementById("userDeposit").innerText = web3.utils.fromWei(deposit, "ether");

    document.getElementById("userAddress").innerText =
      `${userAccount.substring(0, 6)}...${userAccount.slice(-4)}`;
    document.getElementById("userDashboard").style.display = "block";

    const totalPool = await contract.methods.totalPool().call();
    const jackpotUsd = await contract.methods.getJackpotUsd().call();
    const targetUsd = await contract.methods.TARGET_USD().call();
    const last24hUsd = await contract.methods.last24hDepositUsd().call();

    const jackpotText = `${web3.utils.fromWei(totalPool, "ether")} ETH ($${(jackpotUsd / 1e8).toFixed(2)})`;
    document.getElementById("jackpot").innerHTML = `<strong>${jackpotText}</strong>`;
    document.getElementById("usd24h").innerText = `$${(last24hUsd / 1e8).toFixed(2)}`;

    const percent = (jackpotUsd / targetUsd) * 100;
    document.getElementById("progressFill").style.width = `${Math.min(percent, 100)}%`;

    updateHoldTimer();
    checkWinnerAndDraw();

  } catch (e) {
    console.error("UI update failed:", e);
    document.getElementById("status").innerText = "⚠️ UI update failed: " + e.message;
  }
}

async function updateHoldTimer() {
  try {
    const start = await contract.methods.holdStartTimestamp().call();
    if (parseInt(start) === 0) {
      document.getElementById("holdTimer").innerText = "Not reached";
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const diff = now - parseInt(start);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    document.getElementById("holdTimer").innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error("Timer update failed:", e);
  }
}

async function checkWinnerAndDraw() {
  try {
    const winner = await contract.methods.winner().call();
    const statusDiv = document.getElementById("status");

    if (winner === userAccount) {
      statusDiv.innerHTML = '<div class="winner-banner">🎉 YOU ARE THE WINNER! 🎉</div>';
      document.getElementById("withdrawBtn").style.display = "inline-block";
    } else if (winner !== "0x0000000000000000000000000000000000000000") {
      statusDiv.innerHTML = `🏆 Winner: ${winner.substring(0, 6)}...${winner.slice(-4)}`;
    } else {
      statusDiv.innerHTML = "<p>Waiting for the next winner...</p>";
    }

    const canDraw = await contract.methods.canDraw().call();
    if (canDraw) {
      statusDiv.innerHTML += "<p>The draw conditions are met! 🎯</p>";
      document.getElementById("requestDrawBtn").style.display = "inline-block";
    }
  } catch (e) {
    console.error("Winner/draw check failed:", e);
  }
}
