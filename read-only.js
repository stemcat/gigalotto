import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x9921e7B46EC46AbFcF4CE531688E79c8862604Fa";
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
];

// Get a provider with fallbacks
export async function getReadOnlyProvider() {
  const rpcUrls = [
    "https://eth.llamarpc.com",
    "https://ethereum.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
  ];

  for (const url of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber();
      console.log(`Connected to ${url}`);
      return provider;
    } catch (e) {
      console.error(`Failed to connect to ${url}:`, e);
    }
  }

  throw new Error("All RPC endpoints failed");
}

// Load jackpot info
export async function loadJackpotInfo() {
  try {
    document.getElementById("jackpot").innerHTML =
      "<strong>Loading...</strong>";
    document.getElementById("usd24h").innerText = "Loading...";

    // Get provider
    const provider = await getReadOnlyProvider();
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Get basic contract data
    const totalPool = await contract.totalPool();
    const jackpotUsd = await contract.getJackpotUsd();
    const targetUsd = await contract.TARGET_USD();
    const last24hUsd = await contract.last24hDepositUsd();

    // Format values
    const totalPoolEth = ethers.formatEther(totalPool);
    const jackpotUsdFormatted = (Number(jackpotUsd) / 1e8).toFixed(2);
    const targetUsdFormatted = (Number(targetUsd) / 1e8).toFixed(2);
    const last24hUsdFormatted = (Number(last24hUsd) / 1e8).toFixed(2);

    // Calculate percentage
    const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

    // Update UI
    document.getElementById(
      "jackpot"
    ).innerHTML = `<strong>${totalPoolEth} ETH</strong> ($${jackpotUsdFormatted})`;

    document.getElementById("usd24h").innerText = `$${last24hUsdFormatted}`;

    document.getElementById("progressFill").style.width = `${Math.min(
      Number(percentComplete),
      100
    )}%`;

    updateStatusMessageFromPercent(percentComplete);

    // Get top depositors
    try {
      const entriesCount = await contract.getEntriesCount();
      const maxEntries = Math.min(Number(entriesCount), 20);
      const depositorMap = new Map();

      // Get unique depositors
      for (let i = 0; i < maxEntries; i++) {
        try {
          const entry = await contract.getEntry(i);
          const address = entry[0];

          if (!depositorMap.has(address)) {
            const deposit = await contract.userDeposits(address);
            depositorMap.set(address, deposit);
          }
        } catch (e) {
          console.error(`Error fetching entry ${i}:`, e);
        }
      }

      // Convert to array and sort
      const topDepositors = Array.from(depositorMap.entries())
        .map(([address, amount]) => ({
          address,
          amount: ethers.formatEther(amount),
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 5);

      // Update leaderboard
      updateLeaderboardFromData(topDepositors);

      // Cache data
      localStorage.setItem(
        "contractData",
        JSON.stringify({
          totalPoolEth,
          jackpotUsdFormatted,
          last24hUsdFormatted,
          percentComplete,
          topDepositors,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error("Error fetching top depositors:", e);
      document.getElementById("leaderboard").innerHTML =
        "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Error loading depositors</div>";
    }
  } catch (e) {
    console.error("Failed to load jackpot info:", e);
    useCachedDataIfAvailable();
  }
}

// Use cached data if available
function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");

  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      const cacheAge = Date.now() - data.timestamp;

      if (cacheAge < 10 * 60 * 1000) {
        console.log("Using cached data from", new Date(data.timestamp));

        document.getElementById(
          "jackpot"
        ).innerHTML = `<strong>${data.totalPoolEth} ETH</strong> ($${data.jackpotUsdFormatted})`;

        document.getElementById(
          "usd24h"
        ).innerText = `$${data.last24hUsdFormatted}`;

        document.getElementById("progressFill").style.width = `${Math.min(
          Number(data.percentComplete),
          100
        )}%`;

        updateStatusMessageFromPercent(data.percentComplete);
        updateLeaderboardFromData(data.topDepositors);

        document.getElementById(
          "status"
        ).innerHTML += `<p><small>(Data from ${Math.round(
          cacheAge / 60000
        )} min ago)</small></p>`;

        return true;
      }
    } catch (cacheError) {
      console.error("Error parsing cached data:", cacheError);
    }
  }

  document.getElementById("jackpot").innerHTML =
    "<strong>Error loading data</strong>";
  document.getElementById("usd24h").innerText = "Error loading data";
  document.getElementById("progressFill").style.width = "0%";
  document.getElementById("leaderboard").innerHTML =
    "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>Error loading data</div>";
  document.getElementById("status").innerHTML =
    "<p>Unable to load contract data. Please refresh or try again later.</p>";

  return false;
}

// Update leaderboard from data
function updateLeaderboardFromData(depositors) {
  const leaderboardContainer = document.getElementById("leaderboard");
  if (!leaderboardContainer) return;

  let html = `<h3>🏆 TOP DEPOSITORS</h3>`;

  if (!depositors || depositors.length === 0) {
    html += `<div class="leaderboard-entry">No depositors yet</div>`;
  } else {
    for (let i = 0; i < depositors.length; i++) {
      const { address, amount } = depositors[i];
      const display = `${address.slice(0, 6)}...${address.slice(-4)}`;

      html += `
        <div class="leaderboard-entry">
          <span class="rank">${i + 1}.</span>
          <span class="name">${display}</span>
          <span class="amount">${parseFloat(amount).toFixed(3)} ETH</span>
        </div>
      `;
    }
  }

  leaderboardContainer.innerHTML = html;
}

// Update status message based on percent
function updateStatusMessageFromPercent(percent) {
  const statusElement = document.getElementById("status");
  if (!statusElement) return;

  if (percent >= 100) {
    statusElement.innerHTML = `<p>Waiting for winner...</p>`;
  } else if (percent < 25) {
    statusElement.innerHTML = `<p>The jackpot is just getting started! 🚀</p>`;
  } else if (percent < 50) {
    statusElement.innerHTML = `<p>The pot is growing! Don't miss out! 🚀</p>`;
  } else if (percent < 75) {
    statusElement.innerHTML = `<p>We're more than halfway there! 🔥</p>`;
  } else {
    statusElement.innerHTML = `<p>Almost at target! Last chance to join! ⏰</p>`;
  }
}

// Setup auto refresh
export function setupAutoRefresh() {
  loadJackpotInfo();
  setInterval(loadJackpotInfo, 30000);
}
