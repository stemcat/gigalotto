import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.10.0/+esm";

// Contract details
import { contractAddress } from "./wallet.js";
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

// Add this debugging function at the top of the file
export function debugSubgraphConnection() {
  console.log("Testing subgraph connection...");

  // Simple query to test connection
  const query = `{
    contract(id: "${contractAddress.toLowerCase()}") {
      totalPool
    }
  }`;

  fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
    .then((res) => res.json())
    .then((result) => {
      console.log("Subgraph response:", result);
      if (result.errors) {
        console.error("Subgraph errors:", result.errors);
        showDataError(true, "Subgraph error: " + result.errors[0].message);
      } else if (!result.data || !result.data.contract) {
        console.error("No contract data found");
        showDataError(true, "No contract data found. Check contract address.");
      } else {
        console.log("Subgraph connection successful!");
      }
    })
    .catch((err) => {
      console.error("Subgraph fetch error:", err);
      showDataError(true, "Failed to connect to subgraph: " + err.message);
    });
}

// Load jackpot info with optimized approach
export async function loadJackpotInfo() {
  console.log("Loading jackpot info...");
  console.log("Using contract address:", contractAddress);
  console.log("Using subgraph URL:", SUBGRAPH_URL);

  // Check if cached data is for the current contract
  const cachedContractData = localStorage.getItem("contractData");
  if (cachedContractData) {
    try {
      const data = JSON.parse(cachedContractData);
      if (data.contractAddress && data.contractAddress !== contractAddress) {
        // Contract address changed, clear cache
        console.log("Contract address changed, clearing cache");
        localStorage.removeItem("contractData");
      }
    } catch (e) {
      console.error("Error parsing cached data:", e);
    }
  }

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
    console.log(
      "Query:",
      `{
      newDeposits(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
        depositor
        amount
        blockTimestamp
      }
      contract(id: "${contractAddress.toLowerCase()}") {
        totalPool
        jackpotUsd
        targetUsd
        last24hDepositUsd
      }
    }`
    );

    const response = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          newDeposits(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
            depositor
            amount
            blockTimestamp
          }
          contract(id: "${contractAddress.toLowerCase()}") {
            totalPool
            jackpotUsd
            targetUsd
            last24hDepositUsd
          }
        }`,
      }),
    });

    console.log("Subgraph response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Subgraph data received:", data);

      // Check if we have any data at all
      if (
        data.data &&
        (data.data.contract ||
          (data.data.newDeposits && data.data.newDeposits.length > 0))
      ) {
        let totalPoolEth = "0";
        let jackpotUsdFormatted = "0.00";
        let targetUsdFormatted = "2,200,000.00";
        let last24hUsdFormatted = "0.00";
        let percentComplete = 0;

        // First check if we have contract data
        if (data.data.contract) {
          const contractData = data.data.contract;

          // Convert values to ETH and format
          totalPoolEth = ethers.formatEther(contractData.totalPool);
          jackpotUsdFormatted = (Number(contractData.jackpotUsd) / 1e8).toFixed(
            2
          );
          targetUsdFormatted = (Number(contractData.targetUsd) / 1e8).toFixed(
            2
          );
          last24hUsdFormatted = (
            Number(contractData.last24hDepositUsd) / 1e8
          ).toFixed(2);
          percentComplete =
            (Number(contractData.jackpotUsd) * 100) /
            Number(contractData.targetUsd);

          // Update UI with contract data
          updateUIWithBasicData(
            totalPoolEth,
            jackpotUsdFormatted,
            last24hUsdFormatted,
            percentComplete
          );
        }

        // Process deposits for leaderboard if available
        if (data.data.newDeposits && data.data.newDeposits.length > 0) {
          console.log("Deposits found:", data.data.newDeposits.length);

          // Store all deposits for timeframe filtering
          const allDeposits = data.data.newDeposits.map((deposit) => ({
            depositor: deposit.depositor,
            amount: ethers.formatEther(deposit.amount),
            timestamp: parseInt(deposit.blockTimestamp),
          }));

          // Process deposits to get top depositors
          let topDepositors = {};

          for (const deposit of data.data.newDeposits) {
            const amount = BigInt(deposit.amount);

            // Track deposits by user for leaderboard
            const depositor = deposit.depositor.toLowerCase();
            if (!topDepositors[depositor]) {
              topDepositors[depositor] = BigInt(0);
            }
            topDepositors[depositor] += amount;
          }

          // Convert topDepositors to array for leaderboard
          const leaderboardData = Object.entries(topDepositors).map(
            ([address, amount]) => ({
              address: address,
              amount: ethers.formatEther(amount.toString()),
            })
          );

          // Sort by amount descending
          leaderboardData.sort(
            (a, b) => parseFloat(b.amount) - parseFloat(a.amount)
          );

          // Update leaderboard
          updateLeaderboardFromData(leaderboardData.slice(0, 10));

          // Cache the data
          const basicData = {
            contractAddress: contractAddress,
            totalPoolEth: totalPoolEth,
            jackpotUsdFormatted: jackpotUsdFormatted,
            targetUsdFormatted: targetUsdFormatted,
            last24hUsdFormatted: last24hUsdFormatted,
            percentComplete: percentComplete,
            topDepositors: leaderboardData.slice(0, 10),
            allDeposits: allDeposits,
            timestamp: Date.now(),
          };

          localStorage.setItem("contractData", JSON.stringify(basicData));

          // Hide any error messages
          showDataError(false);
          return; // Exit early if API works
        }
      } else {
        console.log("No data found in subgraph response");
        showDataError(
          true,
          "No data found. The subgraph may still be syncing."
        );
      }
    }
  } catch (apiError) {
    console.error(
      "Subgraph API fetch failed, falling back to direct contract calls:",
      apiError
    );
    showDataError(
      true,
      "Failed to fetch data from subgraph. Trying direct contract calls."
    );
  }

  // If we get here, the subgraph failed - try to use cached data
  const cachedFallbackData = localStorage.getItem("contractData");
  if (cachedFallbackData) {
    try {
      const data = JSON.parse(cachedFallbackData);
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
export async function tryDirectContractCall() {
  try {
    console.log("Attempting direct contract call as last resort");

    // Use a public RPC endpoint that allows CORS
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.public.blastapi.io"
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

    // Update UI
    updateUIWithBasicData(
      totalPoolEth,
      jackpotUsdFormatted,
      last24hUsdFormatted,
      percentComplete
    );

    // Try to get entries for leaderboard
    try {
      const entriesCount = await contract.getEntriesCount();
      const entries = [];

      // Only fetch up to 20 entries to avoid too many calls
      const countToFetch = Math.min(Number(entriesCount), 20);

      for (let i = 0; i < countToFetch; i++) {
        const entry = await contract.getEntry(i);
        entries.push({
          address: entry.user,
        });
      }

      // Update leaderboard
      updateLeaderboardFromData(entries);
    } catch (error) {
      console.error("Error fetching leaderboard entries:", error);
    }

    // Store basic data
    const basicData = {
      contractAddress: contractAddress,
      totalPoolEth,
      jackpotUsdFormatted,
      targetUsdFormatted,
      last24hUsdFormatted,
      percentComplete,
      timestamp: Date.now(),
    };

    localStorage.setItem("contractData", JSON.stringify(basicData));

    // Hide any error messages
    showDataError(false);
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
  // Update jackpot display
  const jackpotEl = document.getElementById("jackpot");
  if (jackpotEl) {
    jackpotEl.innerHTML = `<strong>${totalPoolEth}</strong> ETH`;
  }

  // Update USD value display
  const usdValueEl = document.getElementById("usdValue");
  if (usdValueEl) {
    usdValueEl.innerText = `$${jackpotUsdFormatted}`;
  }

  // Update 24h deposit display
  const usd24hEl = document.getElementById("usd24h");
  if (usd24hEl) {
    usd24hEl.innerText = `$${last24hUsdFormatted}`;
  }

  // Update progress bar if it exists
  const progressBarEl = document.getElementById("progressBar");
  if (progressBarEl) {
    progressBarEl.style.width = `${Math.min(percentComplete, 100)}%`;
  }

  // Update progress percentage if it exists
  const progressPercentEl = document.getElementById("progressPercent");
  if (progressPercentEl) {
    progressPercentEl.innerText = `${percentComplete.toFixed(2)}%`;
  }

  console.log("UI updated with basic data:", {
    totalPoolEth,
    jackpotUsdFormatted,
    last24hUsdFormatted,
    percentComplete,
  });
}

// Use cached data if available
function useCachedDataIfAvailable() {
  const cachedData = localStorage.getItem("contractData");
  if (cachedData) {
    try {
      const data = JSON.parse(cachedData);
      console.log("Using cached data from", new Date(data.timestamp));

      updateUIWithBasicData(
        data.totalPoolEth || "0",
        data.jackpotUsdFormatted || "0.00",
        data.last24hUsdFormatted || "0.00",
        data.percentComplete || 0
      );

      if (data.topDepositors && data.topDepositors.length > 0) {
        updateLeaderboardFromData(data.topDepositors);
      }

      // Show a message that we're using cached data
      showDataError(
        true,
        "Using cached data. Network connection issues detected."
      );
    } catch (e) {
      console.error("Error parsing cached data:", e);
      showDataError(true, "Failed to load data. Please try again later.");
    }
  } else {
    showDataError(
      true,
      "Failed to load data and no cache available. Please try again later."
    );
  }
}

// Update leaderboard from data
async function updateLeaderboardFromData(
  topDepositors,
  selectedTimeframe = "allTime"
) {
  const leaderboardEl = document.getElementById("leaderboard");
  if (!leaderboardEl) return;

  let html = "<h3>🏆 TOP DEPOSITORS</h3>";

  // Add timeframe selector with the correct selection
  html += `
    <div class="timeframe-selector">
      <select id="timeframeSelect" onchange="window.changeTimeframe(this.value)">
        <option value="allTime" ${
          selectedTimeframe === "allTime" ? "selected" : ""
        }>All Time</option>
        <option value="weekly" ${
          selectedTimeframe === "weekly" ? "selected" : ""
        }>This Week</option>
        <option value="daily" ${
          selectedTimeframe === "daily" ? "selected" : ""
        }>Today</option>
      </select>
    </div>
  `;

  if (topDepositors && topDepositors.length > 0) {
    // Create a placeholder for each entry that will be updated with ENS names
    html += `<div id="leaderboardEntries">`;

    topDepositors.forEach((depositor, index) => {
      const shortAddress = `${depositor.address.substring(
        0,
        6
      )}...${depositor.address.substring(38)}`;
      const etherscanUrl = `https://sepolia.etherscan.io/address/${depositor.address}`;

      html += `
        <div class="leaderboard-entry">
          <span class="rank">${index + 1}</span>
          <a href="${etherscanUrl}" target="_blank" class="address" id="leaderboard-address-${index}" data-address="${
        depositor.address
      }">${shortAddress}</a>
          <span class="amount">${parseFloat(depositor.amount || 0).toFixed(
            4
          )} ETH</span>
        </div>
      `;
    });

    html += `</div>`;
  } else {
    html += "<div class='leaderboard-entry'>No deposits yet</div>";
  }

  leaderboardEl.innerHTML = html;

  // Now resolve ENS names for each address
  if (topDepositors && topDepositors.length > 0) {
    resolveLeaderboardENSNames(topDepositors);
  }
}

