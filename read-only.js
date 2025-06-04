import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
const contractAddress = "0x8366A6F4adbB6D2D9fDC4cD5B9b0aC5f12D96dF1";
const abi = [
  "function totalPool() view returns (uint256)",
  "function getJackpotUsd() view returns (uint256)",
  "function TARGET_USD() view returns (uint256)",
  "function last24hDepositUsd() view returns (uint256)",
  "function getEntriesCount() view returns (uint256)",
  "function getEntry(uint256 index) view returns (address user, uint256 cumulative)",
  "function userDeposits(address user) view returns (uint256)",
];

// Update the subgraph endpoint with your actual deployed subgraph URL
const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/113076/gigalottosepolia/version/latest";

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
  // Show loading state but keep existing data
  const jackpotEl = document.getElementById("jackpot");
  const usd24hEl = document.getElementById("usd24h");

  if (!jackpotEl.innerHTML.includes("ETH")) {
    jackpotEl.innerHTML = "<strong>Loading...</strong>";
  }
  if (!usd24hEl.innerText.includes("$")) {
    usd24hEl.innerText = "Loading...";
  }

  // Try to load from API first (fastest)
  try {
    console.log("Fetching data from subgraph:", SUBGRAPH_URL);
    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          contract(id: "${contractAddress.toLowerCase()}") {
            totalPool
            jackpotUsd
            targetUsd
            last24hDepositUsd
          }
          entries(first: 20, orderBy: amount, orderDirection: desc) {
            user
            amount
            timestamp
          }
        }`,
      }),
    });

    console.log("Subgraph response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Subgraph data received:", data);

      if (data.data && data.data.contract) {
        console.log("Contract data found:", data.data.contract);

        // Format values
        const totalPoolEth = ethers.formatEther(data.data.contract.totalPool);
        const jackpotUsdFormatted = (
          Number(data.data.contract.jackpotUsd) / 1e8
        ).toFixed(2);
        const targetUsdFormatted = (
          Number(data.data.contract.targetUsd) / 1e8
        ).toFixed(2);
        const last24hUsdFormatted = (
          Number(data.data.contract.last24hDepositUsd) / 1e8
        ).toFixed(2);
        const percentComplete =
          (Number(data.data.contract.jackpotUsd) * 100) /
          Number(data.data.contract.targetUsd);

        // Update UI with basic data
        updateUIWithBasicData(
          totalPoolEth,
          jackpotUsdFormatted,
          last24hUsdFormatted,
          percentComplete
        );

        // Update leaderboard if entries exist
        if (data.data.entries && data.data.entries.length > 0) {
          console.log("Entries found:", data.data.entries.length);
          const topDepositors = data.data.entries.map((entry) => ({
            address: entry.user,
            amount: ethers.formatEther(entry.amount),
          }));
          updateLeaderboardFromData(topDepositors);
        } else {
          console.log("No entries found in subgraph data");
          document.getElementById("leaderboard").innerHTML =
            "<h3>🏆 TOP DEPOSITORS</h3><div class='leaderboard-entry'>No deposits yet</div>";
        }

        // Cache the data
        const basicData = {
          totalPoolEth,
          jackpotUsdFormatted,
          targetUsdFormatted,
          last24hUsdFormatted,
          percentComplete,
          topDepositors:
            data.data.entries?.map((entry) => ({
              address: entry.user,
              amount: ethers.formatEther(entry.amount),
            })) || [],
          timestamp: Date.now(),
        };

        localStorage.setItem("contractData", JSON.stringify(basicData));

        return; // Exit early if API works
      }
    }
  } catch (apiError) {
    console.error(
      "Subgraph API fetch failed, falling back to direct contract calls:",
      apiError
    );
  }

  // If we get here, the subgraph failed - try to use cached data
  const cachedData = localStorage.getItem("contractData");
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        // Cache valid for 5 minutes
        console.log("Using cached data from", new Date(data.timestamp));
        updateUIWithBasicData(
          data.totalPoolEth,
          data.jackpotUsdFormatted,
          data.last24hUsdFormatted,
          data.percentComplete
        );

        if (data.topDepositors && data.topDepositors.length > 0) {
          updateLeaderboardFromData(data.topDepositors);
        }

        // Try to refresh in background
        setTimeout(() => {
          tryDirectContractCall();
        }, 100);

        return;
      }
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
  }

  // Last resort - try direct contract call
  tryDirectContractCall();
}

// Separate function for direct contract calls as last resort
async function tryDirectContractCall() {
  try {
    console.log("Attempting direct contract call as last resort");

    // Use a CORS proxy for public endpoints
    const provider = new ethers.JsonRpcProvider(
      "https://api.allorigins.win/raw?url=" +
        encodeURIComponent("https://rpc.sepolia.org")
    );

    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Fetch basic data
    console.log("Fetching contract data...");
    const [totalPool, jackpotUsd, targetUsd, last24hUsd] = await Promise.all([
      contract.totalPool(),
      contract.getJackpotUsd(),
      contract.TARGET_USD(),
      contract.last24hDepositUsd(),
    ]);

    // Format values
    const totalPoolEth = ethers.formatEther(totalPool);
    const jackpotUsdFormatted = (Number(jackpotUsd) / 1e8).toFixed(2);
    const targetUsdFormatted = (Number(targetUsd) / 1e8).toFixed(2);
    const last24hUsdFormatted = (Number(last24hUsd) / 1e8).toFixed(2);
    const percentComplete = (Number(jackpotUsd) * 100) / Number(targetUsd);

    // Update UI with basic data
    updateUIWithBasicData(
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete
    );

    // Store basic data
    const basicData = {
      totalPoolEth,
      jackpotUsdFormatted,
      targetUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      timestamp: Date.now(),
    };

    localStorage.setItem("contractData", JSON.stringify(basicData));
  } catch (e) {
    console.error("All data fetching methods failed:", e);
    useCachedDataIfAvailable();
  }
}

// Helper function to update UI with basic data
function updateUIWithBasicData(
  totalPoolEth,
  jackpotUsdFormatted,
  last24hUsdFormatted,
  percentComplete
) {
  document.getElementById(
    "jackpot"
  ).innerHTML = `<strong>${totalPoolEth} ETH</strong> ($${jackpotUsdFormatted})`;
  document.getElementById("usd24h").innerText = `$${last24hUsdFormatted}`;
  document.getElementById("progressFill").style.width = `${Math.min(
    Number(percentComplete),
    100
  )}%`;
  updateStatusMessageFromPercent(percentComplete);
}

// Use cached data if available
function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      console.log("Using cached data from", new Date(data.timestamp));

      document.getElementById(
        "jackpot"
      ).innerHTML = `<strong>${data.totalPoolEth} ETH</strong> ($${data.jackpotUsdFormatted}) <small>(cached)</small>`;
      document.getElementById(
        "usd24h"
      ).innerText = `$${data.last24hUsdFormatted} (cached)`;
      document.getElementById("progressFill").style.width = `${Math.min(
        Number(data.percentComplete),
        100
      )}%`;

      if (data.topDepositors && data.topDepositors.length > 0) {
        updateLeaderboardFromData(data.topDepositors);
      }

      updateStatusMessageFromPercent(data.percentComplete);
    } catch (e) {
      console.error("Error parsing cached data:", e);
      document.getElementById("jackpot").innerHTML =
        "<strong>Error loading data</strong>";
      document.getElementById("usd24h").innerText = "Error";
    }
  } else {
    document.getElementById("jackpot").innerHTML =
      "<strong>Error loading data</strong>";
    document.getElementById("usd24h").innerText = "Error";
  }
}

// Update leaderboard from data
function updateLeaderboardFromData(topDepositors) {
  const leaderboardEl = document.getElementById("leaderboard");
  if (!leaderboardEl) return;

  let html = "<h3>🏆 TOP DEPOSITORS</h3>";

  if (topDepositors && topDepositors.length > 0) {
    topDepositors.forEach((depositor, index) => {
      const shortAddress = `${depositor.address.substring(
        0,
        6
      )}...${depositor.address.substring(38)}`;
      html += `
        <div class="leaderboard-entry">
          <span class="rank">${index + 1}</span>
          <span class="address">${shortAddress}</span>
          <span class="amount">${parseFloat(depositor.amount).toFixed(
            4
          )} ETH</span>
        </div>
      `;
    });
  } else {
    html += "<div class='leaderboard-entry'>No deposits yet</div>";
  }

  leaderboardEl.innerHTML = html;
}

// Update status message based on percent complete
function updateStatusMessageFromPercent(percentComplete) {
  const statusEl = document.getElementById("jackpotStatus");
  if (!statusEl) return;

  if (percentComplete >= 100) {
    statusEl.innerText = "🔥 JACKPOT READY! Waiting for cooldown period...";
    statusEl.className = "status-ready";
  } else if (percentComplete >= 90) {
    statusEl.innerText =
      "🔥 JACKPOT ALMOST READY! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-almost";
  } else if (percentComplete >= 50) {
    statusEl.innerText =
      "🚀 JACKPOT GROWING! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-growing";
  } else {
    statusEl.innerText =
      "🌱 JACKPOT BUILDING! " + percentComplete.toFixed(1) + "% complete";
    statusEl.className = "status-building";
  }
}

// Set up auto-refresh
export function setupAutoRefresh() {
  // Initial load
  loadJackpotInfo();

  // Refresh every 30 seconds
  setInterval(loadJackpotInfo, 30000);
}