// Function to resolve ENS names for leaderboard
async function resolveLeaderboardENSNames(topDepositors) {
  try {
    // Use a public RPC endpoint that allows CORS
    const provider = new ethers.JsonRpcProvider(
      "https://eth-sepolia.public.blastapi.io"
    );

    for (let i = 0; i < topDepositors.length; i++) {
      const addressElement = document.getElementById(
        `leaderboard-address-${i}`
      );
      if (addressElement) {
        const address = addressElement.getAttribute("data-address");
        try {
          // Try to resolve ENS name
          const ensName = await provider.lookupAddress(address);
          if (ensName) {
            addressElement.innerText = ensName;
            // Keep the link to Etherscan
            addressElement.href = `https://sepolia.etherscan.io/address/${address}`;
          }
        } catch (error) {
          console.log(`Could not resolve ENS for ${address}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error resolving ENS names:", error);
  }
}

// Filter entries by timeframe
function filterEntriesByTimeframe(entries, timeframe) {
  const now = Math.floor(Date.now() / 1000);

  switch (timeframe) {
    case "daily":
      return entries.filter(
        (entry) => entry.timestamp > now - 86400 // Last 24 hours
      );
    case "weekly":
      return entries.filter(
        (entry) => entry.timestamp > now - 604800 // Last 7 days
      );
    case "allTime":
    default:
      return entries;
  }
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

// Add this function to show/hide the error message
function showDataError(show, message = null) {
  const errorElement = document.getElementById("dataLoadingError");
  if (!errorElement) return;

  if (show) {
    errorElement.style.display = "block";
    if (message) {
      errorElement.querySelector("p").textContent = "⚠️ " + message;
    }
  } else {
    errorElement.style.display = "none";
  }
}

// Add this function to clear cached data
export function clearCache() {
  localStorage.removeItem("contractData");
  console.log("Cache cleared");

  // Reload data
  loadJackpotInfo();
}

// Make updateLeaderboardFromData available globally
window.updateLeaderboardFromData = updateLeaderboardFromData;

// Check if user is the admin
function isAdmin(address) {
  const adminAddress = "0xe9D99D4380e80DE290D10F741F77728954fe2d81";
  return address && address.toLowerCase() === adminAddress.toLowerCase();
}

// Update user info and show/hide admin section
async function updateUserInfo() {
  const userAccount = getUserAccount();
  if (!userAccount) {
    document.getElementById("userDashboard").style.display = "none";
    document.getElementById("adminSection").style.display = "none";
    return;
  }

  // Update user dashboard
  updateUserDashboard();

  // Check if user is admin and show admin section
  if (isAdmin(userAccount)) {
    const adminSection = document.getElementById("adminSection");
    if (adminSection) {
      adminSection.style.display = "block";
    }
  } else {
    const adminSection = document.getElementById("adminSection");
    if (adminSection) {
      adminSection.style.display = "none";
    }
  }
}
